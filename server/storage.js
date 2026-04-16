import { access, mkdir, readdir, rm, stat, writeFile } from 'fs/promises'
import { constants as fsConstants } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { pool } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DATA_DIR = process.env.DATA_DIR
  || process.env.RAILWAY_VOLUME_MOUNT_PATH
  || (process.env.NODE_ENV === 'production' ? '/data' : join(__dirname, '.data'))

const BACKUPS_DIR = join(DATA_DIR, 'backups')
const UPLOADS_DIR = join(DATA_DIR, 'uploads')
const BACKUP_INTERVAL_MINUTES = Math.max(parseInt(process.env.BACKUP_INTERVAL_MINUTES || '360', 10) || 360, 5)
const BACKUP_RETENTION = Math.max(parseInt(process.env.BACKUP_RETENTION || '20', 10) || 20, 1)

let storageReady = false
let storageError = null
let backupTimer = null
let lastBackup = null

function backupFilename(prefix = 'backup') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${prefix}-${stamp}.json`
}

async function queryTable(sql) {
  const { rows } = await pool.query(sql)
  return rows
}

async function pruneBackups() {
  const backups = await listBackups(1000)
  if (backups.length <= BACKUP_RETENTION) return
  for (const backup of backups.slice(BACKUP_RETENTION)) {
    await rm(backup.path, { force: true }).catch(() => {})
  }
}

export async function ensureStorageReady() {
  try {
    await mkdir(BACKUPS_DIR, { recursive: true })
    await mkdir(UPLOADS_DIR, { recursive: true })
    await access(DATA_DIR, fsConstants.W_OK)
    storageReady = true
    storageError = null
  } catch (err) {
    storageReady = false
    storageError = err.message
  }
  return getStorageStatus()
}

export function getStorageStatus() {
  return {
    enabled: storageReady,
    writable: storageReady,
    dataDir: DATA_DIR,
    backupsDir: BACKUPS_DIR,
    uploadsDir: UPLOADS_DIR,
    backupIntervalMinutes: BACKUP_INTERVAL_MINUTES,
    backupRetention: BACKUP_RETENTION,
    lastBackupAt: lastBackup?.createdAt || null,
    lastBackupPath: lastBackup?.path || null,
    error: storageError,
  }
}

export async function listBackups(limit = 10) {
  if (!storageReady) return []
  const entries = await readdir(BACKUPS_DIR, { withFileTypes: true }).catch(() => [])
  const backups = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const fullPath = join(BACKUPS_DIR, entry.name)
    const info = await stat(fullPath).catch(() => null)
    if (!info) continue
    backups.push({
      filename: entry.name,
      path: fullPath,
      size: info.size,
      createdAt: info.mtime.toISOString(),
    })
  }
  return backups
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
}

export async function writeBackupSnapshot(reason = 'manual') {
  if (!storageReady) {
    throw new Error(storageError || 'Storage is not ready')
  }

  const snapshot = {
    createdAt: new Date().toISOString(),
    reason,
    dataDir: DATA_DIR,
    tables: {
      users: await queryTable('SELECT * FROM users ORDER BY created_at NULLS LAST, username'),
      roles: await queryTable('SELECT * FROM roles ORDER BY created_at NULLS LAST, id'),
      sessions: await queryTable('SELECT * FROM sessions ORDER BY created_at DESC'),
      settings: await queryTable('SELECT * FROM settings ORDER BY key'),
      quotes: await queryTable('SELECT * FROM quotes ORDER BY created_at DESC'),
      activity: await queryTable('SELECT * FROM activity ORDER BY created_at DESC LIMIT 5000'),
    },
  }

  const path = join(BACKUPS_DIR, backupFilename('welllogic-backup'))
  await writeFile(path, JSON.stringify(snapshot, null, 2), 'utf8')
  lastBackup = { path, createdAt: snapshot.createdAt, reason }
  await pruneBackups()
  return {
    path,
    createdAt: snapshot.createdAt,
    reason,
  }
}

export async function getStorageStatusDetailed() {
  const backups = await listBackups(10)
  return {
    ...getStorageStatus(),
    backups,
  }
}

export function startBackupScheduler() {
  if (!storageReady || backupTimer) return
  backupTimer = setInterval(() => {
    writeBackupSnapshot('scheduled').catch(err => {
      storageError = err.message
      console.error('Scheduled backup failed:', err)
    })
  }, BACKUP_INTERVAL_MINUTES * 60_000)
}
