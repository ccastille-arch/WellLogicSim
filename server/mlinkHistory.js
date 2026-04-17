/**
 * MLink live history — periodic persistence of field-unit snapshots.
 *
 * Polls the MLink LatestDeviceData endpoint on a fixed interval
 * (default every 15 min, configurable via MLINK_POLL_INTERVAL_MINUTES),
 * pulls the panel + both compressor devices, normalizes each response
 * into a row that matches parseKlondikeCSV's output shape, AND
 * attaches per-compressor register maps so the downstream Field Data
 * history page can render full compressor trends (temperatures,
 * speeds, pressures) over whatever window we've accumulated.
 *
 * Design notes
 *   - Append-only JSONL so a partial write corrupts at most one line.
 *   - Dedupe on the panel-reported timestamp so a restart inside the
 *     15-min window won't double-record the same sample.
 *   - Row shape mirrors src/engine/klondikeData.js parseKlondikeCSV
 *     plus a `compressors[n].registers` map keyed by MLink dataSource
 *     labels (Compressor Speed, 3rd Stage Discharge Temperature, etc.)
 *   - MLink API key stays server-side. The route handler never exposes
 *     it to the browser.
 *   - Failures (network, disk, API quota) log and continue — never
 *     throw from the scheduler tick. Pattern mirrors storage.js.
 */

import { access, appendFile, mkdir, readFile, stat } from 'fs/promises'
import { constants as fsConstants } from 'fs'
import { join } from 'path'

const MLINK_BASE = 'https://api.fwmurphy-iot.com/api'

const DATA_DIR =
  process.env.DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  (process.env.NODE_ENV === 'production' ? '/data' : null)

// If we're in dev without an explicit data dir, fall back to a
// repo-local .data folder so the feature still works locally.
const RESOLVED_DATA_DIR = DATA_DIR || join(process.cwd(), '.data')
const HISTORY_PATH = join(RESOLVED_DATA_DIR, 'mlink-history.jsonl')

const POLL_INTERVAL_MIN = Math.max(
  parseInt(process.env.MLINK_POLL_INTERVAL_MINUTES || '15', 10) || 15,
  1, // clamp — MLink doesn't refresh faster than 1 min anyway
)
const POLL_INTERVAL_MS = POLL_INTERVAL_MIN * 60_000

// Device IDs default to the live dashboard values from
// src/engine/liveRegisters.js (LIVE_DATA_DEVICES). Override per-env if
// the physical units are re-provisioned without redeploying the
// frontend.
const PANEL_DEVICE = process.env.MLINK_PANEL_DEVICE_ID   || '2504-504495'
const COMP_A_DEVICE = process.env.MLINK_COMP_A_DEVICE_ID || '2504-505561'
const COMP_B_DEVICE = process.env.MLINK_COMP_B_DEVICE_ID || '2504-505472'

// Hard safety cap — if the file grows past this we pause appends until
// an operator rotates/trims manually, preventing unbounded disk growth
// if retention trimming on reads ever isn't enough.
const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB

let pollTimer = null
let lastTickAt = null
let lastTickStatus = null
let lastError = null

// ────────────────────────────────────────────────────────────────────
// MLink fetch + parse
// ────────────────────────────────────────────────────────────────────

async function fetchDevice(deviceId, apiKey) {
  const url = `${MLINK_BASE}/LatestDeviceData?deviceId=${encodeURIComponent(deviceId)}&code=${encodeURIComponent(apiKey)}`
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`MLink ${res.status} for ${deviceId}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

/**
 * Build a {label -> {value, units, timestampSec}} map from an MLink
 * LatestDeviceData payload. Matches the frontend parseLiveDatapoints
 * output shape, but self-contained so the server has no dependency on
 * the React build.
 */
function buildDatapointMap(payload) {
  const map = {}
  if (!payload?.datapoints) return map
  const timestamps = Array.isArray(payload.timestamps) ? payload.timestamps : []
  for (const dp of payload.datapoints) {
    const label = dp?.alias || dp?.desc || dp?.dataSourceName
    if (!label) continue
    const rawValue = Array.isArray(dp.values) ? dp.values[0] : dp.value
    if (rawValue == null) continue
    const tsSec = Array.isArray(dp.timestamps) ? dp.timestamps[0] : timestamps[0]
    map[label] = {
      value: rawValue,
      units: dp.units || dp.unit || null,
      timestampSec: tsSec ?? null,
    }
  }
  return map
}

/**
 * Reduce a device map to a flat {label -> numeric | string} snapshot —
 * this is what the UI iterates over when rendering the compressor
 * detail table, so stripping the envelope here keeps the on-disk
 * payload small and the consumer trivial.
 */
function snapshotRegisters(map) {
  const flat = {}
  for (const [label, dp] of Object.entries(map)) {
    if (dp?.value == null) continue
    const n = Number(dp.value)
    flat[label] = Number.isFinite(n) ? n : String(dp.value)
  }
  return flat
}

function toNumber(raw) {
  if (raw == null) return null
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

function lookup(map, keys) {
  for (const key of keys) {
    if (map[key] != null && map[key].value != null) return map[key]
  }
  return null
}

function lookupValue(map, keys) {
  return lookup(map, keys)?.value ?? null
}

/**
 * Compressor actual-flow resolver (server copy). Mirrors the frontend
 * findCompressorActualFlow: tries explicit labels first, then fuzzy
 * flow+rate scan. Needed so persisted rows include a resolved
 * comp1ActualFlow / comp2ActualFlow that downstream consumers can rely
 * on without re-resolving per render.
 */
function resolveCompressorActualFlow(map) {
  const explicit = lookupValue(map, [
    'Flow Rate',
    'Flow Rate PID PV',
    'Flow Rate PV',
    'Flow PID PV',
    'Compressor Flow Rate PID PV',
    'Compressor Flow Rate',
    'Discharge Flow Rate',
    'Actual Flow Rate',
    'Gas Flow Rate',
    'Flow',
  ])
  if (explicit != null) return toNumber(explicit)

  const isFlowLabel = (k) => /flow\s*rate|flow_rate|flowrate/i.test(k)
  for (const [k, dp] of Object.entries(map)) {
    if (!isFlowLabel(k) || dp?.value == null) continue
    const n = toNumber(dp.value)
    if (n != null && n >= 0) return n
  }
  return null
}

/**
 * Combine the three raw MLink payloads into one normalized history
 * row. Any per-device failure is tolerated — missing fields become
 * null rather than blocking the snapshot, and the compressors[].
 * registers map simply omits labels the device didn't publish.
 */
function buildHistoryRow({ panelMap, compAMap, compBMap, timestampIso }) {
  const wellRunStatusFor = (i, flowMmscfd) => {
    const direct = lookupValue(panelMap, [
      `WellHead #${i} Running Status`,
      `Wellhead #${i} Running Status`,
    ])
    if (direct) return String(direct)
    const runningPct = toNumber(lookupValue(panelMap, [
      `Wellhead #${i} Flow Running Status Percent`,
    ]))
    if (runningPct != null) return runningPct > 0 ? 'Online' : 'Offline'
    if (flowMmscfd != null) return flowMmscfd > 0.05 ? 'Online' : 'Offline'
    return null
  }

  const wells = [1, 2, 3, 4].map((i) => {
    const flowMmscfd = toNumber(lookupValue(panelMap, [
      `Wellhead #${i} Injection Flow Rate From Customer PLC`,
    ]))
    const desiredInjectionRateMmscfd = toNumber(lookupValue(panelMap, [
      `Wellhead #${i} Calculated Desired Flow`,
    ]))
    return {
      flowMmscfd,
      rawSetpointMmscfd: toNumber(lookupValue(panelMap, [
        `Wellhead #${i} Setpoint From Customer PLC`,
      ])),
      staticPressure: toNumber(lookupValue(panelMap, [
        `Wellhead #${i} Injection Static Pressure From Customer PLC`,
      ])),
      diffPressure: toNumber(lookupValue(panelMap, [
        `Wellhead #${i} Injection Differential Prs From Customer PLC`,
      ])),
      temp: toNumber(lookupValue(panelMap, [
        `Wellhead #${i} Injection Temp From Customer PLC`,
      ])),
      calcDesiredFlow: desiredInjectionRateMmscfd,
      desiredInjectionRateMmscfd,
      setpointMmscfd: desiredInjectionRateMmscfd,
      maxFlowRate: toNumber(lookupValue(panelMap, [`Wellhead #${i} Max Flow Rate`])),
      analogOutput: toNumber(lookupValue(panelMap, [
        `Well #${i} Analog Output ${i}`,
        `Well #${i} Analog Output`,
      ])),
      runStatus: wellRunStatusFor(i, flowMmscfd),
      yesterdayTotal: toNumber(lookupValue(panelMap, [
        `Wellhead #${i} Yesterdays Total Flow`,
        `Wellhead #${i} Yesterday's Total Flow`,
      ])),
    }
  })

  return {
    timestamp: timestampIso,
    totalFlowMscfd: toNumber(lookupValue(panelMap, ['Calculated Flow with Offset'])),
    comp1Status: lookupValue(panelMap, ['Run Status Comp #1']) || null,
    comp2Status: lookupValue(panelMap, ['Run Status Comp #2']) || null,
    comp1DesiredFlow: toNumber(lookupValue(panelMap, [
      'Compressor #1 Desire Flow SP For PID Murphy',
      'Compressor #1 Desired Flow SP For PID Murphy',
    ])),
    comp2DesiredFlow: toNumber(lookupValue(panelMap, [
      'Compressor #2 Desire Flow SP For PID Murphy',
      'Compressor #2 Desired Flow SP For PID Murphy',
    ])),
    comp1ActualFlow: resolveCompressorActualFlow(compAMap),
    comp2ActualFlow: resolveCompressorActualFlow(compBMap),
    faultIndication: lookupValue(panelMap, ['Fault Indication']) || null,
    flowStatusMode: lookupValue(panelMap, ['Flow Status Mode']) || null,
    hourMeter: toNumber(lookupValue(panelMap, ['Hour Meter'])),
    wells,
    // Per-compressor register snapshot — powers the Field Data history
    // compressor-detail tab. Every label the device publishes is kept
    // so the UI can render whatever catalog it cares about.
    compressors: [
      { id: 1, registers: snapshotRegisters(compAMap) },
      { id: 2, registers: snapshotRegisters(compBMap) },
    ],
  }
}

// ────────────────────────────────────────────────────────────────────
// File I/O
// ────────────────────────────────────────────────────────────────────

async function ensureDataDir() {
  await mkdir(RESOLVED_DATA_DIR, { recursive: true })
  await access(RESOLVED_DATA_DIR, fsConstants.W_OK)
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
      } catch { /* ignore malformed line */ }
    }
    return ts
  } catch (err) {
    if (err.code === 'ENOENT') return new Set()
    throw err
  }
}

async function appendRow(row) {
  await appendFile(HISTORY_PATH, JSON.stringify(row) + '\n', 'utf8')
}

/**
 * Read all persisted rows, optionally filtered to the last `days`
 * days. Returns rows oldest-first to match parseKlondikeCSV convention.
 */
export async function readMlinkHistory({ days } = {}) {
  try {
    const text = await readFile(HISTORY_PATH, 'utf8')
    const rows = []
    for (const line of text.split('\n')) {
      if (!line) continue
      try {
        rows.push(JSON.parse(line))
      } catch { /* ignore malformed line */ }
    }
    rows.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)))

    if (days && Number.isFinite(days) && days > 0) {
      const cutoff = Date.now() - days * 86400_000
      return rows.filter((r) => {
        const t = Date.parse(r.timestamp)
        return Number.isFinite(t) ? t >= cutoff : true
      })
    }
    return rows
  } catch (err) {
    if (err.code === 'ENOENT') return []
    throw err
  }
}

export async function getMlinkHistoryStatus() {
  let fileSize = 0
  let rowCount = 0
  let firstTimestamp = null
  let lastTimestamp = null
  try {
    const info = await stat(HISTORY_PATH)
    fileSize = info.size
    const rows = await readMlinkHistory()
    rowCount = rows.length
    firstTimestamp = rows[0]?.timestamp || null
    lastTimestamp = rows[rows.length - 1]?.timestamp || null
  } catch { /* file absent or unreadable */ }
  return {
    enabled: !!process.env.MLINK_API_KEY,
    path: HISTORY_PATH,
    fileSize,
    rowCount,
    firstTimestamp,
    lastTimestamp,
    pollIntervalMinutes: POLL_INTERVAL_MIN,
    lastTickAt,
    lastTickStatus,
    lastError,
  }
}

// ────────────────────────────────────────────────────────────────────
// Scheduler
// ────────────────────────────────────────────────────────────────────

async function tick() {
  const apiKey = process.env.MLINK_API_KEY
  if (!apiKey) {
    lastTickStatus = 'skipped: MLINK_API_KEY not configured'
    return
  }
  lastTickAt = new Date().toISOString()
  try {
    await ensureDataDir()

    // Safety cap: if the file ever exceeds MAX_FILE_BYTES we pause
    // appends until an operator cleans it up. Prevents an unbounded
    // disk runaway if retention trimming isn't wired into a rewrite.
    try {
      const info = await stat(HISTORY_PATH)
      if (info.size > MAX_FILE_BYTES) {
        lastTickStatus = `skipped: ${HISTORY_PATH} exceeds ${MAX_FILE_BYTES} bytes — rotate or trim to resume`
        return
      }
    } catch { /* file absent is fine */ }

    const [panelRaw, compARaw, compBRaw] = await Promise.all([
      fetchDevice(PANEL_DEVICE, apiKey).catch((err) => { throw new Error(`panel: ${err.message}`) }),
      fetchDevice(COMP_A_DEVICE, apiKey).catch((err) => { throw new Error(`compA: ${err.message}`) }),
      fetchDevice(COMP_B_DEVICE, apiKey).catch((err) => { throw new Error(`compB: ${err.message}`) }),
    ])

    const panelMap = buildDatapointMap(panelRaw)
    const compAMap = buildDatapointMap(compARaw)
    const compBMap = buildDatapointMap(compBRaw)

    // Use the panel's reported timestamp when available so two appends
    // for the same MLink sample dedupe cleanly. Fall back to server
    // "now" if the envelope is missing the array.
    const panelFirstTs =
      Array.isArray(panelRaw?.timestamps) && panelRaw.timestamps[0]
        ? new Date(panelRaw.timestamps[0] * 1000).toISOString()
        : new Date().toISOString()

    const existing = await readExistingTimestamps()
    if (existing.has(panelFirstTs)) {
      lastTickStatus = `deduped: ${panelFirstTs} already recorded`
      return
    }

    const row = buildHistoryRow({
      panelMap,
      compAMap,
      compBMap,
      timestampIso: panelFirstTs,
    })

    await appendRow(row)
    lastTickStatus = `appended: ${panelFirstTs}`
    lastError = null
  } catch (err) {
    lastError = err.message
    lastTickStatus = `error: ${err.message}`
    // Do not throw — the scheduler must keep ticking.
    console.warn(`[mlinkHistory] tick failed: ${err.message}`)
  }
}

export function startMlinkHistoryScheduler() {
  if (pollTimer) return
  if (!process.env.MLINK_API_KEY) {
    console.warn('[mlinkHistory] MLINK_API_KEY not set — scheduler will idle until it is configured')
  }
  // Kick one tick on startup so the volume starts growing immediately
  // after a deploy, then continue on the configured interval.
  tick().catch((err) => console.warn(`[mlinkHistory] startup tick failed: ${err.message}`))
  pollTimer = setInterval(() => {
    tick().catch((err) => console.warn(`[mlinkHistory] scheduled tick failed: ${err.message}`))
  }, POLL_INTERVAL_MS)
  console.log(`[mlinkHistory] scheduler started — polling every ${POLL_INTERVAL_MIN} min → ${HISTORY_PATH}`)
}

export function stopMlinkHistoryScheduler() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// Exposed for an operator-triggered immediate poll (diagnostic tool).
export async function triggerMlinkHistoryTickNow() {
  await tick()
  return getMlinkHistoryStatus()
}
