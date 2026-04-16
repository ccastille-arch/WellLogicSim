import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initSchema } from './db.js'
import { seedDefaults } from './seed.js'
import { ensureStorageReady, getStorageStatus, startBackupScheduler, writeBackupSnapshot } from './storage.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import roleRoutes from './routes/roles.js'
import dataRoutes from './routes/data.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const app = express()

let dbReady = false

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: dbReady, storage: getStorageStatus(), ts: new Date().toISOString() })
})

app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next()
  if (req.path.startsWith('/mlink/')) return next()
  if (!dbReady) return res.status(503).json({ error: 'Database initializing - please retry in a moment' })
  next()
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/roles', roleRoutes)
app.use('/api', dataRoutes)

app.post('/api/tts', async (req, res) => {
  const key = process.env.OPENAI_API_KEY
  if (!key) return res.status(503).json({ error: 'TTS not configured' })
  const { text, voice = 'fable' } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })
  const processedText = text.replace(/…/g, ', ').replace(/\.\.\./g, ', ')
  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1-hd', voice, input: processedText, response_format: 'mp3', speed: 0.9 }),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      return res.status(r.status).json({ error: err.error?.message || 'TTS error' })
    }
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    const buf = await r.arrayBuffer()
    res.send(Buffer.from(buf))
  } catch {
    res.status(502).json({ error: 'TTS unreachable' })
  }
})

const MLINK_BASE = 'https://api.fwmurphy-iot.com/api'

app.get('/api/mlink/device', async (req, res) => {
  const key = process.env.MLINK_API_KEY
  if (!key) return res.status(503).json({ error: 'MLINK_API_KEY not configured' })
  const { deviceId } = req.query
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' })
  try {
    const r = await fetch(`${MLINK_BASE}/LatestDeviceData?deviceId=${deviceId}&code=${key}`)
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return res.status(r.status).json({ error: 'MLINK error', status: r.status, details: body.slice(0, 500) })
    }
    res.json(await r.json())
  } catch (err) {
    res.status(502).json({ error: 'MLINK unreachable', details: err.message })
  }
})

app.get('/api/mlink/runreport', async (req, res) => {
  const key = process.env.MLINK_API_KEY
  if (!key) return res.status(503).json({ error: 'MLINK_API_KEY not configured' })
  const { deviceId, startTs, endTs } = req.query
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' })
  try {
    const r = await fetch(`${MLINK_BASE}/RunReport?deviceId=${deviceId}&startTs=${startTs}&endTs=${endTs}&code=${key}`)
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return res.status(r.status).json({ error: 'MLINK error', status: r.status, details: body.slice(0, 500) })
    }
    res.json(await r.json())
  } catch (err) {
    res.status(502).json({ error: 'MLINK unreachable', details: err.message })
  }
})

const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get(/(.*)/, (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' })
  res.sendFile(join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`WellLogic server listening on port ${PORT}`)
  ensureStorageReady()
    .then(status => {
      if (status.enabled) console.log(`Storage ready at ${status.dataDir}`)
      else console.warn(`Storage unavailable at ${status.dataDir}: ${status.error || 'not writable'}`)
    })
    .catch(err => console.warn(`Storage init failed: ${err.message}`))
  connectWithRetry()
})

async function connectWithRetry(attempt = 1) {
  const MAX = 10
  try {
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set - add a PostgreSQL service in Railway and link it to this service')
      if (attempt <= MAX) setTimeout(() => connectWithRetry(attempt + 1), 15_000)
      return
    }
    await initSchema()
    await seedDefaults()
    dbReady = true
    if (getStorageStatus().enabled) {
      await writeBackupSnapshot('startup').catch(err => {
        console.warn(`Startup backup skipped: ${err.message}`)
      })
      startBackupScheduler()
    }
    console.log('Database ready')
  } catch (err) {
    console.error(`DB init attempt ${attempt} failed: ${err.message}`)
    if (attempt <= MAX) {
      const delay = Math.min(attempt * 3_000, 30_000)
      console.log(`Retrying in ${delay / 1000}s...`)
      setTimeout(() => connectWithRetry(attempt + 1), delay)
    } else {
      console.error('Giving up on DB init after 10 attempts - API endpoints will return 503')
    }
  }
}
