import { useState, useEffect, useCallback } from 'react'
import { parseLiveDatapoints } from '../engine/liveRegisters'

// ─── Halfmann 1214 — standalone live field data view ─────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || ''
const REFRESH_INTERVAL_S = 60

const HALFMANN_DEVICES = {
  panel:    '2507-501508',
  unit2130: '2507-500709',
  unit2127: '2504-504108',
  unit2129: '2504-504102',
  unit2128: '2507-500076',
}

const HALFMANN_UNITS = [
  { key: 'unit2130', label: 'Unit 2130', deviceId: HALFMANN_DEVICES.unit2130, compNum: 1 },
  { key: 'unit2127', label: 'Unit 2127', deviceId: HALFMANN_DEVICES.unit2127, compNum: 2 },
  { key: 'unit2129', label: 'Unit 2129', deviceId: HALFMANN_DEVICES.unit2129, compNum: 3 },
  { key: 'unit2128', label: 'Unit 2128', deviceId: HALFMANN_DEVICES.unit2128, compNum: 4 },
]

// ─── fetch helpers ────────────────────────────────────────────────────────────

async function fetchDevice(deviceId) {
  try {
    const res = await fetch(`${API_BASE}/api/mlink/device?deviceId=${encodeURIComponent(deviceId)}`)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

// ─── register lookup helpers ──────────────────────────────────────────────────

function getVal(panel, ...keys) {
  for (const key of keys) {
    const dp = panel[key]
    if (dp?.value != null && dp.value !== '' && !isNaN(Number(dp.value))) {
      return Number(dp.value)
    }
  }
  return null
}

function getStr(panel, ...keys) {
  for (const key of keys) {
    const dp = panel[key]
    if (dp?.value != null && String(dp.value).trim() !== '') return String(dp.value)
  }
  return null
}

function wellKeys(n, suffix) {
  return [
    `Well ${n} ${suffix}`,
    `Well #${n} ${suffix}`,
    `Wellhead #${n} ${suffix}`,
    `Wellhead ${n} ${suffix}`,
  ]
}

// Compressor desired flow register label variants from DE4000 panel.
function compDesiredKeys(n) {
  return [
    `Compressor ${n} Desire Flow SP For PID Murphy`,
    `Compressor #${n} Desire Flow SP For PID Murphy`,
    `Compressor ${n} Desired Flow SP For PID Murphy`,
    `Compressor #${n} Desired Flow SP For PID Murphy`,
  ]
}

// ─── formatters ───────────────────────────────────────────────────────────────

const fmt = (v, decimals = 3, unit = '') =>
  v != null ? `${Number(v).toFixed(decimals)}${unit ? ' ' + unit : ''}` : '—'

const fmtFlow = v => fmt(v, 3, 'MMSCFD')
const fmtPsi  = v => fmt(v, 1, 'PSI')
const fmtTemp = v => fmt(v, 1, '°F')
const fmtPct  = v => fmt(v, 1, '%')
const fmtRpm  = v => v != null ? `${Math.round(v)} RPM` : '—'
const fmtHrs  = v => v != null ? `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })} hrs` : '—'

function fmtManualAuto(v) {
  if (v == null) return '—'
  const n = Number(v)
  if (n === 0) return 'Manual'
  if (n === 1) return 'Auto'
  return String(v)
}

function matchColor(pct) {
  if (pct == null) return '#4a5568'
  if (pct >= 98) return '#22c55e'
  if (pct >= 90) return '#eab308'
  return '#ef4444'
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Field({ label, value, accent }) {
  const hasData = value && value !== '—'
  return (
    <div className="flex items-center justify-between py-1 border-b border-[#1a1a28] last:border-0">
      <span className="text-[9px] text-[#666] uppercase tracking-wider leading-tight pr-2">{label}</span>
      <span
        className="text-[11px] font-bold text-right shrink-0"
        style={{ color: hasData ? (accent || '#e2e8f0') : '#3a3a50', fontFamily: "'Arial Black', sans-serif" }}
      >
        {value || '—'}
      </span>
    </div>
  )
}

function SectionHeader({ children }) {
  return (
    <h2
      className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3"
      style={{ color: '#49D0E2', fontFamily: "'Montserrat', sans-serif" }}
    >
      {children}
    </h2>
  )
}

function RefreshCountdown({ secondsLeft, loading, onRefresh }) {
  const pct = Math.round((secondsLeft / REFRESH_INTERVAL_S) * 100)
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#111120] hover:bg-[#1a1a2a] disabled:opacity-50 transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 36 36" className="shrink-0 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#1a2a1a" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15" fill="none" stroke="#22c55e" strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 15}`}
          strokeDashoffset={`${2 * Math.PI * 15 * (1 - pct / 100)}`}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span className="text-[9px] text-[#888]">
        {loading ? 'Loading…' : `Refresh in ${secondsLeft}s`}
      </span>
    </button>
  )
}

// ─── Well card ────────────────────────────────────────────────────────────────

function WellCard({ number, panel }) {
  const n = number
  const flowRate      = getVal(panel, ...wellKeys(n, 'Flow Rate'), ...wellKeys(n, 'Injection Gas Flow Rate'))
  // "Injection Flow Rate From Customer PLC" is the authoritative desired flow per well.
  const setpoint      = getVal(panel,
    ...wellKeys(n, 'Injection Flow Rate From Customer PLC'),
    ...wellKeys(n, 'Setpoint'),
    ...wellKeys(n, 'Setpoint From Customer PLC'),
    ...wellKeys(n, 'Calculated Desired Flow'),
  )
  const yesterdayFlow = getVal(panel, ...wellKeys(n, 'Yesterdays Flow'), ...wellKeys(n, 'Yesterdays Total Flow'))
  const staticPres    = getVal(panel, ...wellKeys(n, 'Injection Static Pressure'), ...wellKeys(n, 'Static Pressure'))
  const diffPres      = getVal(panel, ...wellKeys(n, 'Injection Differential Pressure'), ...wellKeys(n, 'Injection Differential Prs'))
  const injTemp       = getVal(panel, ...wellKeys(n, 'Injection Temp'))
  const manualAuto    = getStr(panel, ...wellKeys(n, 'Manual/Auto'), ...wellKeys(n, 'In Manual/Auto'))
  const chokePos      = getVal(panel, ...wellKeys(n, 'Choke Position'), ...wellKeys(n, 'Analog Output ' + n))
  const casingPres    = getVal(panel, ...wellKeys(n, 'Casing Pressure'))
  const tubingPres    = getVal(panel, ...wellKeys(n, 'Tubing Pressure'))

  // actual / desired * 100 (not error-based)
  const matchPct = flowRate != null && setpoint != null && setpoint > 0
    ? (flowRate / setpoint) * 100
    : null

  const isOnTarget = matchPct != null && matchPct >= 98

  return (
    <div className="bg-[#111118] rounded-xl border border-[#1e1e2e] p-4">
      {/* Well header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${flowRate != null ? 'bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.7)]' : 'bg-[#444]'}`} />
          <span className="text-[13px] font-black text-white" style={{ fontFamily: "'Arial Black', sans-serif" }}>
            Well {n}
          </span>
        </div>
        {matchPct != null && (
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: matchColor(matchPct) + '26',
              color: matchColor(matchPct),
              border: `1px solid ${matchColor(matchPct)}44`,
            }}
          >
            {matchPct.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Live injection — hero value */}
      <div className="bg-[#0c0c18] rounded-lg p-3 mb-3 text-center">
        <div className="text-[9px] text-[#666] uppercase tracking-[0.15em] mb-1">Live Injection</div>
        <div
          className="text-[26px] font-black leading-none"
          style={{ color: flowRate != null ? '#22c55e' : '#3a3a50', fontFamily: "'Arial Black', sans-serif" }}
        >
          {flowRate != null ? flowRate.toFixed(3) : '—'}
        </div>
        <div className="text-[9px] text-[#555] mt-0.5">MMSCFD</div>

        {/* Progress bar */}
        {setpoint != null && setpoint > 0 && flowRate != null && (
          <div className="mt-2">
            <div className="relative w-full bg-[#1a1a2a] rounded-full h-1.5 overflow-hidden">
              <div className="absolute top-0 bottom-0 w-px bg-[#4fc3f7]/60 z-10" style={{ left: `${Math.min(100, (setpoint / (setpoint * 1.15)) * 100)}%` }} />
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (flowRate / (setpoint * 1.15)) * 100)}%`,
                  background: isOnTarget ? '#22c55e' : '#eab308',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* All Modbus-list registers */}
      <div>
        <Field label="Target (Customer PLC)"  value={fmtFlow(setpoint)}      accent="#4fc3f7" />
        <Field label="Match vs Target"        value={matchPct != null ? `${matchPct.toFixed(1)}%` : '—'} accent={matchColor(matchPct)} />
        <Field label="Yesterday Flow"         value={fmtFlow(yesterdayFlow)} accent="#a78bfa" />
        <Field label="Static Pressure"        value={fmtPsi(staticPres)}    />
        <Field label="Differential Pressure"  value={fmtPsi(diffPres)}      />
        <Field label="Injection Temp"         value={fmtTemp(injTemp)}      />
        <Field label="Mode"                   value={fmtManualAuto(manualAuto)} />
        <Field label="Choke Position"         value={fmtPct(chokePos)}      />
        <Field label="Casing Pressure"        value={fmtPsi(casingPres)}    />
        <Field label="Tubing Pressure"        value={fmtPsi(tubingPres)}    />
      </div>
    </div>
  )
}

// ─── Compressor unit card ──────────────────────────────────────────────────────

function CompressorCard({ label, dataRaw, compNum, panel }) {
  const data = parseLiveDatapoints(dataRaw)

  const engineSpeed   = getVal(data, 'Engine Speed', 'Compressor Speed', 'Driver Speed', 'RPM')
  const flowRate      = getVal(data, 'Flow Rate PID PV', 'Flow Rate', 'Flow Rate PV')
  const suctionPrs    = getVal(data, 'Stage 1 Suction Prs', 'Suction Pressure')
  const dischargePrs  = getVal(data, 'Stage 3 Discharge Prs', 'Discharge Pressure')
  const stage1Temp    = getVal(data, '1st Stage Discharge Temperature', 'Stage 1 Discharge Temperature')
  const stage2Temp    = getVal(data, '2nd Stage Discharge Temperature', 'Stage 2 Discharge Temperature')
  const stage3Temp    = getVal(data, '3rd Stage Discharge Temperature', 'Discharge Temperature')
  const compOilPress  = getVal(data, 'Compressor Oil Pressure')
  const compOilTemp   = getVal(data, 'Compressor Oil Temperature')
  const engOilTemp    = getVal(data, 'Engine Oil Temperature')
  const engOilPress   = getVal(data, 'Engine Oil Presssure', 'Engine Oil Pressure')
  const engLoad       = getVal(data, 'Engine Load')
  const sysVolts      = getVal(data, 'System Volts', 'System Voltage')
  const hourMeter     = getVal(data, 'Hour Meter')
  const oilTemp       = getVal(data, 'Oil Temperature', 'EICS Oil Temperature')
  const startAttempts = getVal(data, 'Number of Start Attempts Per Hour', 'Number of Start Attempts per Hour')
  const lockout       = getStr(data, 'Setpoint Edit Lockout Enabled')

  // Desired flow from DE4000 panel (Node 1) — "Compressor ## Desire Flow SP For PID Murphy"
  const desiredFlow = compNum != null && panel != null
    ? getVal(panel, ...compDesiredKeys(compNum))
    : null

  const isRunning = (engineSpeed != null && engineSpeed > 100) || (flowRate != null && flowRate > 0.01)
  const shutdown  = getStr(data, 'Skid - Shutdown')
  const isStopped = (shutdown && shutdown.toLowerCase().includes('shutdown')) || !isRunning

  const discColor   = dischargePrs != null && dischargePrs > 1300 ? '#ef4444' : '#e2e8f0'
  const s3TempColor = stage3Temp != null && stage3Temp > 280 ? '#ef4444' : '#e2e8f0'

  // Flow match for this compressor
  const compMatchPct = flowRate != null && desiredFlow != null && desiredFlow > 0
    ? (flowRate / desiredFlow) * 100
    : null

  return (
    <div className="bg-[#111118] rounded-xl border border-[#1e1e2e] p-4">
      {/* Unit header */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${!isStopped ? 'bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-[#ef4444]'}`} />
        <span className="text-[13px] font-black text-white" style={{ fontFamily: "'Arial Black', sans-serif" }}>{label}</span>
        <span className={`ml-auto text-[9px] font-bold tracking-widest ${!isStopped ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          {!isStopped ? 'RUNNING' : 'STOPPED'}
        </span>
      </div>

      {/* Hero: RPM + Flow + Desired Flow */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[#0c0c18] rounded-lg p-2.5 text-center">
          <div className="text-[8px] text-[#666] uppercase tracking-wider mb-1">Engine Speed</div>
          <div className="text-[16px] font-black text-white leading-none" style={{ fontFamily: "'Arial Black', sans-serif" }}>
            {engineSpeed != null ? Math.round(engineSpeed).toLocaleString() : '—'}
          </div>
          <div className="text-[8px] text-[#555]">RPM</div>
        </div>
        <div className="bg-[#0c0c18] rounded-lg p-2.5 text-center">
          <div className="text-[8px] text-[#666] uppercase tracking-wider mb-1">Actual Flow</div>
          <div className="text-[16px] font-black leading-none" style={{ color: flowRate != null ? '#22c55e' : '#3a3a50', fontFamily: "'Arial Black', sans-serif" }}>
            {flowRate != null ? flowRate.toFixed(3) : '—'}
          </div>
          <div className="text-[8px] text-[#555]">MMSCFD</div>
        </div>
        <div className="bg-[#0c0c18] rounded-lg p-2.5 text-center">
          <div className="text-[8px] text-[#666] uppercase tracking-wider mb-1">Desired Flow</div>
          <div className="text-[16px] font-black leading-none" style={{ color: desiredFlow != null ? '#4fc3f7' : '#3a3a50', fontFamily: "'Arial Black', sans-serif" }}>
            {desiredFlow != null ? desiredFlow.toFixed(3) : '—'}
          </div>
          <div className="text-[8px] text-[#555]">MMSCFD</div>
        </div>
      </div>

      {/* Flow match indicator */}
      {compMatchPct != null && (
        <div className="mb-3 flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#0c0c18]">
          <span className="text-[9px] text-[#666] uppercase tracking-wider">Flow Match</span>
          <span className="text-[11px] font-bold" style={{ color: matchColor(compMatchPct) }}>
            {compMatchPct.toFixed(1)}%
          </span>
        </div>
      )}

      {/* All registers from Modbus list */}
      <div>
        <div className="text-[8px] text-[#49D0E2] uppercase tracking-[0.18em] font-bold mb-1.5">Pressures</div>
        <Field label="Stage 1 Suction Pressure"    value={fmtPsi(suctionPrs)}   />
        <Field label="Stage 3 Discharge Pressure"  value={fmtPsi(dischargePrs)} accent={discColor} />
        <Field label="Compressor Oil Pressure"      value={fmtPsi(compOilPress)} />
        <Field label="Engine Oil Pressure"          value={fmtPsi(engOilPress)}  />

        <div className="text-[8px] text-[#49D0E2] uppercase tracking-[0.18em] font-bold mt-2.5 mb-1.5">Temperatures</div>
        <Field label="1st Stage Discharge Temp"     value={fmtTemp(stage1Temp)} />
        <Field label="2nd Stage Discharge Temp"     value={fmtTemp(stage2Temp)} />
        <Field label="3rd Stage Discharge Temp"     value={fmtTemp(stage3Temp)} accent={s3TempColor} />
        <Field label="Compressor Oil Temp"          value={fmtTemp(compOilTemp)} />
        <Field label="Engine Oil Temp"              value={fmtTemp(engOilTemp)}  />
        <Field label="Oil Temp (EICS)"              value={fmtTemp(oilTemp)}     />

        <div className="text-[8px] text-[#49D0E2] uppercase tracking-[0.18em] font-bold mt-2.5 mb-1.5">Engine / System</div>
        <Field label="Engine Load"                  value={fmtPct(engLoad)}      />
        <Field label="System Voltage"               value={sysVolts != null ? `${sysVolts.toFixed(1)} VDC` : '—'} />
        <Field label="Hour Meter"                   value={fmtHrs(hourMeter)}    />
        <Field label="Start Attempts / Hr"          value={startAttempts != null ? String(Math.round(startAttempts)) : '—'} />
        <Field label="Setpoint Lockout"             value={lockout || '—'}       />
      </div>
    </div>
  )
}

// ─── Alert badge ─────────────────────────────────────────────────────────────

function AlertBadge({ label, status, value }) {
  const c = status === 'pass'
    ? { bg: '#0a1f0a', border: '#22c55e44', text: '#22c55e', icon: '✓' }
    : status === 'fail'
    ? { bg: '#1f0a0a', border: '#ef444444', text: '#ef4444', icon: '✗' }
    : { bg: '#0c0c14', border: '#2a2a3a', text: '#444', icon: '—' }
  return (
    <div
      className="rounded-lg p-2.5 flex flex-col gap-1 min-w-0"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[8px] text-[#666] uppercase tracking-wider leading-tight truncate">{label}</span>
        <span className="text-[13px] font-black shrink-0" style={{ color: c.text, fontFamily: "'Arial Black', sans-serif" }}>{c.icon}</span>
      </div>
      <div className="text-[9px] font-bold truncate" style={{ color: c.text, fontFamily: "'Arial Black', sans-serif" }}>
        {value || '—'}
      </div>
    </div>
  )
}

// ─── main component ────────────────────────────────────────────────────────────

export default function HalfmannLiveView() {
  const [panelData, setPanelData]       = useState(null)
  const [unitDataRaw, setUnitDataRaw]   = useState({})
  const [loading, setLoading]           = useState(true)
  const [lastRefresh, setLastRefresh]   = useState(null)
  const [countdown, setCountdown]       = useState(REFRESH_INTERVAL_S)
  const [padVisible, setPadVisible]     = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/public/pad-visibility`)
      .then(r => r.ok ? r.json() : null)
      .then(b => { if (b?.halfmann === false) setPadVisible(false) })
      .catch(() => {})
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    const [panel, ...unitResults] = await Promise.all([
      fetchDevice(HALFMANN_DEVICES.panel),
      ...HALFMANN_UNITS.map(u => fetchDevice(u.deviceId)),
    ])
    setPanelData(panel)
    const raw = {}
    HALFMANN_UNITS.forEach((u, i) => { raw[u.key] = unitResults[i] })
    setUnitDataRaw(raw)
    setLastRefresh(new Date())
    setLoading(false)
    setCountdown(REFRESH_INTERVAL_S)
  }, [])

  useEffect(() => {
    refresh()
    const iv = setInterval(refresh, REFRESH_INTERVAL_S * 1000)
    return () => clearInterval(iv)
  }, [refresh])

  useEffect(() => {
    const tick = setInterval(() => setCountdown(c => c > 0 ? c - 1 : REFRESH_INTERVAL_S), 1000)
    return () => clearInterval(tick)
  }, [])

  if (!padVisible) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080810]">
        <div className="text-[14px] text-[#888]">This page is not currently available.</div>
      </div>
    )
  }

  // ─── derived panel data ────────────────────────────────────────────────────
  const panel = parseLiveDatapoints(panelData)

  const totalDesired  = getVal(panel, 'Total Desired Site Flow')
  const recNumComps   = getVal(panel, 'Recommended Number Of Compressors')
  const panelHourMtr  = getVal(panel, 'Hour Meter')

  // Per-well flows and Customer PLC setpoints
  const wellFlows = [1,2,3,4,5].map(n =>
    getVal(panel,
      `Well #${n} Flow Rate`, `Well # ${n} Flow Rate`,
      `Well ${n} Injection Gas Flow Rate`,
      `Well ${n} Flow Rate`,
    )
  )
  const wellSetpoints = [1,2,3,4,5].map(n =>
    getVal(panel,
      ...wellKeys(n, 'Injection Flow Rate From Customer PLC'),
      ...wellKeys(n, 'Setpoint'),
      ...wellKeys(n, 'Setpoint From Customer PLC'),
      ...wellKeys(n, 'Calculated Desired Flow'),
    )
  )

  const totalActual = wellFlows.reduce((s, v) => s + (v ?? 0), 0)
  const padMatch = totalDesired != null && totalDesired > 0
    ? Math.max(0, 100 - (Math.abs(totalActual - totalDesired) / totalDesired) * 100)
    : null

  // Wells on target: actual >= 98% of desired (Customer PLC setpoint)
  const wellsOnTarget = wellFlows.reduce((count, flow, i) => {
    const sp = wellSetpoints[i]
    if (flow != null && sp != null && sp > 0 && flow >= sp * 0.98) return count + 1
    return count
  }, 0)
  const wellsWithSp = [0,1,2,3,4].filter(i => wellFlows[i] != null && wellSetpoints[i] != null).length

  // Compressor flow match: sum(actual) / sum(desired) * 100
  const compActualFlows  = HALFMANN_UNITS.map(u => {
    const d = parseLiveDatapoints(unitDataRaw[u.key])
    return getVal(d, 'Flow Rate PID PV', 'Flow Rate', 'Flow Rate PV')
  })
  const compDesiredFlows = HALFMANN_UNITS.map(u => getVal(panel, ...compDesiredKeys(u.compNum)))
  const totalCompActual  = compActualFlows.reduce((s, v) => s + (v ?? 0), 0)
  const totalCompDesired = compDesiredFlows.reduce((s, v) => s + (v ?? 0), 0)
  const compFlowMatch    = totalCompDesired > 0 ? (totalCompActual / totalCompDesired) * 100 : null

  // Surface equipment
  const suctionPres  = getVal(panel, 'Suction Header Pressure')
  const suctionValve = getVal(panel, 'Suction/Sales Valve Position')
  const recycleValve = getVal(panel,
    'Recycle Valve Position',
    'Station Recycle Valve Position',
    'Station Recycle Valve',
    'Station Recycle',
    'RCV Position',
    'Recycle Valve',
  )
  const panelStatuses = [1,2,3,4,5].map(n => getVal(panel, `Panel Status comp${n}`))

  // Per-well pressures for alerts
  const wellStaticPres = [1,2,3,4,5].map(n => getVal(panel, ...wellKeys(n, 'Injection Static Pressure'), ...wellKeys(n, 'Static Pressure')))
  const wellCasingPres = [1,2,3,4,5].map(n => getVal(panel, ...wellKeys(n, 'Casing Pressure')))
  const wellTubingPres = [1,2,3,4,5].map(n => getVal(panel, ...wellKeys(n, 'Tubing Pressure')))

  // Discharge trigger setpoint (Altronic) — try all known name variants from panel
  const dischargeTriggerSP = getVal(panel,
    'Altronic Discharge Pressure Trigger', 'Discharge Pressure Trigger Setpoint',
    'Discharge Trigger Setpoint', 'Discharge Trigger', 'Altronic Discharge SP',
    'Speed Auto Discharge SP', 'Discharge SP',
  )

  // Speed Control SP per compressor from unit devices
  const compSpeedControlSP = HALFMANN_UNITS.map(u => {
    const d = parseLiveDatapoints(unitDataRaw[u.key])
    return getVal(d, 'Speed Control SP', 'Altronic Speed Control SP', 'Speed Auto Discharge SP', 'Discharge Pressure SP', 'Speed SP')
  })

  // ── Alert statuses ──────────────────────────────────────────────────────────
  const alertRecycle = recycleValve == null ? 'gray' : recycleValve > 0 ? 'fail' : 'pass'

  const alertWellFlow = [0,1,2,3,4].map(i => {
    const flow = wellFlows[i], sp = wellSetpoints[i]
    if (flow == null || sp == null || sp === 0) return 'gray'
    return flow >= sp * 0.95 ? 'pass' : 'fail'
  })

  const alertStaticVsDischarge = dischargeTriggerSP == null ? 'gray'
    : wellStaticPres.some(p => p != null && p >= dischargeTriggerSP) ? 'fail' : 'pass'

  const alertSpeedControlSP = (() => {
    if (compSpeedControlSP.every(v => v == null)) return 'gray'
    const anyTriggered = HALFMANN_UNITS.some((u, i) => {
      const d = parseLiveDatapoints(unitDataRaw[u.key])
      const dischPrs = getVal(d, 'Stage 3 Discharge Prs', 'Discharge Pressure')
      const sp = compSpeedControlSP[i]
      return sp != null && dischPrs != null && Math.abs(sp - dischPrs) < 10
    })
    return anyTriggered ? 'fail' : 'pass'
  })()

  const alertSiteFlow = totalDesired == null || totalDesired === 0 ? 'gray'
    : totalActual >= totalDesired * 0.95 ? 'pass' : 'fail'

  const alertWellPres = [0,1,2,3,4].map(i => {
    if (dischargeTriggerSP == null) return 'gray'
    const casing = wellCasingPres[i], tubing = wellTubingPres[i]
    if (casing == null && tubing == null) return 'gray'
    return (casing != null && casing >= dischargeTriggerSP) || (tubing != null && tubing >= dischargeTriggerSP)
      ? 'fail' : 'pass'
  })

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-[#080810]">

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-lg shadow-[#22c55e]/60 animate-pulse" />
          <div>
            <div className="text-[14px] text-white font-black" style={{ fontFamily: "'Arial Black', sans-serif" }}>
              Halfmann 1214 — Live Field Data
            </div>
            <div className="text-[9px] text-[#555]">Active Pad Logic panel · read-only · MLink live feed</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && <span className="text-[9px] text-[#444] hidden sm:block">Updated {lastRefresh.toLocaleTimeString()}</span>}
          <RefreshCountdown secondsLeft={countdown} loading={loading} onRefresh={refresh} />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-[1400px] mx-auto space-y-8">

          {/* ── Section 1: Site Overview ── */}
          <div>
            <SectionHeader>Site Overview</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

              {/* Pad injection match */}
              <div className="col-span-2 bg-[#111118] rounded-xl border border-[#1e1e2e] p-4 flex items-center gap-5">
                <div>
                  <div className="text-[9px] text-[#666] uppercase tracking-wider mb-1">Pad Injection Match</div>
                  <div
                    className="text-[36px] font-black leading-none"
                    style={{ color: matchColor(padMatch), fontFamily: "'Arial Black', sans-serif" }}
                  >
                    {padMatch != null ? `${padMatch.toFixed(1)}%` : '—'}
                  </div>
                  {totalDesired != null && (
                    <div className="text-[10px] text-[#666] mt-1">
                      {totalActual.toFixed(3)} actual vs {totalDesired.toFixed(3)} desired MMSCFD
                    </div>
                  )}
                </div>
                {padMatch != null && (
                  <div className="ml-auto">
                    <svg width="52" height="52" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#1a2a1a" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15" fill="none"
                        stroke={matchColor(padMatch)}
                        strokeWidth="3"
                        strokeDasharray={`${2 * Math.PI * 15}`}
                        strokeDashoffset={`${2 * Math.PI * 15 * (1 - padMatch / 100)}`}
                        strokeLinecap="round"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Wells on target */}
              <div className="bg-[#111118] rounded-xl border border-[#1e1e2e] p-4 flex flex-col justify-between">
                <div className="text-[9px] text-[#666] uppercase tracking-wider">Wells On Target</div>
                <div className="text-[28px] font-black leading-none mt-1" style={{ color: wellsOnTarget === wellsWithTarget && wellsWithTarget > 0 ? '#22c55e' : wellsOnTarget > 0 ? '#eab308' : '#ef4444', fontFamily: "'Arial Black', sans-serif" }}>
                  {wellsWithTarget > 0 ? `${wellsOnTarget}/${wellsWithTarget}` : '—'}
                </div>
                <div className="text-[9px] text-[#555]">≥ 98% of target</div>
              </div>

              {/* Compressor flow match */}
              <div className="bg-[#111118] rounded-xl border border-[#1e1e2e] p-4 flex flex-col justify-between">
                <div className="text-[9px] text-[#666] uppercase tracking-wider">Compressor Flow Match</div>
                <div className="text-[28px] font-black leading-none mt-1"
                  style={{ color: compressorFlowMatch != null ? matchColor(compressorFlowMatch) : '#3a3a50', fontFamily: "'Arial Black', sans-serif" }}>
                  {compressorFlowMatch != null ? `${compressorFlowMatch.toFixed(1)}%` : '—'}
                </div>
                <div className="text-[9px] text-[#555]">actual / desired</div>
              </div>
            </div>

            {/* Second row: total desired + recommended compressors */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-[#111118] rounded-xl border border-[#1e1e2e] p-4 flex flex-col justify-between">
                <div className="text-[9px] text-[#666] uppercase tracking-wider">Total Desired Flow</div>
                <div className="text-[22px] font-black text-[#4fc3f7] leading-none mt-1" style={{ fontFamily: "'Arial Black', sans-serif" }}>
                  {totalDesired != null ? totalDesired.toFixed(3) : '—'}
                </div>
                <div className="text-[9px] text-[#555]">MMSCFD</div>
              </div>

              <div className="bg-[#111118] rounded-xl border border-[#1e1e2e] p-4 flex flex-col justify-between">
                <div className="text-[9px] text-[#666] uppercase tracking-wider">Recommended Compressors</div>
                <div className="text-[22px] font-black text-white leading-none mt-1" style={{ fontFamily: "'Arial Black', sans-serif" }}>
                  {recNumComps != null ? Math.round(recNumComps) : '—'}
                </div>
                <div className="text-[9px] text-[#555]">Units running</div>
              </div>

              {/* Wells on target */}
              <div className="bg-[#111118] rounded-xl border border-[#1e1e2e] p-4 flex flex-col justify-between">
                <div className="text-[9px] text-[#666] uppercase tracking-wider">Wells On Target</div>
                <div
                  className="text-[28px] font-black leading-none mt-1"
                  style={{
                    color: wellsWithSp === 0 ? '#3a3a50'
                      : wellsOnTarget === wellsWithSp ? '#22c55e'
                      : wellsOnTarget >= wellsWithSp * 0.8 ? '#eab308'
                      : '#ef4444',
                    fontFamily: "'Arial Black', sans-serif",
                  }}
                >
                  {wellsWithSp > 0 ? `${wellsOnTarget}/${wellsWithSp}` : '—'}
                </div>
                <div className="text-[9px] text-[#555]">≥98% of Customer PLC SP</div>
              </div>

              {/* Compressor flow match */}
              <div className="bg-[#111118] rounded-xl border border-[#1e1e2e] p-4 flex flex-col justify-between">
                <div className="text-[9px] text-[#666] uppercase tracking-wider">Compressor Flow Match</div>
                <div
                  className="text-[28px] font-black leading-none mt-1"
                  style={{ color: matchColor(compFlowMatch), fontFamily: "'Arial Black', sans-serif" }}
                >
                  {compFlowMatch != null ? `${compFlowMatch.toFixed(1)}%` : '—'}
                </div>
                <div className="text-[9px] text-[#555]">
                  {totalCompDesired > 0
                    ? `${totalCompActual.toFixed(3)} / ${totalCompDesired.toFixed(3)} MMSCFD`
                    : 'Actual / Desired MMSCFD'}
                </div>
              </div>

              {/* Two blank filler cells to keep 4-col grid tidy on wide screens */}
              <div className="hidden sm:block" />
              <div className="hidden sm:block" />
            </div>

            {/* Panel status strip */}
            <div className="mt-3 bg-[#111118] rounded-xl border border-[#1e1e2e] px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-[10px] text-[#22c55e] font-bold">PANEL ONLINE</span>
              </div>
              <div className="text-[9px] text-[#555]">Hour Meter: <span className="text-[10px] text-white font-bold">{fmtHrs(panelHourMtr)}</span></div>
              {lastRefresh && <div className="text-[9px] text-[#555]">Data: {lastRefresh.toLocaleString()}</div>}
              {panelStatuses.some(v => v != null) && (
                <div className="flex items-center gap-3 ml-auto">
                  {panelStatuses.map((v, i) => (
                    <div key={i} className="text-[9px] text-[#555]">
                      Comp {i+1}: <span className="text-white font-bold">{v != null ? v.toFixed(0) : '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Section 2: Site Alerts & Status ── */}
          <div>
            <SectionHeader>Site Alerts &amp; Status</SectionHeader>
            <div className="bg-[#111118] rounded-xl border border-[#1e1e2e] p-4 space-y-4">

              {/* Site-level alerts */}
              <div>
                <div className="text-[8px] text-[#49D0E2] uppercase tracking-[0.18em] font-bold mb-2">Site</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <AlertBadge label="Recycle Valve" status={alertRecycle}
                    value={recycleValve != null ? fmtPct(recycleValve) : '—'} />
                  <AlertBadge label="Site Flow Match" status={alertSiteFlow}
                    value={totalDesired != null ? `${totalActual.toFixed(3)} / ${totalDesired.toFixed(3)} MMSCFD` : '—'} />
                  <AlertBadge label="Static vs Discharge" status={alertStaticVsDischarge}
                    value={dischargeTriggerSP != null ? `Trigger: ${fmtPsi(dischargeTriggerSP)}` : '—'} />
                  <AlertBadge label="Speed Control SP" status={alertSpeedControlSP}
                    value={compSpeedControlSP.some(v => v != null)
                      ? compSpeedControlSP.map((v, i) => v != null ? `C${i+1}: ${v.toFixed(0)}` : null).filter(Boolean).join('  ')
                      : '—'} />
                </div>
              </div>

              {/* Per-well flow alerts */}
              <div>
                <div className="text-[8px] text-[#49D0E2] uppercase tracking-[0.18em] font-bold mb-2">Per-Well Flow (≥95% of Target)</div>
                <div className="grid grid-cols-5 gap-2">
                  {[0,1,2,3,4].map(i => (
                    <AlertBadge key={i} label={`Well #${i+1} Flow`} status={alertWellFlow[i]}
                      value={wellFlows[i] != null ? fmtFlow(wellFlows[i]) : '—'} />
                  ))}
                </div>
              </div>

              {/* Per-well pressure alerts */}
              <div>
                <div className="text-[8px] text-[#49D0E2] uppercase tracking-[0.18em] font-bold mb-2">Per-Well Casing / Tubing vs Discharge</div>
                <div className="grid grid-cols-5 gap-2">
                  {[0,1,2,3,4].map(i => (
                    <AlertBadge key={i} label={`Well #${i+1} Pressure`} status={alertWellPres[i]}
                      value={wellCasingPres[i] != null ? `C: ${fmtPsi(wellCasingPres[i])}` : wellTubingPres[i] != null ? `T: ${fmtPsi(wellTubingPres[i])}` : '—'} />
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* ── Section 3: Surface Equipment ── */}
          <div>
            <SectionHeader>Surface Equipment</SectionHeader>
            <div className="bg-[#111118] rounded-xl border border-[#1e1e2e] p-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                  { label: 'Suction Header Pressure', value: fmtPsi(suctionPres) },
                  { label: 'Suction / Sales Valve',   value: fmtPct(suctionValve) },
                  { label: 'Recycle Valve Position',  value: fmtPct(recycleValve) },
                  { label: 'Panel Status — Comp 1',   value: panelStatuses[0] != null ? panelStatuses[0].toFixed(0) : '—' },
                  { label: 'Panel Status — Comp 2',   value: panelStatuses[1] != null ? panelStatuses[1].toFixed(0) : '—' },
                  { label: 'Panel Status — Comp 3',   value: panelStatuses[2] != null ? panelStatuses[2].toFixed(0) : '—' },
                  { label: 'Panel Status — Comp 4',   value: panelStatuses[3] != null ? panelStatuses[3].toFixed(0) : '—' },
                  { label: 'Panel Status — Comp 5',   value: panelStatuses[4] != null ? panelStatuses[4].toFixed(0) : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#0c0c18] rounded-lg p-3">
                    <div className="text-[8px] text-[#555] uppercase tracking-wider mb-1">{label}</div>
                    <div
                      className="text-[16px] font-black"
                      style={{
                        color: value !== '—' ? '#e2e8f0' : '#2a2a3a',
                        fontFamily: "'Arial Black', sans-serif",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Section 3: Wells ── */}
          <div>
            <SectionHeader>Well Injection — All Parameters</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[1,2,3,4,5].map(n => (
                <WellCard key={n} number={n} panel={panel} />
              ))}
            </div>
            <div className="mt-3 text-center">
              <span className="text-[11px] text-[#666]">Total Injection: </span>
              <span className="text-[16px] font-black text-white" style={{ fontFamily: "'Arial Black', sans-serif" }}>
                {totalActual.toFixed(3)} MMSCFD
              </span>
            </div>
          </div>

          {/* ── Section 4: Compression Units ── */}
          <div>
            <SectionHeader>Compression Units — All Parameters</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {HALFMANN_UNITS.map(u => (
                <CompressorCard
                  key={u.key}
                  label={u.label}
                  dataRaw={unitDataRaw[u.key]}
                  compNum={u.compNum}
                  panel={panel}
                />
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="px-5 py-2.5 bg-[#0c0c16] border-t border-[#1a1a2a] text-center">
        <span className="text-[8px] text-[#333]">
          WellLogic™ · Halfmann 1214 · Read-only live view · Refreshes every {REFRESH_INTERVAL_S}s · MLink data via Murphy FW
        </span>
      </footer>
    </div>
  )
}
