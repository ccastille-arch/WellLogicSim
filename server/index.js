import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initSchema } from './db.js'
import { seedDefaults } from './seed.js'
import { ensureStorageReady, getStorageStatus, startBackupScheduler, writeBackupSnapshot } from './storage.js'
import {
  getMlinkHistoryStatus,
  readMlinkHistory,
  startMlinkHistoryScheduler,
  triggerMlinkHistoryTickNow,
} from './mlinkHistory.js'
import { seedCompressorHistoryIfNeeded } from './seedCompressorHistory.js'
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

// Single source of truth for which MLink devices the frontend polls.
// Previously the frontend had these hardcoded in
// src/engine/liveRegisters.js, which meant changing a device ID
// required a code edit + redeploy. Now they live on the server as
// env vars (with the historical defaults as fallback) and the
// dashboard fetches the list at boot — set MLINK_PANEL_DEVICE_ID,
// MLINK_COMP_A_DEVICE_ID, MLINK_COMP_B_DEVICE_ID on Railway and a
// frontend reload picks them up with no rebuild required.
const MLINK_DEVICES = {
  panel: process.env.MLINK_PANEL_DEVICE_ID   || '2504-504495',
  compA: process.env.MLINK_COMP_A_DEVICE_ID  || '2504-505561',
  compB: process.env.MLINK_COMP_B_DEVICE_ID  || '2504-505472',
}

// Human-facing labeling for each compressor. The card title renders
// as "{name} · Unit {unit}" so customers see the product description
// and their actual fleet number, not a generic "Compressor A". Both
// env-overridable on Railway.
const MLINK_LABELS = {
  compA: {
    name: process.env.MLINK_COMP_A_NAME || 'Service Compression KTA-Cummins FieldTune Compressor',
    unit: process.env.MLINK_COMP_A_UNIT || '',
  },
  compB: {
    name: process.env.MLINK_COMP_B_NAME || 'Service Compression KTA-Cummins FieldTune Compressor',
    unit: process.env.MLINK_COMP_B_UNIT || '',
  },
}

app.get('/api/mlink/devices', (_req, res) => {
  res.json({
    devices: MLINK_DEVICES,
    labels: MLINK_LABELS,
    sources: {
      panel: process.env.MLINK_PANEL_DEVICE_ID ? 'env' : 'default',
      compA: process.env.MLINK_COMP_A_DEVICE_ID ? 'env' : 'default',
      compB: process.env.MLINK_COMP_B_DEVICE_ID ? 'env' : 'default',
    },
  })
})

// Device-discovery helper — asks Murphy's API for the list of
// devices visible to our API key. Useful when the configured
// compressor IDs aren't pulling flow data: the operator can hit this
// endpoint, see every device's {deviceId, name, status}, and paste
// the right IDs into Railway's env vars.
app.get('/api/mlink/devices/discover', async (_req, res) => {
  const key = process.env.MLINK_API_KEY
  if (!key) return res.status(503).json({ error: 'MLINK_API_KEY not configured' })
  // Try a couple of the common MLink endpoints for a device list;
  // different Murphy catalogs expose slightly different paths.
  const candidates = [
    `${MLINK_BASE}/DeviceList?code=${encodeURIComponent(key)}`,
    `${MLINK_BASE}/Devices?code=${encodeURIComponent(key)}`,
    `${MLINK_BASE}/AssetList?code=${encodeURIComponent(key)}`,
  ]
  for (const url of candidates) {
    try {
      const r = await fetch(url)
      if (!r.ok) continue
      const body = await r.json()
      return res.json({ source: url.replace(/code=[^&]+/, 'code=***'), body })
    } catch { /* keep trying */ }
  }
  res.status(502).json({ error: 'No MLink device-list endpoint responded. Check MLink API docs for the right path and wire it here.' })
})

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

// Returns the parsed register key names for a device — no values exposed.
// Use this to discover what labels the MLink API publishes for a given device
// so you can add them as aliases in liveRegisters.js.
app.get('/api/mlink/device/keys', async (req, res) => {
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
    const data = await r.json()
    const keys = (data?.datapoints || [])
      .map(dp => dp.alias || dp.desc || dp.dataSourceName || dp.Name || dp.name)
      .filter(Boolean)
      .sort()
    res.json({ deviceId, count: keys.length, keys })
  } catch (err) {
    res.status(502).json({ error: 'MLINK unreachable', details: err.message })
  }
})

// Probes RunReport with several timestamp formats and returns whatever
// works — used to identify the correct parameter format for this Murphy
// API version, then implement the full merge in /api/mlink/device/full.
app.get('/api/mlink/runreport/probe', async (req, res) => {
  const key = process.env.MLINK_API_KEY
  if (!key) return res.status(503).json({ error: 'MLINK_API_KEY not configured' })
  const { deviceId } = req.query
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' })
  const todayMidnightUTC = Math.floor(Date.now() / 86400000) * 86400
  const yesterdayStart = todayMidnightUTC - 86400
  const yesterdayEnd   = todayMidnightUTC - 1
  const attempts = [
    { label: 'yesterday-sec',     startTs: yesterdayStart,         endTs: yesterdayEnd },
    { label: 'yesterday-end-now', startTs: yesterdayStart,         endTs: Math.floor(Date.now() / 1000) },
    { label: 'yesterday-ms',      startTs: yesterdayStart * 1000,  endTs: yesterdayEnd * 1000 },
    { label: 'two-days-ago-sec',  startTs: yesterdayStart - 86400, endTs: yesterdayStart - 1 },
  ]
  const results = {}
  for (const { label, startTs, endTs } of attempts) {
    try {
      const url = `${MLINK_BASE}/RunReport?deviceId=${encodeURIComponent(deviceId)}&startTs=${startTs}&endTs=${endTs}&code=${key}`
      const r = await fetch(url)
      const text = await r.text().catch(() => '')
      results[label] = { status: r.status, ok: r.ok, snippet: text.slice(0, 3000) }
    } catch (err) {
      results[label] = { error: err.message }
    }
  }
  res.json({ deviceId, todayMidnightUTC, yesterdayStart, yesterdayEnd, results })
})

// Fetches LatestDeviceData + RunReport and merges all datapoints so the
// Halfmann panel returns all registers regardless of freeze-group interval.
app.get('/api/mlink/device/full', async (req, res) => {
  const key = process.env.MLINK_API_KEY
  if (!key) return res.status(503).json({ error: 'MLINK_API_KEY not configured' })
  const { deviceId } = req.query
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' })

  // Fetch LatestDeviceData (real-time fast registers)
  let latestData = null
  try {
    const r = await fetch(`${MLINK_BASE}/LatestDeviceData?deviceId=${encodeURIComponent(deviceId)}&code=${key}`)
    if (r.ok) latestData = await r.json()
  } catch {}

  // Fetch RunReport for yesterday UTC (Murphy rejects queries that include today)
  // Use UTC midnight boundaries: yesterday 00:00 → today 00:00
  let runReportDps = []
  const todayMidnightUTC = Math.floor(Date.now() / 86400000) * 86400  // seconds
  const yesterdayStartUTC = todayMidnightUTC - 86400
  const yesterdayEndUTC = todayMidnightUTC - 1  // 23:59:59 yesterday, excludes today

  let _runReportStatus = null
  let _runReportDebug = null
  try {
    const r = await fetch(
      `${MLINK_BASE}/RunReport?deviceId=${encodeURIComponent(deviceId)}&startTs=${yesterdayStartUTC}&endTs=${yesterdayEndUTC}&code=${key}`
    )
    _runReportStatus = r.status
    if (r.ok) {
      const data = await r.json()
      // RunReport may return an array of records or a single record with datapoints
      const records = Array.isArray(data) ? data : [data]
      for (const rec of records) {
        for (const dp of (rec.datapoints || rec.data || [])) {
          runReportDps.push(dp)
        }
      }
      _runReportDebug = `ok, ${records.length} records, ${runReportDps.length} dps`
    } else {
      const errText = await r.text().catch(() => '')
      _runReportDebug = errText.slice(0, 300)
    }
  } catch (e) {
    _runReportDebug = `fetch error: ${e.message}`
  }

  if (!latestData && runReportDps.length === 0) {
    return res.status(502).json({ error: 'No data from MLink' })
  }

  // Merge: RunReport provides baseline; LatestDeviceData overwrites (fresher)
  const byKey = {}
  const keyOf = dp => dp.alias || dp.desc || dp.dataSourceName || dp.Name || dp.name

  // Older RunReport data first (lowest priority)
  for (const dp of runReportDps) {
    const k = keyOf(dp)
    if (k && !byKey[k]) byKey[k] = dp
  }
  // LatestDeviceData overwrites (highest priority)
  for (const dp of (latestData?.datapoints || [])) {
    const k = keyOf(dp)
    if (k) byKey[k] = dp
  }

  res.json({
    ...(latestData || {}),
    datapoints: Object.values(byKey),
    _merged: true,
    _runReportCount: runReportDps.length,
    _runReportStatus,
    _runReportDebug,
    _window: { yesterdayStartUTC, yesterdayEndUTC },
  })
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

// Persisted MLink history — rows appended by the background scheduler
// (server/mlinkHistory.js) every MLINK_POLL_INTERVAL_MINUTES. Served
// back out as a normalized JSON array so the Field Data history tab
// can merge them with its CSV baseline. `days` query param clamps to
// an observation window; omit to get every retained row.
app.get('/api/mlink/history', async (req, res) => {
  const days = req.query.days != null ? parseInt(req.query.days, 10) : null
  try {
    const rows = await readMlinkHistory({ days: days && days > 0 ? days : undefined })
    res.setHeader('Cache-Control', 'public, max-age=30')
    res.json({ rows, status: await getMlinkHistoryStatus() })
  } catch (err) {
    res.status(500).json({ error: 'history read failed', details: err.message })
  }
})

// Diagnostic — trigger an out-of-band poll tick and report status.
// Left unauthenticated for parity with the other /api/mlink/* reads;
// the MLink API key stays server-side and this handler only writes
// one deduped row per panel-reported timestamp.
app.post('/api/mlink/history/tick', async (_req, res) => {
  try {
    const status = await triggerMlinkHistoryTickNow()
    res.status(201).json(status)
  } catch (err) {
    res.status(500).json({ error: 'tick failed', details: err.message })
  }
})

const distPath = join(__dirname, '..', 'dist')

// Public live-data view — no auth required
app.get('/live-view', (_req, res) => {
  res.sendFile(join(distPath, 'live-view.html'))
})

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
  // MLink history scheduler is independent of the DB — it writes to
  // the Railway volume regardless of PostgreSQL state, so we start it
  // right away. The scheduler idles harmlessly if MLINK_API_KEY isn't
  // set, so we can always kick it.
  startMlinkHistoryScheduler()
  // One-shot seed of ~30 days of compressor history from the bundled
  // CSV exports. Idempotent — safe to run on every boot, only writes
  // rows the first time the volume sees it.
  seedCompressorHistoryIfNeeded()
    .then(result => console.log(`[seedCompressorHistory] ${JSON.stringify(result)}`))
    .catch(err => console.warn(`[seedCompressorHistory] failed: ${err.message}`))
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
