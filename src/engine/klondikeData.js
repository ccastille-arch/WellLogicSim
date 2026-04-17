// Klondike COP0001 — 30-day field data loader and parser
// Real operating data from a WellLogic panel running in West Texas
// Used to drive historical playback and calibrate simulator operating ranges

import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL || '/'

// Parse a CSV line respecting quoted fields
function parseCsvLine(line) {
  const vals = []
  let inQ = false, cur = ''
  for (const c of line) {
    if (c === '"') inQ = !inQ
    else if (c === ',' && !inQ) { vals.push(cur); cur = '' }
    else cur += c
  }
  vals.push(cur)
  return vals
}

// Parse the raw CSV text into an array of row objects, oldest-first
export function parseKlondikeCSV(text) {
  const lines = text.trim().split('\n')
  const headers = parseCsvLine(lines[0])

  const rows = lines.slice(1).map(line => {
    const vals = parseCsvLine(line)
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })

  // Reverse so oldest is first (CSV is newest-first)
  rows.reverse()

  return rows.map(r => {
    const n = (key) => { const v = parseFloat(r[key]); return isNaN(v) ? null : v }
    const s = (key) => r[key] || null
    const inferRunStatus = (wellIdx, flowMmscfd) => {
      const directStatus =
        s(`WellHead #${wellIdx} Running Status`) ||
        s(`Wellhead #${wellIdx} Running Status`)

      if (directStatus) return directStatus

      const runningPct = n(`Wellhead #${wellIdx} Flow Running Status Percent`)
      if (runningPct != null) {
        return runningPct > 0 ? 'Online' : 'Offline'
      }

      if (flowMmscfd != null) {
        return flowMmscfd > 0.05 ? 'Online' : 'Offline'
      }

      return null
    }

    const wells = [1, 2, 3, 4].map(i => {
      const desiredInjectionRateMmscfd = n(`Wellhead #${i} Calculated Desired Flow`)
      const flowMmscfd = n(`Wellhead #${i} Injection Flow Rate From Customer PLC`)

      return ({
      // Flow in MMSCFD from customer PLC (multiply by 1000 = MCFD for simulator)
      flowMmscfd,
      // Preserve the raw PLC setpoint, but use the calculated desired flow as the
      // effective target because some PLC setpoint registers are unused/stale.
      rawSetpointMmscfd: n(`Wellhead #${i} Setpoint From Customer PLC`),
      // Static injection pressure (PSI)
      staticPressure: n(`Wellhead #${i} Injection Static Pressure From Customer PLC`),
      // Differential pressure across choke (PSI)
      diffPressure: n(`Wellhead #${i} Injection Differential Prs From Customer PLC`),
      // Injection temperature (°F)
      temp: n(`Wellhead #${i} Injection Temp From Customer PLC`),
      // Calculated desired flow target from panel
      calcDesiredFlow: desiredInjectionRateMmscfd,
      desiredInjectionRateMmscfd,
      // Effective target used by dashboards/history
      setpointMmscfd: desiredInjectionRateMmscfd,
      // Max flow rate configured
      maxFlowRate: n(`Wellhead #${i} Max Flow Rate`),
      // Analog Output (choke valve position, %)
      analogOutput: n(`Well #${i} Analog Output ${i}`),
      // Run status
      runStatus: inferRunStatus(i, flowMmscfd),
      // Yesterday's total flow
      yesterdayTotal: n(`Wellhead #${i} Yesterdays Total Flow`),
    })})

    return {
      timestamp: s('Timestamp'),
      // Total calculated pad injection flow (MSCFD)
      totalFlowMscfd: n('Calculated Flow with Offset'),
      comp1Status: s('Run Status Comp #1'),
      comp2Status: s('Run Status Comp #2'),
      comp1DesiredFlow: n("Compressor #1 Desire Flow SP For PID Murphy"),
      comp2DesiredFlow: n("Compressor #2 Desire Flow SP For PID Murphy"),
      faultIndication: s('Fault Indication'),
      flowStatusMode: s('Flow Status Mode'),
      hourMeter: n('Hour Meter'),
      wells,
    }
  })
}

// Hook — loads the CSV baseline once, then merges with the live MLink
// history snapshots the server is appending to the Railway volume
// every MLINK_POLL_INTERVAL_MINUTES.
//
// Merge strategy: CSV rows are the "baseline" (what we had before the
// live scheduler existed). API rows are added alongside them, deduped
// by timestamp, and API wins on collision because it carries the
// per-compressor `registers` map the CSV never had. Results are sorted
// oldest-first so the playback slider reads naturally regardless of
// which source each row came from.
let _cachedData = null
let _cachedCsv = null
let _cachedFetchedAt = 0
const LIVE_REFRESH_MS = 60_000 // refresh the API rows every minute
const API_BASE = import.meta.env.VITE_API_URL || ''

async function fetchCsvBaseline() {
  if (_cachedCsv) return _cachedCsv
  try {
    const res = await fetch(`${BASE}data/klondike_cop0001.csv`)
    if (!res.ok) return []
    const text = await res.text()
    _cachedCsv = parseKlondikeCSV(text)
    return _cachedCsv
  } catch {
    return []
  }
}

async function fetchLiveHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/mlink/history`)
    if (!res.ok) return []
    const body = await res.json()
    return Array.isArray(body?.rows) ? body.rows : []
  } catch {
    return []
  }
}

// Timestamps arrive in two shapes: CSV rows carry the exporter's
// US-locale string ("4/12/2026 12:53:33 AM") and API rows carry ISO
// ("2026-04-17T12:45:00.000Z"). String-comparison between those two
// formats orders all ISO rows before all locale rows regardless of
// actual time — which is how the Field Data tab ended up showing
// "1-Day" and the cursor landing on April 17 instead of April 6.
// Compare numerically via Date.parse so the merged array is actually
// chronological.
function tsMs(row) {
  if (!row?.timestamp) return NaN
  const ms = Date.parse(row.timestamp)
  return Number.isFinite(ms) ? ms : NaN
}

// Dedupe key needs to span both formats too. Normalize to a numeric
// ms bucket (rounded to the nearest minute) so a CSV row and an API
// row that describe the same sample collide cleanly.
function tsKey(row) {
  const ms = tsMs(row)
  if (!Number.isFinite(ms)) return String(row?.timestamp || '')
  return String(Math.round(ms / 60_000)) // per-minute bucket
}

// Does this row carry real per-well data? Seeded compressor-only rows
// (from comp-2073/2074 CSVs) ship wells: [null,null,null,null] — they
// have compressor registers but no wellhead readings. Used to decide
// when forward-fill from the nearest CSV baseline row should kick in.
function hasWellData(row) {
  if (!row?.wells?.length) return false
  return row.wells.some(w => w && (
    w.flowMmscfd != null || w.staticPressure != null || w.temp != null || w.analogOutput != null
  ))
}

function mergeByTimestamp(csvRows, apiRows) {
  const seen = new Set()
  const merged = []
  // API rows first so their `registers` map wins on collision; the CSV
  // baseline fills in anywhere the live scheduler hasn't observed yet.
  for (const row of apiRows) {
    const key = tsKey(row)
    if (!key) continue
    seen.add(key)
    merged.push(row)
  }
  for (const row of csvRows) {
    const key = tsKey(row)
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(row)
  }
  // Rows without a parseable timestamp sort to the tail rather than
  // blocking the valid ones at the head.
  merged.sort((a, b) => {
    const ta = tsMs(a)
    const tb = tsMs(b)
    if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb
    if (Number.isFinite(ta)) return -1
    if (Number.isFinite(tb)) return 1
    return 0
  })

  // Forward-fill baseline fields from the nearest CSV-sourced row into
  // seed rows that only have compressor registers. Without this, the
  // Field Data History playback lands on a comp-CSV bucket (wells:null,
  // status:null, hourMeter:null) and the whole UI reads "--". The
  // backfill uses the most-recent preceding row that had real well
  // data, so the downstream reading is "what the pad looked like at
  // that time" — honest, stable, and no longer blank.
  const fillableFields = ['totalFlowMscfd', 'comp1Status', 'comp2Status', 'hourMeter', 'faultIndication', 'flowStatusMode']
  let lastFull = null
  for (const row of merged) {
    if (hasWellData(row)) {
      lastFull = row
      continue
    }
    if (!lastFull) continue
    // Clone wells — don't mutate the source CSV parse result.
    row.wells = lastFull.wells.map(w => w ? { ...w } : w)
    for (const field of fillableFields) {
      if (row[field] == null && lastFull[field] != null) {
        row[field] = lastFull[field]
      }
    }
    row._wellsBackfilledFromCsv = true
  }

  // Catch the leading edge: seed rows that precede the earliest CSV
  // row can't forward-fill from a prior one, so walk backwards and
  // use the NEXT row with real well data. Handles the opening slice
  // of the playback (1/4322 on the screenshot) that was all dashes.
  let nextFull = null
  for (let i = merged.length - 1; i >= 0; i -= 1) {
    const row = merged[i]
    if (hasWellData(row)) {
      nextFull = row
      continue
    }
    if (row._wellsBackfilledFromCsv || !nextFull) continue
    row.wells = nextFull.wells.map(w => w ? { ...w } : w)
    for (const field of fillableFields) {
      if (row[field] == null && nextFull[field] != null) {
        row[field] = nextFull[field]
      }
    }
    row._wellsBackfilledFromCsv = true
  }

  return merged
}

export function useKlondikeData() {
  const [data, setData] = useState(_cachedData)
  const [loading, setLoading] = useState(!_cachedData)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [csvRows, apiRows] = await Promise.all([fetchCsvBaseline(), fetchLiveHistory()])
        if (cancelled) return
        const merged = mergeByTimestamp(csvRows, apiRows)
        _cachedData = merged
        _cachedFetchedAt = Date.now()
        setData(merged)
        setLoading(false)
      } catch (e) {
        if (cancelled) return
        setError(e.message)
        setLoading(false)
      }
    }

    if (!_cachedData || Date.now() - _cachedFetchedAt > LIVE_REFRESH_MS) {
      load()
    } else {
      setData(_cachedData)
      setLoading(false)
    }

    // Keep the API rows fresh — CSV is static so we only refetch live.
    // Any throw here bubbles as an unhandled promise rejection and
    // can crash the enclosing page, so the whole block is guarded.
    const refresh = setInterval(async () => {
      try {
        const [csvRows, apiRows] = [await fetchCsvBaseline(), await fetchLiveHistory()]
        if (cancelled) return
        const merged = mergeByTimestamp(csvRows, apiRows)
        _cachedData = merged
        _cachedFetchedAt = Date.now()
        setData(merged)
      } catch (err) {
        // Best-effort — stale data is better than a crashed page.
        if (typeof console !== 'undefined') {
          // eslint-disable-next-line no-console
          console.warn('[useKlondikeData] refresh tick failed:', err?.message)
        }
      }
    }, LIVE_REFRESH_MS)

    return () => {
      cancelled = true
      clearInterval(refresh)
    }
  }, [])

  return { data, loading, error }
}

// Operating ranges derived from the Klondike dataset (used to calibrate simulator)
export const KLONDIKE_OPERATING_RANGES = {
  totalFlowMscfd: { min: 2910, max: 3380, typical: 3190 },
  wellFlowMcfd: { min: 3, max: 846, typical: 810 },   // ×1000 from MMSCFD
  staticPressurePsi: { min: 779, max: 861, typical: 805 },
  diffPressurePsi: { min: 41, max: 815, typical: 45 },
  tempF: { min: 116, max: 151, typical: 137 },
  chokeAoPct: { min: 65, max: 68, typical: 66.5 },
  // Setpoints per well (MMSCFD → MCFD)
  setpointsMcfd: [1000, 750, 800, 800],
}

// Given a data row, produce a simulator-compatible state patch
// (these are the values to inject into the running simulation)
export function rowToSimPatch(row) {
  return {
    totalAvailableGas: row.totalFlowMscfd,
    compressors: [
      { status: row.comp1Status === 'Running' ? 'running' : 'stopped' },
      { status: row.comp2Status === 'Running' ? 'running' : 'stopped' },
    ],
    wells: row.wells.map((w, i) => ({
      // flowMmscfd can be null in some rows (sensor dropout) — fall back to typical
      actualRate: w.flowMmscfd != null ? Math.round(w.flowMmscfd * 1000) : 800,
      desiredRate: w.setpointMmscfd != null ? Math.round(w.setpointMmscfd * 1000) : KLONDIKE_OPERATING_RANGES.setpointsMcfd[i],
      chokeAO: w.analogOutput ?? KLONDIKE_OPERATING_RANGES.chokeAoPct.typical,
      injectionPressure: w.staticPressure ?? KLONDIKE_OPERATING_RANGES.staticPressurePsi.typical,
      injectionTemp: w.temp ?? KLONDIKE_OPERATING_RANGES.tempF.typical,
      diffPressure: w.diffPressure ?? KLONDIKE_OPERATING_RANGES.diffPressurePsi.typical,
    }))
  }
}
