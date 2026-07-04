import { useState, useEffect, useCallback } from 'react'
import {
  findRegisterDatapoint,
  getVisibleCompressorRegisters,
  formatLiveRegisterValue,
  getVisibleLiveRegisters,
  loadAwiRegisterCatalog,
  parseLiveDatapoints,
} from '../engine/liveRegisters'

// Public read-only live MLink dashboard — Supreme COP pad — no auth required
// Exact feature parity with HalfmannLiveView; assets swapped for ConocoPhillips Supreme.

const API_BASE = import.meta.env.VITE_API_URL || ''
const REFRESH_INTERVAL_S = 60
const FRESH_DATA_MAX_AGE_MS = 5 * 60 * 1000

// ─── Supreme asset keys ────────────────────────────────────────────────────────

const SUPREME_ASSETS = {
  panel: 'panel',
  unit2139: 'unit2139',
  unit2140: 'unit2140',
}

const SUPREME_UNITS = [
  { key: 'unit2139', label: 'Comp #1 · Unit 2139', asset: SUPREME_ASSETS.unit2139 },
  { key: 'unit2140', label: 'Comp #2 · Unit 2140', asset: SUPREME_ASSETS.unit2140 },
]

// Supreme DE4000 well register key aliases.

const LIVE_WELL_FLOW_KEYS = [
  ['Well 1 Injection Gas Flow Rate', 'Well #1 Flow Rate'],
  ['Well 2 Injection Gas Flow Rate', 'Well #2 Flow Rate'],
  ['Well 3 Injection Gas Flow Rate', 'Well #3 Flow Rate'],
  ['Well 4 Injection Gas Flow Rate', 'Well #4 Flow Rate'],
  ['Well 5 Injection Gas Flow Rate', 'Well #5 Flow Rate'],
  ['Well 6 Injection Gas Flow Rate', 'Well #6 Flow Rate'],
]

const LIVE_WELL_YESTERDAY_KEYS = [
  ['Wellhead #1 Yesterdays Total Flow', 'Well 1 Yesterdays Total Flow'],
  ['Wellhead #2 Yesterdays Total Flow', 'Well 2 Yesterdays Total Flow'],
  ['Wellhead #3 Yesterdays Total Flow', 'Well 3 Yesterdays Total Flow'],
  ['Wellhead #4 Yesterdays Total Flow', 'Well 4 Yesterdays Total Flow'],
  ['Wellhead #5 Yesterdays Total Flow', 'Well 5 Yesterdays Total Flow'],
  ['Wellhead #6 Yesterdays Total Flow', 'Well 6 Yesterdays Total Flow'],
]

const SUPREME_WELLS = [
  { physical: '607H', gasPriority: 1, oilPriority: 1, active: true },
  { physical: '606H', gasPriority: 2, oilPriority: 2, active: true },
  { physical: '605H', gasPriority: 3, oilPriority: 3, active: true },
  { physical: 'Future', gasPriority: null, oilPriority: null, active: false },
  { physical: 'Future', gasPriority: null, oilPriority: null, active: false },
  { physical: 'Future', gasPriority: null, oilPriority: null, active: false },
]

// ─── fetch helpers ─────────────────────────────────────────────────────────────

async function readErrorPayload(res) {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await res.json().catch(() => ({}))
    return body?.details || body?.error || res.statusText
  }
  return (await res.text().catch(() => '')).trim() || res.statusText
}

async function fetchSupremeDeviceFull(asset) {
  try {
    const res = await fetch(`${API_BASE}/api/mlink/supreme/device?asset=${encodeURIComponent(asset)}`)
    if (!res.ok) {
      return { data: null, error: `Supreme ${asset}: ${await readErrorPayload(res)}` }
    }
    return { data: await res.json(), error: '' }
  } catch (err) {
    return { data: null, error: `Supreme ${asset}: ${err.message}` }
  }
}

async function fetchDemandEvents() {
  try {
    const res = await fetch(`${API_BASE}/api/mlink/supreme/demand-events?limit=25`)
    if (!res.ok) return []
    const body = await res.json()
    return Array.isArray(body.events) ? body.events : []
  } catch {
    return []
  }
}

function getTimestamp(data, idx = 0) {
  if (!data?.timestamps?.[idx]) return null
  return new Date(data.timestamps[idx] * 1000)
}

// ─── numeric / display helpers ────────────────────────────────────────────────

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

function getNumeric(dataMap, labels) {
  return parseLiveNumeric(resolvePreferredDatapoint(dataMap, labels)?.value)
}

function computeMatchPct(actual, desired) {
  if (actual == null || desired == null || desired <= 0) return null
  return Math.max(0, 100 - (Math.abs(actual - desired) / desired) * 100)
}

function isWithinTarget(actual, desired) {
  if (actual == null || desired == null || desired <= 0) return false
  return actual >= desired * 0.98
}

function average(values) {
  const valid = values.filter(v => v != null && Number.isFinite(v))
  if (!valid.length) return null
  return valid.reduce((sum, v) => sum + v, 0) / valid.length
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

function isFreshTimestamp(time) {
  return time instanceof Date && Number.isFinite(time.getTime()) && Date.now() - time.getTime() <= FRESH_DATA_MAX_AGE_MS
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

// ─── sub-components ───────────────────────────────────────────────────────────

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
    green:  'from-[#10311f] to-[#0e1712] border-[#1d6c3d] text-[#5def95]',
    blue:   'from-[#10273d] to-[#0f151d] border-[#275d92] text-[#72c8ff]',
    amber:  'from-[#34260e] to-[#17120d] border-[#8a6421] text-[#f8c767]',
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
  const isFresh = isFreshTimestamp(time)
  const rpm = data['Compressor Speed'] || data['Driver Speed'] || data['RPM']
  const shutdown = data['Skid - Shutdown']
  const isShutdown = shutdown && String(shutdown.value).toLowerCase().includes('shutdown')
  const hasRpm = rpm && parseFloat(rpm.value) > 100
  const hasFlow = actualFlow != null && parseFloat(actualFlow.value) > 0.01
  const hasLiveStatus = hasRpm || hasFlow || isShutdown
  const isRunning = isFresh && hasLiveStatus && (hasRpm || hasFlow) && !isShutdown
  const statusLabel = !time ? 'LIVE STATUS UNAVAILABLE' : !isFresh ? 'STALE DATA' : hasLiveStatus ? (isRunning ? 'RUNNING' : 'STOPPED') : 'LIVE STATUS UNAVAILABLE'
  const visibleRegisters = registers.filter(meta => (
    meta.label !== 'Flow Rate PID PV'
    && meta.datapoint
    && meta.datapoint.value != null
    && String(meta.datapoint.value).trim() !== ''
  ))
  const desiredFlowValue = formatFlowValue(desiredFlow?.value)
  const actualFlowValue = formatFlowValue(actualFlow?.value)
  return (
    <div className="bg-[#111118] rounded-xl border border-[#222] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-[#22c55e] shadow-lg shadow-[#22c55e]/50' : !time ? 'bg-[#555]' : !isFresh ? 'bg-[#f8c767]' : hasLiveStatus ? 'bg-[#E8200C]' : 'bg-[#555]'}`} />
        <h3 className="text-[13px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>{label}</h3>
        <span className={`text-[9px] font-bold ml-auto ${isRunning ? 'text-[#22c55e]' : !time ? 'text-[#888]' : !isFresh ? 'text-[#f8c767]' : hasLiveStatus ? 'text-[#E8200C]' : 'text-[#888]'}`}>
          {statusLabel}
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
      {!visibleRegisters.length && (
        <div className="mt-3 rounded border border-[#2a2a3a] bg-[#0a0a14] p-3 text-[10px] text-[#777]">
          No live compressor register values returned.
        </div>
      )}
      {time && <div className="text-[8px] text-[#444] mt-2 text-right">Updated: {time.toLocaleString()}</div>}
    </div>
  )
}

function LivePerformanceHero({ metrics, wells, timestamp, isLive }) {
  const activeWellCount = wells.filter(well => well.active !== false).length
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
              {isLive ? 'Live Performance Proof' : 'Live Data Pending'}
            </span>
            {timestamp && <span className="text-[10px] text-[#6b7280]">MLink timestamp {timestamp.toLocaleString()}</span>}
          </div>
          <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#ff6b57]">
            ConocoPhillips · Supreme · DE4000
          </div>
          <h2 className="text-[30px] font-black leading-none text-white" style={{ fontFamily: "'Arial Black'" }}>
            {headline}
          </h2>
          <p className="mt-2 max-w-[680px] text-[13px] leading-relaxed text-[#a0a7b5]">
            {isLive
              ? 'This is actual live data from the Supreme location. Actual injection is tracked against desired injection, with compressor flow and operating limits visible in one place.'
              : 'This Supreme-only field view displays live MLink values only. No static fallback values are shown.'}
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
              value={metrics.wellsAtTarget != null ? `${metrics.wellsAtTarget}/${activeWellCount}` : '--'}
              tone="blue"
              helper={metrics.wellsAtTarget != null ? 'Within 2% of desired injection' : 'Per-well targets not in API feed'}
            />
            <WowMetricCard
              label="Panel Feed"
              value={isLive ? 'Live' : 'Pending'}
              tone="amber"
              helper="Shows current MLink panel status only"
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
              <div key={well.wellNumber} className={`rounded-xl border p-3 ${well.active ? 'border-[#15202d] bg-[#0b1119]' : 'border-[#222633] bg-[#0b0d12] opacity-60'}`}>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-white">Well {well.wellNumber}</span>
                    {well.physical && <span className="text-[9px] text-[#7d8796]">{well.physical}</span>}
                    {!well.active && (
                      <span className="rounded-full bg-[#1a1d26] px-2 py-0.5 text-[9px] font-bold text-[#6b7280]">
                        Future/Inactive
                      </span>
                    )}
                    {well.active && well.desired != null && (
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${well.atTarget ? 'bg-[#0d2d18] text-[#58e68f]' : 'bg-[#33260c] text-[#f7c65d]'}`}>
                        {well.atTarget ? 'On Target' : 'Chasing'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#8d97a8]">{formatPercent(well.matchPct, 1)} match</span>
                </div>
                <div className={`gap-3 text-[11px] ${well.active && well.desired != null ? 'grid grid-cols-[1fr_auto_auto]' : 'flex items-center justify-between'}`}>
                  {well.active && well.desired != null && (
                    <div className="pt-1">
                      <div className="h-2 overflow-hidden rounded-full bg-[#14202c]">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#4fc3f7]" style={{ width: `${Math.max(0, Math.min(100, well.matchPct ?? 0))}%` }} />
                      </div>
                    </div>
                  )}
                  <span className="font-bold text-[#22c55e]">{formatFlow(well.actual)}</span>
                  {well.active && well.desired != null && <span className="text-[#8d97a8]">of {formatFlow(well.desired)}</span>}
                </div>
                {well.active && well.desired != null && (
                  <div className="mt-1 text-[10px] text-[#697386]">
                    Gap {formatSignedFlow(well.gap)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

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

// ─── Alert badge ──────────────────────────────────────────────────────────────

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

// ─���─ main component ────────────────────────────────────────────────────────────

function DemandEventLog({ events }) {
  const formatEventValue = (value, decimals = 3) =>
    value != null && Number.isFinite(Number(value)) ? Number(value).toFixed(decimals) : '--'

  return (
    <div className="bg-[#111118] rounded-xl border border-[#222] p-5 mb-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>
          Compressor Demand Change Log
        </h2>
        <span className="text-[9px] uppercase tracking-[0.18em] text-[#666]">
          Live panel changes only
        </span>
      </div>
      {events.length === 0 ? (
        <div className="rounded border border-[#2a2a3a] bg-[#0a0a14] p-3 text-[11px] text-[#777]">
          No compressor demand changes have been recorded from live Supreme panel data yet.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={`${event.timestamp}-${index}`} className="rounded-lg border border-[#2a2a3a] bg-[#0a0a14] p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[12px] font-bold text-white">
                  {new Date(event.timestamp).toLocaleString()}
                </div>
                <div className="flex gap-2 text-[10px]">
                  <span className="rounded border border-[#1f3650] bg-[#0b1520] px-2 py-1 text-[#72c8ff]">
                    C1 Demand {formatEventValue(event.demand?.comp1)} MMSCFD
                  </span>
                  <span className="rounded border border-[#1f3650] bg-[#0b1520] px-2 py-1 text-[#72c8ff]">
                    C2 Demand {formatEventValue(event.demand?.comp2)} MMSCFD
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {(event.wells || []).map(well => (
                  <div key={well.wellNumber} className="rounded border border-[#1f2430] bg-[#090913] p-2">
                    <div className="text-[9px] font-bold text-white">Well {well.wellNumber} · {well.physical}</div>
                    <div className="mt-1 text-[9px] text-[#888]">
                      Static <span className="text-white">{formatEventValue(well.staticPressure, 0)}</span> PSI
                    </div>
                    <div className="text-[9px] text-[#888]">
                      Flow <span className="text-white">{formatEventValue(well.flowRate)}</span> MMSCFD
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SupremeLiveView() {
  const [panelData, setPanelData] = useState(null)
  const [unitDataRaw, setUnitDataRaw] = useState({ unit2139: null, unit2140: null })
  const [registerCatalog, setRegisterCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [liveError, setLiveError] = useState('')
  const [demandEvents, setDemandEvents] = useState([])
  const [lastRefresh, setLastRefresh] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_S)
  const [padVisible, setPadVisible] = useState(true)

  // ─── pad visibility gate (non-admins see "not available" if hidden) ────���─────
  useEffect(() => {
    fetch(`${API_BASE}/api/public/pad-visibility`)
      .then(res => res.ok ? res.json() : null)
      .then(body => { if (body && body.supreme === false) setPadVisible(false) })
      .catch(() => {})
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setLiveError('')
    const [panelResult, ...unitResults] = await Promise.all([
      fetchSupremeDeviceFull(SUPREME_ASSETS.panel),
      ...SUPREME_UNITS.map(u => fetchSupremeDeviceFull(u.asset)),
    ])
    setPanelData(panelResult.data)
    const newUnitData = {}
    SUPREME_UNITS.forEach((u, i) => { newUnitData[u.key] = unitResults[i].data })
    setUnitDataRaw(newUnitData)

    const allErrors = [panelResult.error, ...unitResults.map(r => r.error)].filter(Boolean)
    const allNull = !panelResult.data && unitResults.every(r => !r.data)
    if (allNull) {
      setLiveError(allErrors.length > 0
        ? `MLink is not returning Supreme live data right now. ${allErrors.join(' | ')}`
        : 'MLink is not returning Supreme live data right now.')
    }
    setLastRefresh(new Date())
    fetchDemandEvents().then(setDemandEvents).catch(() => {})
    setLoading(false)
    setCountdown(REFRESH_INTERVAL_S)
  }, [])

  useEffect(() => {
    const initial = setTimeout(refresh, 0)
    const interval = setInterval(refresh, REFRESH_INTERVAL_S * 1000)
    return () => {
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [refresh])

  useEffect(() => {
    const tick = setInterval(() => setCountdown(c => (c > 0 ? c - 1 : REFRESH_INTERVAL_S)), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    loadAwiRegisterCatalog().then(setRegisterCatalog).catch(() => {})
  }, [])

  // ─── derived data ───────────────────────────────────────────────────────────
  const panel = parseLiveDatapoints(panelData)
  const panelTime = getTimestamp(panelData)
  const hasLivePanelData = !!panelData
  const hasFreshPanelData = isFreshTimestamp(panelTime)
  const hasAnyLiveData = !!panelData || Object.values(unitDataRaw).some(Boolean)

  // Parse each unit into a dataMap
  const unitDataMaps = SUPREME_UNITS.map(u => parseLiveDatapoints(unitDataRaw[u.key]))

  // Compressor desired/actual flow — check panel first (it may carry the SP), then the unit itself
  const unitDesiredFlows = SUPREME_UNITS.map((u, i) =>
    resolvePreferredDatapoint(panel, [
      `Compressor #${i + 1} Desire Flow SP For PID Murphy`,
      `Compressor ${i + 1} Desire Flow SP For PID Murphy`,
      `Compressor #${i + 1} Desired Flow SP For PID Murphy`,
    ]) ??
    resolvePreferredDatapoint(unitDataMaps[i], [
      'Compressor #1 Desire Flow SP For PID Murphy',
      'Desire Flow SP For PID Murphy',
      'Desired Flow SP For PID Murphy',
      'Flow Rate PID SP',
    ])
  )
  const unitActualFlows = unitDataMaps.map(dataMap =>
    resolvePreferredDatapoint(dataMap, [
      'Flow Rate PID PV',
      'Flow Rate PV',
      'Flow PID PV',
      'Compressor Flow Rate PID PV',
    ])
  )

  const visibleRegisters = getVisibleLiveRegisters(panel, registerCatalog, {})
  const hourMeterRegister = visibleRegisters.find(meta => meta.label === 'Hour Meter')
  const additionalWellRegisters = LIVE_WELL_FLOW_KEYS.map((_, index) =>
    visibleRegisters.filter(meta => (
      meta.groupId === `well-${index + 1}`
      && !meta.label.endsWith('Injection Gas Flow Rate')
      && !meta.label.endsWith('Yesterdays Flow')
      && meta.datapoint
      && meta.datapoint.value != null
      && String(meta.datapoint.value).trim() !== ''
    ))
  )

  // Per-well injection performance
  const liveWellPerformance = LIVE_WELL_FLOW_KEYS.map((keys, index) => {
    const wellNumber = index + 1
    const wellMeta = SUPREME_WELLS[index]
    const actual = parseLiveNumeric(resolvePreferredDatapoint(panel, keys)?.value)
    const desiredDatapoint = resolvePreferredDatapoint(panel, [
      `Wellhead #${wellNumber} Injection Flow Rate From Customer PLC`,
      `Well ${wellNumber} Injection Flow Rate From Customer PLC`,
      `Wellhead #${wellNumber} Calculated Desired Flow`,
      `Wellhead #${wellNumber} Setpoint From Customer PLC`,
      `Well ${wellNumber} Calculated Desired Flow`,
      `Well ${wellNumber} Setpoint From Customer PLC`,
    ])
    const desired = wellMeta?.active ? parseLiveNumeric(desiredDatapoint?.value) : 0
    const displayActual = wellMeta?.active ? actual : 0
    const gap = displayActual != null && desired != null ? displayActual - desired : null
    return {
      wellNumber,
      physical: wellMeta?.physical,
      gasPriority: wellMeta?.gasPriority,
      oilPriority: wellMeta?.oilPriority,
      active: wellMeta?.active !== false,
      actual: displayActual,
      desired,
      gap: wellMeta?.active ? gap : null,
      matchPct: wellMeta?.active ? computeMatchPct(displayActual, desired) : null,
      atTarget: wellMeta?.active ? isWithinTarget(displayActual, desired) : false,
    }
  })

  // Compressor performance per unit
  const liveUnitPerformance = unitDesiredFlows.map((desiredDp, i) => ({
    desired: parseLiveNumeric(desiredDp?.value),
    actual: parseLiveNumeric(unitActualFlows[i]?.value),
  }))

  // Supreme panel publishes site-level desired flow and wells-meeting-rate directly when tags are available.
  const totalDesiredSite = parseLiveNumeric(
    resolvePreferredDatapoint(panel, ['Total Desired Site Flow'])?.value
  )
  const wellsMeetingRateRaw = resolvePreferredDatapoint(panel, ['Wells Meeting Rate', 'All Wells Meeting Rate'])
  const wellsMeetingRate = wellsMeetingRateRaw != null
    ? Math.round(parseLiveNumeric(wellsMeetingRateRaw.value) ?? 0)
    : null
  const totalActualFlowFromWells = liveWellPerformance.reduce((sum, w) => sum + (w.actual ?? 0), 0)
  const totalActualFlow = totalActualFlowFromWells
  const padMatchPct = totalDesiredSite != null && totalDesiredSite > 0
    ? Math.max(0, 100 - (Math.abs(totalActualFlow - totalDesiredSite) / totalDesiredSite) * 100)
    : null

  const activeWellPerformance = liveWellPerformance.filter(w => w.active)
  const validWells = activeWellPerformance.filter(w => w.actual != null && w.desired != null)
  const perWellTarget = totalDesiredSite != null && activeWellPerformance.length > 0
    ? totalDesiredSite / activeWellPerformance.length
    : null
  const wellsAtTargetCount = wellsMeetingRate
    ?? (validWells.length > 0 ? validWells.filter(w => w.atTarget).length : null)
    ?? (perWellTarget != null
      ? activeWellPerformance.filter(w => w.actual != null && isWithinTarget(w.actual, perWellTarget)).length
      : null)
  const wowMetrics = {
    totalActual:  totalActualFlow,
    totalDesired: totalDesiredSite,
    currentMatch: padMatchPct,
    wellsAtTarget: wellsAtTargetCount,
    historicalAtTarget: null,
    historicalUnderTarget: null,
    compressorMatch: average(liveUnitPerformance.map(u => computeMatchPct(u.actual, u.desired))),
  }

  // ── Alert data ──────────────────────────────────────────────────────────────

  // Recycle valve
  const recycleVal = getNumeric(panel, [
    'Recycle Valve Position', 'Recycle Valve', 'Recycle Valve %',
    'Recirc Valve Position', 'Recirc Valve %',
    'Station Recycle Valve Position', 'Station Recycle Valve', 'RCV Position',
  ])

  // Per-well pressures
  const wellCasingPres = LIVE_WELL_FLOW_KEYS.map((_, i) => {
    const n = i + 1
    return getNumeric(panel, [
      `Well ${n} Casing Pressure`, `Well #${n} Casing Pressure`,
      `Wellhead #${n} Casing Pressure`, `Wellhead ${n} Casing Pressure`,
    ])
  })
  const wellTubingPres = LIVE_WELL_FLOW_KEYS.map((_, i) => {
    const n = i + 1
    return getNumeric(panel, [
      `Well ${n} Tubing Pressure`, `Well #${n} Tubing Pressure`,
      `Wellhead #${n} Tubing Pressure`, `Wellhead ${n} Tubing Pressure`,
    ])
  })
  const wellStaticPres = LIVE_WELL_FLOW_KEYS.map((_, i) => {
    const n = i + 1
    return getNumeric(panel, [
      `Wellhead #${n} Injection Static Pressure From Customer PLC`,
      `Well ${n} Injection Static Pressure`, `Well #${n} Injection Static Pressure`,
      `Wellhead #${n} Injection Static Pressure`, `Well ${n} Static Pressure`,
    ])
  })

  // Discharge trigger setpoint from panel — try all known name variants
  const dischargeTriggerSP = getNumeric(panel, [
    'Altronic Discharge Pressure Trigger', 'Discharge Pressure Trigger Setpoint',
    'Discharge Trigger Setpoint', 'Discharge Trigger', 'Altronic Discharge SP',
    'Speed Auto Discharge SP', 'Discharge SP',
  ])

  // Speed Control SP per compressor from unit devices
  const compSpeedControlSP = unitDataMaps.map(dataMap =>
    getNumeric(dataMap, ['Speed Control SP', 'Altronic Speed Control SP', 'Speed Auto Discharge SP', 'Discharge Pressure SP', 'Speed SP'])
  )

  const liveProcessConditions = [
    { label: 'Suction Pressure', value: getNumeric(panel, ['Suction Pressure', 'Station Suction Pressure']), unit: 'PSI', decimals: 1, color: '#4fc3f7' },
    { label: 'Discharge Pressure', value: getNumeric(panel, ['Discharge Pressure', 'Station Discharge Pressure']), unit: 'PSI', decimals: 0, color: '#22c55e' },
    { label: 'Current PV Flow Rate', value: getNumeric(panel, ['Current PV Flow Rate', 'Flow Rate PID PV', 'Site Actual Flow']), unit: 'MMSCFD', decimals: 2, color: '#f8c767' },
    { label: 'Speed Control LVS Index', value: getNumeric(panel, ['Speed Control LVS Index']), unit: '', decimals: 0, color: '#9db2ce' },
    { label: 'Panel State', value: getNumeric(panel, ['Panel State']), unit: '', decimals: 0, color: '#9db2ce' },
    { label: 'Speed Suction SP', value: getNumeric(panel, ['Speed Suction SP', 'Speed Suction Setpoint']), unit: 'PSI', decimals: 0, color: '#9db2ce' },
    { label: 'Comp Discharge Slowdown SP', value: getNumeric(panel, ['Compressor Speed Discharge SP', 'Speed Auto Discharge SP']), unit: 'PSI', decimals: 0, color: '#9db2ce' },
  ].filter(item => item.value != null && Number.isFinite(item.value))

  // ── Alert statuses (pass / fail / gray) ─────────────────────────────────────
  const alertRecycle = recycleVal == null ? 'gray' : recycleVal > 0 ? 'fail' : 'pass'

  const alertWellFlow = liveWellPerformance.map(w => {
    if (w.actual == null) return 'gray'
    const target = w.desired ?? perWellTarget
    if (target == null || target <= 0) return 'gray'
    return ((target - w.actual) / target) <= 0.02 ? 'pass' : 'fail'
  })

  const alertStaticVsDischarge = dischargeTriggerSP == null ? 'gray'
    : wellStaticPres.some(p => p != null && p >= dischargeTriggerSP) ? 'fail' : 'pass'

  const alertSpeedControlSP = (() => {
    if (compSpeedControlSP.every(v => v == null)) return 'gray'
    const anyTriggered = unitDataMaps.some((dataMap, i) => {
      const dischPrs = getNumeric(dataMap, ['Stage 3 Discharge Prs', 'Discharge Pressure'])
      const sp = compSpeedControlSP[i]
      return sp != null && dischPrs != null && Math.abs(sp - dischPrs) < 10
    })
    return anyTriggered ? 'fail' : 'pass'
  })()

  const alertSiteFlow = totalDesiredSite == null || totalDesiredSite === 0 ? 'gray'
    : ((totalDesiredSite - totalActualFlow) / totalDesiredSite) <= 0.02 ? 'pass' : 'fail'

  const alertWellPres = LIVE_WELL_FLOW_KEYS.map((_, i) => {
    if (dischargeTriggerSP == null) return 'gray'
    const casing = wellCasingPres[i], tubing = wellTubingPres[i]
    if (casing == null && tubing == null) return 'gray'
    return (casing != null && casing >= dischargeTriggerSP) || (tubing != null && tubing >= dischargeTriggerSP)
      ? 'fail' : 'pass'
  })

  // ─── not available gate ───────────────────────────────────────────────────────
  if (!padVisible) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080810]">
        <div className="text-center">
          <div className="text-[15px] text-[#888]">This page is not currently available.</div>
        </div>
      </div>
    )
  }

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-[#080810]">
      <header className="flex items-center justify-between px-5 py-3 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${hasFreshPanelData ? 'bg-[#22c55e] shadow-lg shadow-[#22c55e]/60 animate-pulse' : hasLivePanelData ? 'bg-[#f8c767] shadow-lg shadow-[#f8c767]/40' : 'bg-[#555]'}`} />
          <div>
            <div className="text-[13px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>
              Live Field Data — Supreme COP
            </div>
            <div className="text-[10px] text-[#666]">
              ConocoPhillips · Supreme · DE4000 · Report SC-WP-SUP-001
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

      <div className="flex-1 overflow-auto p-5 sm:p-6">
        <div className="max-w-[1280px] mx-auto">
          {loading && !hasAnyLiveData ? (
            <div className="text-center py-24 text-[#888] text-sm">Connecting to field units…</div>
          ) : !hasAnyLiveData ? (
            <div className="mx-auto mt-20 max-w-[760px] rounded-xl border border-[#5a1d1d] bg-[#130c0c] p-6 text-center">
              <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[#E8200C]">
                Live Supreme Data Unavailable
              </div>
              <div className="text-[24px] font-black text-white" style={{ fontFamily: "'Arial Black'" }}>
                Waiting on MLink live feed
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-[#b9a0a0]">
                This page shows live MLink values only. No static fallback data is displayed.
              </p>
              {liveError && (
                <div className="mt-4 rounded border border-[#5a1d1d] bg-[#1f0c0c] px-4 py-3 text-left text-[11px] text-[#fca5a5]">
                  {liveError}
                </div>
              )}
              <div className="mt-5 flex justify-center">
                <RefreshCountdown secondsLeft={countdown} loading={loading} onRefresh={refresh} />
              </div>
            </div>
          ) : (
            <>
              {liveError && (
                <div className="mb-4 rounded-lg border border-[#5a1d1d] bg-[#1f0c0c] px-4 py-3 text-[11px] text-[#fca5a5]">
                  {liveError}
                </div>
              )}

              <LivePerformanceHero metrics={wowMetrics} wells={liveWellPerformance} timestamp={panelTime} isLive={hasLivePanelData} />

              {liveProcessConditions.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {liveProcessConditions.map(item => (
                    <DataPoint
                      key={item.label}
                      label={item.label}
                      value={item.value.toFixed(item.decimals)}
                      unit={item.unit}
                      color={item.color}
                      compact
                    />
                  ))}
                </div>
              )}

              <DemandEventLog events={demandEvents} />

              {/* ─── Site Alerts & Status ─────────────────────────────────── */}
              <div style={{ background: '#0c0c16', border: '1px solid #1a1a2a', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#49D0E2', marginBottom: '14px', fontFamily: "'Montserrat', sans-serif" }}>
                  Site Alerts &amp; Status
                </div>

                {/* Site-level */}
                <div style={{ fontSize: '9px', color: '#49D0E2', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: '8px' }}>Site</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  <AlertBadge label="Recycle Valve" status={alertRecycle}
                    value={recycleVal != null ? `${recycleVal.toFixed(1)}%` : '—'} />
                  <AlertBadge label="Site Flow Match" status={alertSiteFlow}
                    value={totalDesiredSite != null ? `${totalActualFlow.toFixed(3)} / ${totalDesiredSite.toFixed(3)} MMSCFD` : '—'} />
                  <AlertBadge label="Static vs Discharge" status={alertStaticVsDischarge}
                    value={dischargeTriggerSP != null ? `Trigger: ${dischargeTriggerSP.toFixed(0)} PSI` : '—'} />
                  <AlertBadge label="Speed Control SP" status={alertSpeedControlSP}
                    value={compSpeedControlSP.some(v => v != null)
                      ? compSpeedControlSP.map((v, i) => v != null ? `C${i+1}: ${v.toFixed(0)}` : null).filter(Boolean).join('  ')
                      : '—'} />
                </div>

                {/* Per-well flow */}
                <div style={{ fontSize: '9px', color: '#49D0E2', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: '8px' }}>Per-Well Flow (≥98% of Target)</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
                  {liveWellPerformance.map((w, i) => (
                    <AlertBadge key={i} label={`Well #${i+1} Flow`} status={alertWellFlow[i]}
                      value={w.actual != null ? `${w.actual.toFixed(3)} MMSCFD` : '—'} />
                  ))}
                </div>

                {/* Per-well pressure */}
                <div style={{ fontSize: '9px', color: '#49D0E2', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: '8px' }}>Per-Well Casing / Tubing vs Discharge</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {LIVE_WELL_FLOW_KEYS.map((_, i) => (
                    <AlertBadge key={i} label={`Well #${i+1} Pressure`} status={alertWellPres[i]}
                      value={wellCasingPres[i] != null ? `C: ${wellCasingPres[i].toFixed(0)} PSI` : wellTubingPres[i] != null ? `T: ${wellTubingPres[i].toFixed(0)} PSI` : '—'} />
                  ))}
                </div>
              </div>

              {/* Surface Equipment */}
              {recycleVal != null && (
                <div className="bg-[#111118] rounded-xl border border-[#222] px-5 py-3 mb-4">
                  <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.18em] text-[#49D0E2]">Surface Equipment</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <DataPoint
                      label="Recycle Valve Position"
                      value={`${recycleVal.toFixed(1)}%`}
                      color={recycleVal > 0 ? '#E8200C' : '#22c55e'}
                    />
                  </div>
                </div>
              )}

              {/* Panel status bar */}
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-3 h-3 rounded-full ${hasFreshPanelData ? 'bg-[#22c55e] shadow-lg shadow-[#22c55e]/50' : hasLivePanelData ? 'bg-[#f8c767] shadow-lg shadow-[#f8c767]/40' : 'bg-[#555]'}`} />
                <span className={`text-[13px] font-bold ${hasFreshPanelData ? 'text-[#22c55e]' : hasLivePanelData ? 'text-[#f8c767]' : 'text-[#888]'}`}>
                  {hasFreshPanelData ? 'ONLINE - Fresh MLink panel data' : hasLivePanelData ? 'STALE - MLink panel timestamp is old' : 'OFFLINE - No live MLink panel data'}
                </span>
                <div className="ml-auto flex items-center gap-3">
                  {(hourMeterRegister?.datapoint?.value ?? panel['\t Hour Meter']?.value ?? panel['Hour Meter']?.value) != null && (
                    <span className="rounded-full border border-[#2f2f40] bg-[#111120] px-2 py-0.5 text-[8px] uppercase tracking-[0.18em] text-[#777]">
                      Hour Meter <span className="ml-1 text-[10px] text-white font-bold normal-case tracking-normal">
                        {formatHourMeterValue(hourMeterRegister?.datapoint?.value ?? panel['\t Hour Meter']?.value ?? panel['Hour Meter']?.value)}
                      </span>
                    </span>
                  )}
                  {panelTime && <span className="text-[10px] text-[#555]">Data from: {panelTime.toLocaleString()}</span>}
                </div>
              </div>

              {/* Well Injection Flow Rates */}
              <div className="bg-[#111118] rounded-xl border border-[#222] p-5 mb-4">
                <h2 className="text-sm text-white font-bold mb-4" style={{ fontFamily: "'Arial Black'" }}>
                  Well Injection Flow Rates
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {LIVE_WELL_FLOW_KEYS.map((keys, i) => {
                    const wellMeta = SUPREME_WELLS[i]
                    const dp = resolvePreferredDatapoint(panel, keys)
                    const val = wellMeta.active ? (dp ? parseFloat(dp.value) : null) : 0
                    const yesterdayDp = resolvePreferredDatapoint(panel, LIVE_WELL_YESTERDAY_KEYS[i])
                    const yesterdayVal = wellMeta.active && yesterdayDp ? parseFloat(yesterdayDp.value) : null
                    const maxFlow = 1.2
                    const widthPct = val != null && !Number.isNaN(val) ? Math.max(0, Math.min(100, (val / maxFlow) * 100)) : 0
                    return (
                      <div key={i} className={`bg-[#0a0a14] rounded-lg border p-4 text-center ${wellMeta.active ? 'border-[#2a2a3a]' : 'border-[#202431] opacity-60'}`}>
                        <div className="text-[10px] text-[#888] mb-1">Well {i + 1}</div>
                        <div className="text-[9px] text-[#666] mb-1">{wellMeta.physical}</div>
                        {wellMeta.active && (
                          <div className="text-[8px] text-[#555] mb-2">Gas P{wellMeta.gasPriority} · Oil P{wellMeta.oilPriority}</div>
                        )}
                        <div className="text-2xl text-[#22c55e] font-bold mb-2" style={{ fontFamily: "'Arial Black'" }}>
                          {val != null && !Number.isNaN(val) ? val.toFixed(3) : '--'}
                        </div>
                        <div className="text-[9px] text-[#888]">MMSCFD</div>
                        <div className="w-full bg-[#1a1a2a] rounded h-2 mt-2 overflow-hidden">
                          <div className="h-full bg-[#22c55e] rounded transition-all" style={{ width: `${widthPct}%` }} />
                        </div>
                        <div className="mt-3 pt-2 border-t border-[#1a1a2a]">
                          <div className="text-[8px] text-[#666] uppercase tracking-wider">{yesterdayVal != null ? 'Yesterday Flow' : wellMeta.active ? 'Desired Flow' : 'Future/Inactive'}</div>
                          <div className="text-[12px] text-white font-bold mt-0.5" style={{ fontFamily: "'Arial Black'" }}>
                            {yesterdayVal != null && !Number.isNaN(yesterdayVal) ? yesterdayVal.toFixed(3) : '--'}
                          </div>
                          <div className="text-[8px] text-[#666]">MMSCFD</div>
                        </div>
                        {wellMeta.active && additionalWellRegisters[i].length > 0 && (
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
                    {totalActualFlow.toFixed(3)} MMSCFD
                  </span>
                </div>
              </div>

              {/* Compression Units — Supreme units */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {SUPREME_UNITS.map((u, i) => (
                  <CompressorCard
                    key={u.key}
                    label={u.label}
                    data={unitDataMaps[i]}
                    time={getTimestamp(unitDataRaw[u.key])}
                    desiredFlow={unitDesiredFlows[i]}
                    actualFlow={unitActualFlows[i]}
                    registers={getVisibleCompressorRegisters(unitDataMaps[i], {})}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="px-5 py-3 bg-[#0c0c16] border-t border-[#1a1a2a] text-center">
        <span className="text-[9px] text-[#444]">Supreme COP Live Field Data · ConocoPhillips · Read-only field view · Data refreshes every 60 seconds</span>
      </footer>
    </div>
  )
}
