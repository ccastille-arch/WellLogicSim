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

// Hook — loads and parses the Klondike CSV once, caches result
let _cachedData = null

export function useKlondikeData() {
  const [data, setData] = useState(_cachedData)
  const [loading, setLoading] = useState(!_cachedData)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (_cachedData) return
    fetch(`${BASE}data/klondike_cop0001.csv`)
      .then(r => r.text())
      .then(text => {
        const parsed = parseKlondikeCSV(text)
        _cachedData = parsed
        setData(parsed)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
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
