import express from 'express'
import cors from 'cors'
import { appendFile, mkdir, readFile } from 'fs/promises'
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

app.get('/api/public/pad-visibility', (_req, res) => {
  res.json({ supreme: true })
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

// RunReport is rate-limited to once per 15 minutes per device on Murphy's side.
// Cache results in memory so the frontend's 30-second poll doesn't burn the quota.
const RUN_REPORT_CACHE = new Map()  // deviceId → { dps, fetchedAt, status, debug }
const RUN_REPORT_TTL_MS = 14 * 60 * 1000  // 14 min to stay safely inside the 15-min limit

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

const SUPREME_MLINK_DEVICES = {
  panel: process.env.MLINK_SUPREME_PANEL_DEVICE_ID || '',
  unit2139: process.env.MLINK_SUPREME_UNIT_2139_DEVICE_ID || '',
  unit2140: process.env.MLINK_SUPREME_UNIT_2140_DEVICE_ID || '',
}

const SUPREME_MLINK_LABELS = {
  panel: {
    name: 'Well Control Supreme COP',
    description: 'ConocoPhillips Supreme well control panel',
  },
  unit2139: {
    name: '2139 Conoco Supreme Federal 21 CTB',
    description: 'Compressor #1 · Unit 2139',
  },
  unit2140: {
    name: '2140 Conoco Supreme Federal 21 CTB',
    description: 'Compressor #2 · Unit 2140',
  },
}

function resolveSupremeDevice(asset) {
  const key = String(asset || '').trim()
  if (!Object.hasOwn(SUPREME_MLINK_DEVICES, key)) return null
  const deviceId = SUPREME_MLINK_DEVICES[key]
  return {
    asset: key,
    deviceId,
    configured: !!deviceId,
    ...SUPREME_MLINK_LABELS[key],
  }
}

function setNoStore(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
}

function mlinkDatapointKey(dp) {
  return dp.alias || dp.desc || dp.dataSourceName || dp.Name || dp.name
}

function buildMlinkMap(data) {
  const map = new Map()
  for (const dp of (data?.datapoints || [])) {
    const key = mlinkDatapointKey(dp)
    if (key) map.set(key, dp)
  }
  return map
}

function readMlinkNumber(map, labels) {
  for (const label of labels) {
    const value = map.get(label)?.value
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return numeric
  }
  return null
}

function readMlinkTimestamp(data) {
  const ts = data?.timestamps?.[0]
  return Number.isFinite(Number(ts)) ? new Date(Number(ts) * 1000).toISOString() : new Date().toISOString()
}

const SUPREME_DEMAND_EVENT_FILE = () => join(getStorageStatus().dataDir || '/data', 'supreme-compressor-demand-events.jsonl')

const SUPREME_DEMAND_KEYS = [
  {
    id: 'comp1',
    label: 'Compressor #1 Demand',
    keys: [
      'Compressor #1 Desire Flow SP For PID Murphy',
      'Compressor 1 Desire Flow SP For PID Murphy',
      'Compressor #1 Desired Flow SP For PID Murphy',
      'Compressor #1 Flow Demand',
      'Compressor 1 Flow Demand',
      'Comp #1 Flow Demand',
    ],
  },
  {
    id: 'comp2',
    label: 'Compressor #2 Demand',
    keys: [
      'Compressor #2 Desire Flow SP For PID Murphy',
      'Compressor 2 Desire Flow SP For PID Murphy',
      'Compressor #2 Desired Flow SP For PID Murphy',
      'Compressor #2 Flow Demand',
      'Compressor 2 Flow Demand',
      'Comp #2 Flow Demand',
    ],
  },
]

const SUPREME_EVENT_WELLS = [
  { wellNumber: 1, physical: '607H' },
  { wellNumber: 2, physical: '606H' },
  { wellNumber: 3, physical: '605H' },
  { wellNumber: 4, physical: 'Future' },
  { wellNumber: 5, physical: 'Future' },
  { wellNumber: 6, physical: 'Future' },
]

function buildSupremeDemandEvent(panelData) {
  const map = buildMlinkMap(panelData)
  const demand = {}
  for (const item of SUPREME_DEMAND_KEYS) {
    demand[item.id] = readMlinkNumber(map, item.keys)
  }

  if (Object.values(demand).every(value => value == null)) return null

  const wells = SUPREME_EVENT_WELLS.map(({ wellNumber, physical }) => ({
    wellNumber,
    physical,
    staticPressure: readMlinkNumber(map, [
      `Wellhead #${wellNumber} Injection Static Pressure From Customer PLC`,
      `Well ${wellNumber} Injection Static Pressure`,
      `Well #${wellNumber} Injection Static Pressure`,
      `Wellhead #${wellNumber} Injection Static Pressure`,
      `Well ${wellNumber} Static Pressure`,
    ]),
    flowRate: readMlinkNumber(map, [
      `Well ${wellNumber} Injection Gas Flow Rate`,
      `Well #${wellNumber} Flow Rate`,
    ]),
  }))

  return {
    timestamp: readMlinkTimestamp(panelData),
    recordedAt: new Date().toISOString(),
    demand,
    wells,
  }
}

async function readSupremeDemandEvents(limit = 50) {
  const file = SUPREME_DEMAND_EVENT_FILE()
  const text = await readFile(file, 'utf8').catch(() => '')
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-limit)
    .map(line => {
      try { return JSON.parse(line) }
      catch { return null }
    })
    .filter(Boolean)
    .reverse()
}

async function recordSupremeDemandChange(panelData) {
  const event = buildSupremeDemandEvent(panelData)
  if (!event) return null

  const previous = (await readSupremeDemandEvents(1))[0]
  if (previous && JSON.stringify(previous.demand) === JSON.stringify(event.demand)) {
    return null
  }

  const file = SUPREME_DEMAND_EVENT_FILE()
  await mkdir(dirname(file), { recursive: true })
  await appendFile(file, `${JSON.stringify(event)}\n`, 'utf8')
  return event
}

async function fetchMlinkLatest(deviceId, key) {
  const r = await fetch(`${MLINK_BASE}/LatestDeviceData?deviceId=${encodeURIComponent(deviceId)}&code=${encodeURIComponent(key)}`)
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    const err = new Error(body.slice(0, 500) || 'MLINK error')
    err.status = r.status
    throw err
  }
  return r.json()
}

async function fetchMlinkFull(deviceId, key) {
  let latestData = null
  let latestError = null
  try {
    latestData = await fetchMlinkLatest(deviceId, key)
  } catch (err) {
    latestError = err
  }

  const todayMidnightUTC = Math.floor(Date.now() / 86400000) * 86400
  const yesterdayStartUTC = todayMidnightUTC - 86400
  const yesterdayEndUTC = todayMidnightUTC - 1

  let runReportDps = []
  let _runReportStatus = null
  let _runReportDebug = null
  let _runReportFromCache = false

  const cached = RUN_REPORT_CACHE.get(deviceId)
  if (cached && Date.now() - cached.fetchedAt < RUN_REPORT_TTL_MS) {
    runReportDps = cached.dps
    _runReportStatus = cached.status
    _runReportDebug = `cache hit (age ${Math.round((Date.now() - cached.fetchedAt) / 1000)}s): ${cached.debug}`
    _runReportFromCache = true
  } else {
    try {
      const r = await fetch(
        `${MLINK_BASE}/RunReport?deviceId=${encodeURIComponent(deviceId)}&startTs=${yesterdayStartUTC}&endTs=${yesterdayEndUTC}&code=${encodeURIComponent(key)}`
      )
      _runReportStatus = r.status
      if (r.ok) {
        const data = await r.json()
        const records = Array.isArray(data) ? data : [data]
        for (const rec of records) {
          for (const dp of (rec.datapoints || rec.data || [])) {
            runReportDps.push(dp)
          }
        }
        _runReportDebug = `ok, ${records.length} records, ${runReportDps.length} dps`
        RUN_REPORT_CACHE.set(deviceId, { dps: runReportDps, fetchedAt: Date.now(), status: r.status, debug: _runReportDebug })
      } else {
        const errText = await r.text().catch(() => '')
        _runReportDebug = errText.slice(0, 300)
      }
    } catch (e) {
      _runReportDebug = `fetch error: ${e.message}`
    }
  }

  if (!latestData && runReportDps.length === 0) {
    const err = latestError || new Error('No data from MLink')
    err.status = err.status || 502
    throw err
  }

  const byKey = {}
  for (const dp of runReportDps) {
    const k = mlinkDatapointKey(dp)
    if (k && !byKey[k]) byKey[k] = dp
  }
  for (const dp of (latestData?.datapoints || [])) {
    const k = mlinkDatapointKey(dp)
    if (k) byKey[k] = dp
  }

  return {
    ...(latestData || {}),
    datapoints: Object.values(byKey),
    _merged: true,
    _runReportCount: runReportDps.length,
    _runReportStatus,
    _runReportDebug,
    _runReportFromCache,
    _window: { yesterdayStartUTC, yesterdayEndUTC },
  }
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

app.get('/api/mlink/supreme/devices', (_req, res) => {
  setNoStore(res)
  const devices = {}
  for (const asset of Object.keys(SUPREME_MLINK_DEVICES)) {
    const resolved = resolveSupremeDevice(asset)
    devices[asset] = {
      asset,
      deviceId: resolved.deviceId,
      configured: resolved.configured,
      name: resolved.name,
      description: resolved.description,
    }
  }
  res.json({
    customer: 'ConocoPhillips',
    location: 'Supreme',
    plcPlatform: 'DE4000',
    devices,
    env: {
      panel: 'MLINK_SUPREME_PANEL_DEVICE_ID',
      unit2139: 'MLINK_SUPREME_UNIT_2139_DEVICE_ID',
      unit2140: 'MLINK_SUPREME_UNIT_2140_DEVICE_ID',
    },
  })
})

app.get('/api/mlink/supreme/device', async (req, res) => {
  setNoStore(res)
  const key = process.env.MLINK_API_KEY
  if (!key) return res.status(503).json({ error: 'MLINK_API_KEY not configured' })
  const resolved = resolveSupremeDevice(req.query.asset)
  if (!resolved) return res.status(400).json({ error: 'unknown Supreme asset', validAssets: Object.keys(SUPREME_MLINK_DEVICES) })
  if (!resolved.configured) {
    return res.status(503).json({
      error: 'Supreme MLink device ID not configured',
      asset: resolved.asset,
      requiredEnv: resolved.asset === 'panel'
        ? 'MLINK_SUPREME_PANEL_DEVICE_ID'
        : `MLINK_SUPREME_UNIT_${resolved.asset.replace('unit', '')}_DEVICE_ID`,
    })
  }
  try {
    const data = await fetchMlinkLatest(resolved.deviceId, key)
    const demandEvent = resolved.asset === 'panel' ? await recordSupremeDemandChange(data).catch(() => null) : null
    res.json({ ...data, _supremeAsset: resolved.asset, _assetName: resolved.name, _demandEvent: demandEvent })
  } catch (err) {
    res.status(err.status || 502).json({ error: 'MLINK error', status: err.status || 502, details: err.message })
  }
})

app.get('/api/mlink/supreme/demand-events', async (req, res) => {
  setNoStore(res)
  const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '50', 10) || 50))
  try {
    res.json({ events: await readSupremeDemandEvents(limit) })
  } catch (err) {
    res.status(500).json({ error: 'Demand event history read failed', details: err.message })
  }
})

app.get('/api/mlink/supreme/device/full', async (req, res) => {
  setNoStore(res)
  const key = process.env.MLINK_API_KEY
  if (!key) return res.status(503).json({ error: 'MLINK_API_KEY not configured' })
  const resolved = resolveSupremeDevice(req.query.asset)
  if (!resolved) return res.status(400).json({ error: 'unknown Supreme asset', validAssets: Object.keys(SUPREME_MLINK_DEVICES) })
  if (!resolved.configured) {
    return res.status(503).json({
      error: 'Supreme MLink device ID not configured',
      asset: resolved.asset,
      requiredEnv: resolved.asset === 'panel'
        ? 'MLINK_SUPREME_PANEL_DEVICE_ID'
        : `MLINK_SUPREME_UNIT_${resolved.asset.replace('unit', '')}_DEVICE_ID`,
    })
  }
  try {
    const data = await fetchMlinkFull(resolved.deviceId, key)
    res.json({ ...data, _supremeAsset: resolved.asset, _assetName: resolved.name })
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'MLINK unreachable', details: err.message })
  }
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

  // Fetch RunReport for yesterday UTC (Murphy rejects queries that include today,
  // and rate-limits to once per 15 minutes per device — serve from cache in between).
  const todayMidnightUTC = Math.floor(Date.now() / 86400000) * 86400  // seconds
  const yesterdayStartUTC = todayMidnightUTC - 86400
  const yesterdayEndUTC = todayMidnightUTC - 1  // 23:59:59 yesterday, excludes today

  let runReportDps = []
  let _runReportStatus = null
  let _runReportDebug = null
  let _runReportFromCache = false

  const cached = RUN_REPORT_CACHE.get(deviceId)
  if (cached && Date.now() - cached.fetchedAt < RUN_REPORT_TTL_MS) {
    // Serve from cache — don't hammer Murphy's rate limit
    runReportDps = cached.dps
    _runReportStatus = cached.status
    _runReportDebug = `cache hit (age ${Math.round((Date.now() - cached.fetchedAt) / 1000)}s): ${cached.debug}`
    _runReportFromCache = true
  } else {
    try {
      const r = await fetch(
        `${MLINK_BASE}/RunReport?deviceId=${encodeURIComponent(deviceId)}&startTs=${yesterdayStartUTC}&endTs=${yesterdayEndUTC}&code=${key}`
      )
      _runReportStatus = r.status
      if (r.ok) {
        const data = await r.json()
        const records = Array.isArray(data) ? data : [data]
        for (const rec of records) {
          for (const dp of (rec.datapoints || rec.data || [])) {
            runReportDps.push(dp)
          }
        }
        _runReportDebug = `ok, ${records.length} records, ${runReportDps.length} dps`
        // Store successful result in cache
        RUN_REPORT_CACHE.set(deviceId, { dps: runReportDps, fetchedAt: Date.now(), status: r.status, debug: _runReportDebug })
      } else {
        const errText = await r.text().catch(() => '')
        _runReportDebug = errText.slice(0, 300)
      }
    } catch (e) {
      _runReportDebug = `fetch error: ${e.message}`
    }
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
    _runReportFromCache,
    _window: { yesterdayStartUTC, yesterdayEndUTC },
  })
})

// Probe Murphy's DataExport endpoint — may expose all configured registers
// (not just the published freeze-group 8) when queried with a time window.
app.get('/api/mlink/dataexport', async (req, res) => {
  const key = process.env.MLINK_API_KEY
  if (!key) return res.status(503).json({ error: 'MLINK_API_KEY not configured' })
  const { deviceId } = req.query
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' })
  const todayMidnightUTC = Math.floor(Date.now() / 86400000) * 86400
  const yesterdayStart = todayMidnightUTC - 86400
  const yesterdayEnd   = todayMidnightUTC - 1
  const attempts = [
    { endpoint: 'DataExport',       params: `deviceId=${deviceId}&startTs=${yesterdayStart}&endTs=${yesterdayEnd}` },
    { endpoint: 'DataExport',       params: `deviceId=${deviceId}&startDate=${new Date(yesterdayStart*1000).toISOString()}&endDate=${new Date(yesterdayEnd*1000).toISOString()}` },
    { endpoint: 'GetRegisterData',  params: `deviceId=${deviceId}` },
    { endpoint: 'AllRegisterData',  params: `deviceId=${deviceId}` },
    { endpoint: 'RegisterHistory',  params: `deviceId=${deviceId}&startTs=${yesterdayStart}&endTs=${yesterdayEnd}` },
  ]
  const results = {}
  for (const { endpoint, params } of attempts) {
    try {
      const url = `${MLINK_BASE}/${endpoint}?${params}&code=${key}`
      const r = await fetch(url)
      const text = await r.text().catch(() => '')
      results[`${endpoint}?${params.split('&')[0]}`] = { status: r.status, ok: r.ok, snippet: text.slice(0, 2000) }
    } catch (err) {
      results[endpoint] = { error: err.message }
    }
  }
  res.json({ deviceId, results })
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

// Supreme COP standalone live view - no auth required, no app chrome
app.get(['/', '/supreme-view', '/supreme'], (_req, res) => {
  res.sendFile(join(distPath, 'supreme-view.html'))
})

app.use(express.static(distPath))
app.get(/(.*)/, (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' })
  res.sendFile(join(distPath, 'supreme-view.html'))
})

app.listen(PORT, () => {
  console.log(`Supreme COP live data server listening on port ${PORT}`)
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
  // One-shot seed of ~30 days of compressor history from the bundled
  // CSV exports. Idempotent — safe to run on every boot, only writes
  // rows the first time the volume sees it.
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
// redeploy trigger
