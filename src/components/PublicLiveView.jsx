import { useState, useEffect, useCallback } from 'react'
import { useKlondikeData } from '../engine/klondikeData'
import {
  LIVE_DATA_DEVICES,
  findRegisterDatapoint,
  getVisibleCompressorRegisters,
  formatLiveRegisterValue,
  getVisibleLiveRegisters,
  loadAwiRegisterCatalog,
  parseLiveDatapoints,
} from '../engine/liveRegisters'

// Public read-only live MLink dashboard — no auth required, no navigation
// API key stays server-side; this page calls the same /api/mlink/* proxy routes.

const API_BASE = import.meta.env.VITE_API_URL || ''
const REFRESH_INTERVAL_S = 300 // 5 minutes

async function readErrorPayload(res) {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await res.json().catch(() => ({}))
    return body?.details || body?.error || res.statusText
  }
  return (await res.text().catch(() => '')).trim() || res.statusText
}

async function fetchDevice(deviceId) {
  try {
    const res = await fetch(`${API_BASE}/api/mlink/device?deviceId=${encodeURIComponent(deviceId)}`)
    if (!res.ok) {
      return { data: null, error: `device ${deviceId}: ${await readErrorPayload(res)}` }
    }
    return { data: await res.json(), error: '' }
  } catch (err) {
    return { data: null, error: `device ${deviceId}: ${err.message}` }
  }
}

function getTimestamp(data, idx = 0) {
  if (!data?.timestamps?.[idx]) return null
  return new Date(data.timestamps[idx] * 1000)
}

const LIVE_WELL_FLOW_KEYS = [
  ['Well 1 Injection Gas Flow Rate', 'Well #1 Flow Rate'],
  ['Well 2 Injection Gas Flow Rate', 'Well #2 Flow Rate'],
  ['Well 3 Injection Gas Flow Rate', 'Well #3 Flow Rate'],
  ['Well 4 Injection Gas Flow Rate', 'Well #4 Flow Rate'],
]

const LIVE_WELL_YESTERDAY_KEYS = [
  ['Wellhead #1 Yesterdays Total Flow', 'Well 1 Yesterdays Total Flow'],
  ['Wellhead #2 Yesterdays Total Flow', 'Well 2 Yesterdays Total Flow'],
  ['Wellhead #3 Yesterdays Total Flow', 'Well 3 Yesterdays Total Flow'],
  ['Wellhead #4 Yesterdays Total Flow', 'Well 4 Yesterdays Total Flow'],
]

const COMPRESSOR_DESIRED_FLOW_KEYS = [
  ['Compressor #1 Desire Flow SP For PID Murphy', 'Compressor #1 Desired Flow SP For PID Murphy'],
  ['Compressor #2 Desire Flow SP For PID Murphy', 'Compressor #2 Desired Flow SP For PID Murphy'],
]

function getFirstDatapoint(dataMap, keys) {
  for (const key of keys) {
    if (dataMap[key] != null) return dataMap[key]
  }
  return null
}

// ─── helpers (mirrored from MLinkDashboard) ───────────────────────────────────

function parseLiveNumeric(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function resolvePreferredDatapoint(dataMap, labels) {
  for (const label of labels) {
    const datapoint = findRegisterDatapoint(dataMap, { label, decimals: 3 })
    if (datapoint) return datapoint
  }
  return null
}

function computeMatchPct(actual, desired) {
  if (actual == null || desired == null || desired <= 0) return null
  return Math.max(0, 100 - (Math.abs(actual - desired) / desired) * 100)
}

function isWithinTarget(actual, desired) {
  if (actual == null || desired == null || desired <= 0) return false
  return Math.abs(actual - desired) <= desired * 0.03
}

function average(values) {
  const valid = values.filter(v => v != null && Number.isFinite(v))
  if (!valid.length) return null
  return valid.reduce((sum, v) => sum + v, 0) / valid.length
}

function buildHistoricalWellStats(data = []) {
  if (!Array.isArray(data) || !data.length) return []
  return [0, 1, 2, 3].map((wellIdx) => {
    const samples = data.filter(row => row.wells?.[wellIdx])
    if (!samples.length) return { atTargetPct: null }
    const good = samples.filter((row) => {
      const well = row.wells[wellIdx]
      const target = well.desiredInjectionRateMmscfd ?? well.setpointMmscfd
      const actual = well.flowMmscfd
      if (target == null || actual == null || target <= 0) return false
      return Math.abs(actual - target) <= target * 0.05
    }).length
    return { atTargetPct: (good / samples.length) * 100 }
  })
}

function formatPercent(value, decimals = 0) {
  return value != null && Number.isFinite(value) ? `${value.toFixed(decimals)}%` : '--'
}

function formatFlow(value) {
  return value != null && Number.isFinite(value) ? `${value.toFixed(3)} MMSCFD` : '--'
}

function formatSignedFlow(value) {
  if (value == null || !Number.isFinite(value)) return '--'
  return `${value > 0 ? '+' : ''}${value.toFixed(3)} MMSCFD`
}

function formatFlowValue(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(3) : '--'
}

function formatHourMeterValue(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toLocaleString() : '--'
}

function getCompressorUnit(label) {
  if (/temperature/i.test(label)) return 'deg F'
  if (/speed/i.test(label)) return 'RPM'
  if (/pressure|prs|dp/i.test(label)) return 'PSI'
  if (/flow/i.test(label)) return 'MMSCFD'
  return ''
}

function getCompressorColor(label, value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '#fff'
  if (/stage 3 discharge prs/i.test(label)) return numeric > 900 ? '#E8200C' : '#22c55e'
  if (/stage 1 suction prs/i.test(label)) return numeric < 30 ? '#eab308' : '#22c55e'
  if (/3rd stage discharge temperature/i.test(label)) return numeric > 275 ? '#E8200C' : '#22c55e'
  if (/skid - shutdown/i.test(label)) return numeric > 0 ? '#E8200C' : '#22c55e'
  return '#fff'
}

// ─── sub-components ────────────────────────────────────────────────────────────

function DataPoint({ label, value, unit, color, compact = false }) {
  return (
    <div className={`bg-[#0a0a14] rounded border border-[#2a2a3a] ${compact ? 'p-2' : 'p-2'}`}>
      <div className="text-[8px] text-[#888] uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={compact ? 'text-[16px] font-bold' : 'text-[14px] font-bold'} style={{ color: color || '#fff', fontFamily: "'Arial Black'" }}>
          {value || '--'}
        </span>
        <span className="text-[8px] text-[#666]">{unit}</span>
      </div>
    </div>
  )
}

function LiveRegisterRow({ label, value, unit }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-[8px] text-[#777] leading-tight">{label}</div>
      <div className="text-right">
        <div className="text-[10px] text-white font-bold">{value}</div>
        {unit && <div className="text-[8px] text-[#666]">{unit}</div>}
      </div>
    </div>
  )
}

function WowMetricCard({ label, value, helper, tone }) {
  const tones = {
    green: 'from-[#10311f] to-[#0e1712] border-[#1d6c3d] text-[#5def95]',
    blue: 'from-[#10273d] to-[#0f151d] border-[#275d92] text-[#72c8ff]',
    amber: 'from-[#34260e] to-[#17120d] border-[#8a6421] text-[#f8c767]',
    purple: 'from-[#26183a] to-[#121019] border-[#5c3ea1] text-[#c69bff]',
  }
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${tones[tone] || tones.green}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">{label}</div>
      <div className="mt-2 text-[28px] font-black leading-none text-white" style={{ fontFamily: "'Arial Black'" }}>
        {value}
      </div>
      <div className="mt-2 text-[11px] leading-relaxed text-white/65">{helper}</div>
    </div>
  )
}

function CompressorCard({ label, data, time, desiredFlow, actualFlow, registers }) {
  const rpm = data['Compressor Speed'] || data['Driver Speed']
  const shutdown = data['Skid - Shutdown']
  const isRunning = rpm && parseFloat(rpm.value) > 100 && !(shutdown && String(shutdown.value).toLowerCase().includes('shutdown'))
  const visibleRegisters = registers.filter(meta => meta.label !== 'Flow Rate PID PV')
  const desiredFlowValue = formatFlowValue(desiredFlow?.value)
  const actualFlowValue = formatFlowValue(actualFlow?.value)
  return (
    <div className="bg-[#111118] rounded-xl border border-[#222] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-[#22c55e] shadow-lg shadow-[#22c55e]/50' : 'bg-[#E8200C]'}`} />
        <h3 className="text-[13px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>{label}</h3>
        <span className={`text-[9px] font-bold ml-auto ${isRunning ? 'text-[#22c55e]' : 'text-[#E8200C]'}`}>
          {isRunning ? 'RUNNING' : 'STOPPED'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <DataPoint label="Desired Flow" value={desiredFlowValue} unit={desiredFlow?.units || 'MMSCFD'} color="#4fc3f7" compact />
        <DataPoint label="Actual Flow" value={actualFlowValue} unit={actualFlow?.units || 'MMSCFD'} color={getCompressorColor('Flow Rate PID PV', actualFlow?.value)} compact />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {visibleRegisters.map(meta => (
          <DataPoint
            key={meta.id}
            label={meta.label}
            value={formatLiveRegisterValue(meta, meta.datapoint)}
            unit={meta.datapoint.units || getCompressorUnit(meta.label)}
            color={getCompressorColor(meta.label, meta.datapoint.value)}
          />
        ))}
      </div>
      {time && <div className="text-[8px] text-[#444] mt-2 text-right">Updated: {time.toLocaleString()}</div>}
    </div>
  )
}

function LivePerformanceHero({ metrics, wells, timestamp }) {
  const headline = metrics.currentMatch != null && metrics.currentMatch >= 97
    ? 'Running Tight. Running On Target.'
    : metrics.currentMatch != null && metrics.currentMatch >= 93
      ? 'Pad Logic Is Holding This Pad In Tight Balance.'
      : 'Live Field Data Is Tracking In Real Time.'

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-[#1c2d21] bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_rgba(8,8,16,0.95)_45%),linear-gradient(135deg,_#10151d,_#090b12)] shadow-[0_0_50px_rgba(34,197,94,0.08)]">
      <div className="grid gap-5 p-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border border-[#20502d] bg-[#0e1e13] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66f0a0]">
              Live Performance Proof
            </span>
            {timestamp && <span className="text-[10px] text-[#6b7280]">Snapshot {timestamp.toLocaleString()}</span>}
          </div>
          <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#ff6b57]">
            Does your SCADA do this?
          </div>
          <h2 className="text-[30px] font-black leading-none text-white" style={{ fontFamily: "'Arial Black'" }}>
            {headline}
          </h2>
          <p className="mt-2 max-w-[680px] text-[13px] leading-relaxed text-[#a0a7b5]">
            This is actual live data from a running location right now. See how tightly this pad is operating:
            actual well injection riding on top of desired injection, compressors carrying commanded flow, and the historical time spent
            below target exposed in plain sight.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <WowMetricCard
              label="Live Injection Match"
              value={formatPercent(metrics.currentMatch, 1)}
              tone="green"
              helper={metrics.totalDesired ? `${metrics.totalActual?.toFixed(3)} actual vs ${metrics.totalDesired.toFixed(3)} desired` : 'Waiting on desired-rate tags'}
            />
            <WowMetricCard
              label="Wells On Target"
              value={metrics.wellsAtTarget != null ? `${metrics.wellsAtTarget}/4` : '--'}
              tone="blue"
              helper="Within 3% of desired injection"
            />
            <WowMetricCard
              label="30-Day Under Target"
              value={formatPercent(metrics.historicalUnderTarget, 1)}
              tone={metrics.historicalUnderTarget != null && metrics.historicalUnderTarget <= 8 ? 'green' : 'amber'}
              helper="Time spent not meeting desired injection"
            />
            <WowMetricCard
              label="Compressor Flow Match"
              value={formatPercent(metrics.compressorMatch, 1)}
              tone="purple"
              helper="Desired flow vs actual compressor flow"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#1c2836] bg-[#0a0f17]/90 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9db2ce]">Actual vs Desired By Well</span>
            <span className="text-[10px] text-[#5e6b80]">Live target tracking</span>
          </div>
          <div className="space-y-3">
            {wells.map((well) => (
              <div key={well.wellNumber} className="rounded-xl border border-[#15202d] bg-[#0b1119] p-3">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-white">Well {well.wellNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${well.atTarget ? 'bg-[#0d2d18] text-[#58e68f]' : 'bg-[#33260c] text-[#f7c65d]'}`}>
                      {well.atTarget ? 'On Target' : 'Chasing'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#8d97a8]">{formatPercent(well.matchPct, 1)} match</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-[11px]">
                  <div className="pt-1">
                    <div className="h-2 overflow-hidden rounded-full bg-[#14202c]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#4fc3f7]" style={{ width: `${Math.max(0, Math.min(100, well.matchPct ?? 0))}%` }} />
                    </div>
                  </div>
                  <span className="font-bold text-[#22c55e]">{formatFlow(well.actual)}</span>
                  <span className="text-[#8d97a8]">of {formatFlow(well.desired)}</span>
                </div>
                <div className="mt-1 text-[10px] text-[#697386]">
                  Gap {formatSignedFlow(well.gap)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── countdown badge ───────────────────────────────────────────────────────────

function RefreshCountdown({ secondsLeft, loading, onRefresh }) {
  const pct = Math.round((secondsLeft / REFRESH_INTERVAL_S) * 100)
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2a3a] bg-[#111120] hover:bg-[#1a1a2a] disabled:opacity-50 transition-colors"
      title="Click to refresh now"
    >
      <svg width="16" height="16" viewBox="0 0 36 36" className="shrink-0 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#1a2a1a" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15" fill="none" stroke="#22c55e" strokeWidth="3"
          strokeDasharray={`${2 * Math.PI * 15}`}
          strokeDashoffset={`${2 * Math.PI * 15 * (1 - pct / 100)}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span className="text-[10px] text-[#888]">
        {loading ? 'Loading…' : `Refreshes in ${secondsLeft}s`}
      </span>
    </button>
  )
}

// ─── main component ────────────────────────────────────────────────────────────

export default function PublicLiveView() {
  const [panelData, setPanelData] = useState(null)
  const [compAData, setCompAData] = useState(null)
  const [compBData, setCompBData] = useState(null)
  const [registerCatalog, setRegisterCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [liveError, setLiveError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_S)
  const klondike = useKlondikeData()

  const refresh = useCallback(async () => {
    setLoading(true)
    setLiveError('')
    const [panelResult, compAResult, compBResult] = await Promise.all([
      fetchDevice(LIVE_DATA_DEVICES.panel),
      fetchDevice(LIVE_DATA_DEVICES.compA),
      fetchDevice(LIVE_DATA_DEVICES.compB),
    ])
    setPanelData(panelResult.data)
    setCompAData(compAResult.data)
    setCompBData(compBResult.data)
    const errors = [panelResult.error, compAResult.error, compBResult.error].filter(Boolean)
    if (!panelResult.data && !compAResult.data && !compBResult.data) {
      setLiveError(
        errors.length > 0
          ? `No live MLINK data available right now. ${errors.join(' | ')}`
          : 'No live MLINK data available right now. Check field comms.',
      )
    }
    setLastRefresh(new Date())
    setLoading(false)
    setCountdown(REFRESH_INTERVAL_S)
  }, [])

  // Initial load + auto-refresh every REFRESH_INTERVAL_S seconds
  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, REFRESH_INTERVAL_S * 1000)
    return () => clearInterval(interval)
  }, [refresh])

  // Countdown ticker
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : REFRESH_INTERVAL_S))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    loadAwiRegisterCatalog().then(setRegisterCatalog).catch(() => {})
  }, [])

  // ─── derived data ───────────────────────────────────────────────────────────
  const panel = parseLiveDatapoints(panelData)
  const compA = parseLiveDatapoints(compAData)
  const compB = parseLiveDatapoints(compBData)
  const panelTime = getTimestamp(panelData)
  const compATime = getTimestamp(compAData)
  const latestHistoryRow = klondike.data?.[klondike.data.length - 1]

  const visibleRegisters = getVisibleLiveRegisters(panel, registerCatalog, {})
  const visibleCompressorARegisters = getVisibleCompressorRegisters(compA, {})
  const visibleCompressorBRegisters = getVisibleCompressorRegisters(compB, {})
  const hourMeterRegister = visibleRegisters.find(meta => meta.label === 'Hour Meter')
  const additionalWellRegisters = LIVE_WELL_FLOW_KEYS.map((_, index) =>
    visibleRegisters.filter(meta => (
      meta.groupId === `well-${index + 1}`
      && !meta.label.endsWith('Injection Gas Flow Rate')
      && !meta.label.endsWith('Yesterdays Flow')
    )),
  )
  const compressorDesiredDatapoints = COMPRESSOR_DESIRED_FLOW_KEYS.map((keys, index) =>
    resolvePreferredDatapoint(panel, [
      ...keys,
      `Compressor ${index + 1} Desire Flow SP For PID Murphy`,
      `Compressor ${index + 1} Desired Flow SP For PID Murphy`,
    ]),
  )
  const compressorActualFlowDatapoints = [compA, compB].map((compressorData) =>
    resolvePreferredDatapoint(compressorData, [
      'Flow Rate PID PV',
      'Flow Rate PV',
      'Flow PID PV',
      'Compressor Flow Rate PID PV',
    ]),
  )
  const liveWellPerformance = LIVE_WELL_FLOW_KEYS.map((keys, index) => {
    const wellNumber = index + 1
    const actual = parseLiveNumeric(getFirstDatapoint(panel, keys)?.value)
    const desiredDatapoint = resolvePreferredDatapoint(panel, [
      `Wellhead #${wellNumber} Calculated Desired Flow`,
      `Wellhead #${wellNumber} Setpoint From Customer PLC`,
      `Well ${wellNumber} Calculated Desired Flow`,
      `Well ${wellNumber} Setpoint From Customer PLC`,
    ])
    const historicalDesired = latestHistoryRow?.wells?.[index]?.desiredInjectionRateMmscfd
      ?? latestHistoryRow?.wells?.[index]?.setpointMmscfd
    const desired = parseLiveNumeric(desiredDatapoint?.value) ?? historicalDesired ?? null
    const gap = actual != null && desired != null ? actual - desired : null
    return {
      wellNumber,
      actual,
      desired,
      gap,
      matchPct: computeMatchPct(actual, desired),
      atTarget: isWithinTarget(actual, desired),
    }
  })
  const liveCompressorPerformance = [compA, compB].map((compressorData, index) => ({
    desired: parseLiveNumeric(compressorDesiredDatapoints[index]?.value)
      ?? latestHistoryRow?.[`comp${index + 1}DesiredFlow`]
      ?? null,
    actual: parseLiveNumeric(compressorActualFlowDatapoints[index]?.value),
  }))
  const validWells = liveWellPerformance.filter(well => well.actual != null && well.desired != null)
  const historicalStats = buildHistoricalWellStats(klondike.data)
  const historicalAtTarget = average(historicalStats.map(stat => stat.atTargetPct))
  const wowMetrics = {
    totalActual: validWells.reduce((sum, well) => sum + well.actual, 0),
    totalDesired: validWells.reduce((sum, well) => sum + well.desired, 0),
    currentMatch: average(validWells.map(well => well.matchPct)),
    wellsAtTarget: validWells.filter(well => well.atTarget).length,
    historicalAtTarget,
    historicalUnderTarget: historicalAtTarget != null ? Math.max(0, 100 - historicalAtTarget) : null,
    compressorMatch: average(liveCompressorPerformance.map(comp => computeMatchPct(comp.actual, comp.desired))),
  }

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-[#080810]">
      {/* Minimal public header — no navigation links */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-lg shadow-[#22c55e]/60 animate-pulse" />
          <div>
            <div className="text-[13px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>
              Live Field Data — West Texas
            </div>
            <div className="text-[10px] text-[#666]">
              Active Pad Logic panel · read-only public view
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[9px] text-[#555] hidden sm:inline">
              Last update: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <RefreshCountdown secondsLeft={countdown} loading={loading} onRefresh={refresh} />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5 sm:p-6">
        <div className="max-w-[1280px] mx-auto">
          {loading && !panelData ? (
            <div className="text-center py-24 text-[#888] text-sm">Connecting to field unit…</div>
          ) : (
            <>
              {liveError && (
                <div className="mb-4 rounded-lg border border-[#5a1d1d] bg-[#1f0c0c] px-4 py-3 text-[11px] text-[#fca5a5]">
                  {liveError}
                </div>
              )}

              <LivePerformanceHero metrics={wowMetrics} wells={liveWellPerformance} timestamp={panelTime} />

              {/* Panel status bar */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-[#22c55e] shadow-lg shadow-[#22c55e]/50" />
                <span className="text-[13px] text-[#22c55e] font-bold">ONLINE — Panel Active</span>
                <div className="ml-auto flex items-center gap-3">
                  <span className="rounded-full border border-[#2f2f40] bg-[#111120] px-2 py-0.5 text-[8px] uppercase tracking-[0.18em] text-[#777]">
                    Hour Meter <span className="ml-1 text-[10px] text-white font-bold normal-case tracking-normal">{formatHourMeterValue(hourMeterRegister?.datapoint?.value ?? panel['\t Hour Meter']?.value ?? panel['Hour Meter']?.value)}</span>
                  </span>
                  {panelTime && <span className="text-[10px] text-[#555]">Data from: {panelTime.toLocaleString()}</span>}
                </div>
              </div>

              {/* Well Injection Flow Rates */}
              <div className="bg-[#111118] rounded-xl border border-[#222] p-5 mb-4">
                <h2 className="text-sm text-white font-bold mb-4" style={{ fontFamily: "'Arial Black'" }}>
                  Well Injection Flow Rates
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {LIVE_WELL_FLOW_KEYS.map((keys, i) => {
                    const dp = getFirstDatapoint(panel, keys)
                    const val = dp ? parseFloat(dp.value) : null
                    const yesterdayDp = getFirstDatapoint(panel, LIVE_WELL_YESTERDAY_KEYS[i])
                    const yesterdayVal = yesterdayDp ? parseFloat(yesterdayDp.value) : latestHistoryRow?.wells?.[i]?.yesterdayTotal
                    const maxFlow = 1.2
                    const widthPct = val != null && !Number.isNaN(val) ? Math.max(0, Math.min(100, (val / maxFlow) * 100)) : 0
                    return (
                      <div key={i} className="bg-[#0a0a14] rounded-lg border border-[#2a2a3a] p-4 text-center">
                        <div className="text-[10px] text-[#888] mb-1">Well {i + 1}</div>
                        <div className="text-2xl text-[#22c55e] font-bold mb-2" style={{ fontFamily: "'Arial Black'" }}>
                          {val != null && !Number.isNaN(val) ? val.toFixed(3) : '--'}
                        </div>
                        <div className="text-[9px] text-[#888]">MMSCFD</div>
                        <div className="w-full bg-[#1a1a2a] rounded h-2 mt-2 overflow-hidden">
                          <div className="h-full bg-[#22c55e] rounded transition-all" style={{ width: `${widthPct}%` }} />
                        </div>
                        <div className="mt-3 pt-2 border-t border-[#1a1a2a]">
                          <div className="text-[8px] text-[#666] uppercase tracking-wider">Yesterday Flow</div>
                          <div className="text-[12px] text-white font-bold mt-0.5" style={{ fontFamily: "'Arial Black'" }}>
                            {yesterdayVal != null && !Number.isNaN(yesterdayVal) ? yesterdayVal.toFixed(3) : '--'}
                          </div>
                          <div className="text-[8px] text-[#666]">MMSCFD</div>
                        </div>
                        {additionalWellRegisters[i].length > 0 && (
                          <div className="mt-3 pt-2 border-t border-[#1a1a2a] space-y-1.5 text-left">
                            {additionalWellRegisters[i].map(meta => (
                              <LiveRegisterRow
                                key={meta.id}
                                label={meta.label}
                                value={formatLiveRegisterValue(meta, meta.datapoint)}
                                unit={meta.datapoint.units}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 text-center">
                  <span className="text-[#888] text-[11px]">Total Injection: </span>
                  <span className="text-white font-bold text-[14px]" style={{ fontFamily: "'Arial Black'" }}>
                    {LIVE_WELL_FLOW_KEYS
                      .reduce((sum, keys) => {
                        const dp = getFirstDatapoint(panel, keys)
                        return sum + (dp ? parseFloat(dp.value) : 0)
                      }, 0).toFixed(3)} MMSCFD
                  </span>
                </div>
              </div>

              {/* Compressors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <CompressorCard
                  label="Compressor A"
                  data={compA}
                  time={compATime}
                  desiredFlow={compressorDesiredDatapoints[0]}
                  actualFlow={compressorActualFlowDatapoints[0]}
                  registers={visibleCompressorARegisters}
                />
                <CompressorCard
                  label="Compressor B"
                  data={compB}
                  time={getTimestamp(compBData)}
                  desiredFlow={compressorDesiredDatapoints[1]}
                  actualFlow={compressorActualFlowDatapoints[1]}
                  registers={visibleCompressorBRegisters}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer — no links */}
      <footer className="px-5 py-3 bg-[#0c0c16] border-t border-[#1a1a2a] text-center">
        <span className="text-[9px] text-[#444]">WellLogic™ Simulator · Read-only public view · Data refreshes every 5 minutes</span>
      </footer>
    </div>
  )
}
