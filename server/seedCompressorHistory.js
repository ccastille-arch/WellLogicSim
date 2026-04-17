/**
 * Seed the /data/mlink-history.jsonl volume with up to ~30 days of
 * compressor history exported from Murphy's MLink portal. The two
 * CSV exports (comp-2073.csv / comp-2074.csv) live in server/seed-
 * data/ and carry sparse per-parameter readings: each row is ONE
 * timestamp + ONE filled column (e.g. just "Flow Rate PID PV" = 1.6
 * at 09:04:21) with every other column blank.
 *
 * Rolling those into per-timestamp snapshots:
 *   - Walk the CSV rows oldest → newest.
 *   - Maintain a running {label → latest-value} dict per compressor.
 *   - Emit a snapshot row every SEED_BUCKET_MINUTES (default 15 min)
 *     using whatever the latest values are at that bucket boundary.
 *   - Dedupe on timestamp so re-running the seeder on an already-
 *     populated volume is a no-op (no duplicate rows).
 *   - Only run if a sentinel env var (MLINK_HISTORY_SEEDED=1) or a
 *     .seeded marker in the data dir is missing — prevents re-import
 *     after an intentional wipe.
 *
 * The resulting JSONL rows follow the same shape mlinkHistory.js's
 * live poller uses, so the Field Data History tab and compressor
 * detail views render the seed + live data uniformly.
 */

import { access, appendFile, mkdir, readFile, writeFile } from 'fs/promises'
import { constants as fsConstants } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEED_DIR = join(__dirname, 'seed-data')

const DATA_DIR =
  process.env.DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  (process.env.NODE_ENV === 'production' ? '/data' : null)
const RESOLVED_DATA_DIR = DATA_DIR || join(process.cwd(), '.data')
const HISTORY_PATH = join(RESOLVED_DATA_DIR, 'mlink-history.jsonl')
const SEED_MARKER = join(RESOLVED_DATA_DIR, '.compressor-history-seeded')

const SEED_BUCKET_MINUTES = Math.max(
  parseInt(process.env.MLINK_SEED_BUCKET_MINUTES || '15', 10) || 15,
  1,
)
const BUCKET_MS = SEED_BUCKET_MINUTES * 60_000

// ── CSV parsing (quote-aware, same pattern as klondikeData.js) ─────
function parseCsvLine(line) {
  const cells = []
  let inQuotes = false
  let buf = ''
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes
    else if (ch === ',' && !inQuotes) { cells.push(buf); buf = '' }
    else buf += ch
  }
  cells.push(buf)
  return cells
}

/**
 * Parse a sparse compressor CSV into a chronologically-sorted array
 * of { ts: epochMs, readings: { label: value } } entries where each
 * entry has exactly the non-empty columns from that row.
 */
function parseCompressorCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = parseCsvLine(lines[0]).map(h => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i])
    if (cells.length === 0) continue
    const tsStr = (cells[0] || '').trim()
    const ts = Date.parse(tsStr)
    if (!Number.isFinite(ts)) continue
    const readings = {}
    for (let c = 1; c < headers.length; c += 1) {
      const raw = (cells[c] || '').trim()
      if (raw === '') continue
      const n = parseFloat(raw)
      readings[headers[c]] = Number.isFinite(n) ? n : raw
    }
    if (Object.keys(readings).length === 0) continue
    rows.push({ ts, readings })
  }
  rows.sort((a, b) => a.ts - b.ts)
  return { headers, rows }
}

/**
 * Roll up sparse CSV rows into snapshots every SEED_BUCKET_MINUTES.
 * Running state carries the latest observed value per label so every
 * emitted snapshot is a complete picture even when individual CSV
 * rows only have one column filled.
 */
function rollupSnapshots(rows) {
  if (!rows.length) return []
  const snapshots = []
  const running = {}
  const firstTs = rows[0].ts
  let nextBucketTs = Math.ceil(firstTs / BUCKET_MS) * BUCKET_MS

  for (const row of rows) {
    Object.assign(running, row.readings)
    while (row.ts >= nextBucketTs) {
      // Only emit a snapshot if we've observed at least one reading
      // — otherwise we'd output empty JSONL rows at the very start.
      if (Object.keys(running).length > 0) {
        snapshots.push({
          ts: nextBucketTs,
          registers: { ...running },
        })
      }
      nextBucketTs += BUCKET_MS
    }
  }
  // Final bucket for any remaining state that hasn't emitted yet.
  if (Object.keys(running).length > 0 && (!snapshots.length || snapshots[snapshots.length - 1].ts < rows[rows.length - 1].ts)) {
    snapshots.push({
      ts: Math.ceil(rows[rows.length - 1].ts / BUCKET_MS) * BUCKET_MS,
      registers: { ...running },
    })
  }
  return snapshots
}

async function readExistingTimestamps() {
  try {
    const text = await readFile(HISTORY_PATH, 'utf8')
    const ts = new Set()
    for (const line of text.split('\n')) {
      if (!line) continue
      try {
        const row = JSON.parse(line)
        if (row?.timestamp) ts.add(row.timestamp)
      } catch { /* ignore */ }
    }
    return ts
  } catch (err) {
    if (err.code === 'ENOENT') return new Set()
    throw err
  }
}

/**
 * Main entry. Idempotent: checks the .seeded marker and skips if
 * already run. Returns a status summary for the caller to log.
 */
export async function seedCompressorHistoryIfNeeded() {
  try {
    await mkdir(RESOLVED_DATA_DIR, { recursive: true })
  } catch { /* best-effort; appendFile will surface a real error */ }

  // Skip if already seeded this volume (prevents re-import on every
  // server restart and respects a manual wipe that removes the marker).
  try {
    await access(SEED_MARKER, fsConstants.F_OK)
    return { status: 'skipped', reason: 'already seeded' }
  } catch { /* not seeded yet */ }

  // Load both CSVs concurrently.
  const files = [
    { name: 'comp-2073.csv', compIndex: 0 }, // Compressor A
    { name: 'comp-2074.csv', compIndex: 1 }, // Compressor B
  ]
  const parsedByComp = {}
  for (const f of files) {
    try {
      const text = await readFile(join(SEED_DIR, f.name), 'utf8')
      const { rows } = parseCompressorCsv(text)
      parsedByComp[f.compIndex] = rollupSnapshots(rows)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
      parsedByComp[f.compIndex] = []
    }
  }

  // Align both compressors on the same bucket timestamps so each
  // emitted JSONL row carries registers for BOTH A and B at that
  // minute. Union of bucket ts's across the two.
  const allTs = new Set()
  Object.values(parsedByComp).forEach(arr => arr.forEach(s => allTs.add(s.ts)))
  const bucketList = [...allTs].sort((a, b) => a - b)

  const byCompTs = {
    0: Object.fromEntries((parsedByComp[0] || []).map(s => [s.ts, s.registers])),
    1: Object.fromEntries((parsedByComp[1] || []).map(s => [s.ts, s.registers])),
  }

  // Don't duplicate rows that the live scheduler or another seed
  // already wrote. ISO timestamps are the existing format.
  const existing = await readExistingTimestamps()

  let appended = 0
  for (const tsMs of bucketList) {
    const iso = new Date(tsMs).toISOString()
    if (existing.has(iso)) continue
    const compA = byCompTs[0][tsMs] || null
    const compB = byCompTs[1][tsMs] || null
    // Derive the normalized top-level fields the UI expects; the rest
    // of the schema (wells, panel data, hour meter) stays null in the
    // seed since the CSVs don't carry that information.
    const row = {
      timestamp: iso,
      totalFlowMscfd: null,
      comp1Status: null,
      comp2Status: null,
      comp1DesiredFlow: compA?.['Quck Start Setting - Desired Flow Rate'] ?? null,
      comp2DesiredFlow: compB?.['Quck Start Setting - Desired Flow Rate'] ?? null,
      comp1ActualFlow: compA?.['Flow Rate PID PV'] ?? null,
      comp2ActualFlow: compB?.['Flow Rate PID PV'] ?? null,
      faultIndication: null,
      flowStatusMode: null,
      hourMeter: null,
      wells: [null, null, null, null],
      compressors: [
        { id: 1, registers: compA || {} },
        { id: 2, registers: compB || {} },
      ],
      _seed: 'csv-2073-2074',
    }
    await appendFile(HISTORY_PATH, JSON.stringify(row) + '\n', 'utf8')
    appended += 1
  }

  await writeFile(SEED_MARKER, new Date().toISOString(), 'utf8').catch(() => {})
  return {
    status: 'seeded',
    appendedRows: appended,
    bucketMinutes: SEED_BUCKET_MINUTES,
    source: 'server/seed-data/comp-207{3,4}.csv',
  }
}
