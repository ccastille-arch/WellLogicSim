import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  findRegisterDatapoint,
  formatLiveRegisterValue,
  getVisibleCompressorRegisters,
  parseLiveDatapoints,
} from '../engine/liveRegisters'

const API_BASE = import.meta.env.VITE_API_URL || ''
const REFRESH_INTERVAL_S = 60
const FRESH_DATA_MAX_AGE_MS = 5 * 60 * 1000

const ASSETS = {
  panel: 'panel',
  unit2139: 'unit2139',
  unit2140: 'unit2140',
}

const COMPRESSORS = [
  { key: 'unit2139', label: 'Compressor 1', unit: 'Unit 2139' },
  { key: 'unit2140', label: 'Compressor 2', unit: 'Unit 2140' },
]

const WELLS = [
  { number: 1, name: '607H', gasPriority: 1, oilPriority: 1 },
  { number: 2, name: '606H', gasPriority: 2, oilPriority: 2 },
  { number: 3, name: '605H', gasPriority: 3, oilPriority: 3 },
]

const WELL_FLOW_LABELS = {
  1: ['Well 1 Injection Gas Flow Rate', 'Well #1 Flow Rate', 'Wellhead #1 Injection Flow Rate From Customer PLC'],
  2: ['Well 2 Injection Gas Flow Rate', 'Well #2 Flow Rate', 'Wellhead #2 Injection Flow Rate From Customer PLC'],
  3: ['Well 3 Injection Gas Flow Rate', 'Well #3 Flow Rate', 'Wellhead #3 Injection Flow Rate From Customer PLC'],
}

const WELL_TARGET_LABELS = {
  1: ['Wellhead #1 Calculated Desired Flow', 'Wellhead #1 Setpoint From Customer PLC', 'Well 1 Calculated Desired Flow'],
  2: ['Wellhead #2 Calculated Desired Flow', 'Wellhead #2 Setpoint From Customer PLC', 'Well 2 Calculated Desired Flow'],
  3: ['Wellhead #3 Calculated Desired Flow', 'Wellhead #3 Setpoint From Customer PLC', 'Well 3 Calculated Desired Flow'],
}

const WELL_STATIC_LABELS = {
  1: ['Wellhead #1 Injection Static Pressure From Customer PLC', 'Well #1 Injection Static Pressure', 'Well 1 Static Pressure'],
  2: ['Wellhead #2 Injection Static Pressure From Customer PLC', 'Well #2 Injection Static Pressure', 'Well 2 Static Pressure'],
  3: ['Wellhead #3 Injection Static Pressure From Customer PLC', 'Well #3 Injection Static Pressure', 'Well 3 Static Pressure'],
}

const COMPRESSOR_TARGET_LABELS = [
  ['Compressor #1 Desire Flow SP For PID Murphy', 'Compressor #1 Desired Flow SP For PID Murphy', 'Desired Flow SP For PID Murphy'],
  ['Compressor #2 Desire Flow SP For PID Murphy', 'Compressor #2 Desired Flow SP For PID Murphy', 'Desired Flow SP For PID Murphy'],
]

const COMPRESSOR_FLOW_LABELS = ['Flow Rate PID PV', 'Flow Rate', 'Flow Rate PV', 'Compressor Flow Rate PID PV']
const COMPRESSOR_SPEED_LABELS = ['Compressor Speed', 'Driver Speed', 'RPM', 'Engine Speed']
const COMPRESSOR_SHUTDOWN_LABELS = ['Skid - Shutdown', 'Shutdown', 'Fault Shutdown']

async function readErrorPayload(res) {
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const body = await res.json().catch(() => ({}))
    return body?.details || body?.error || res.statusText
  }
  return (await res.text().catch(() => '')).trim() || res.statusText
}

async function fetchSupremeDevice(asset) {
  try {
    const params = new URLSearchParams({ asset, ts: String(Date.now()) })
    const res = await fetch(`${API_BASE}/api/mlink/supreme/device?${params}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
    if (!res.ok) return { data: null, error: `${asset}: ${await readErrorPayload(res)}` }
    return { data: await res.json(), error: '' }
  } catch (err) {
    return { data: null, error: `${asset}: ${err.message}` }
  }
}

async function fetchDemandEvents() {
  try {
    const res = await fetch(`${API_BASE}/api/mlink/supreme/demand-events?limit=25&ts=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
    if (!res.ok) return []
    const body = await res.json()
    return Array.isArray(body.events) ? body.events : []
  } catch {
    return []
  }
}

function latestTimestamp(data) {
  const timestamps = Array.isArray(data?.timestamps) ? data.timestamps : []
  const values = timestamps
    .map(ts => Number(ts))
    .filter(ts => Number.isFinite(ts) && ts > 0)

  if (!values.length) return null
  return new Date(Math.max(...values) * 1000)
}

function isFresh(time) {
  return time instanceof Date && Number.isFinite(time.getTime()) && Date.now() - time.getTime() <= FRESH_DATA_MAX_AGE_MS
}

function ageMinutes(time) {
  if (!(time instanceof Date) || !Number.isFinite(time.getTime())) return null
  return Math.max(0, Math.round((Date.now() - time.getTime()) / 60000))
}

function ageText(time) {
  const minutes = ageMinutes(time)
  if (minutes == null) return 'No timestamp'
  if (minutes < 1) return 'Less than 1 min old'
  if (minutes === 1) return '1 min old'
  if (minutes < 60) return `${minutes} min old`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours} hr ${remainder} min old` : `${hours} hr old`
}

function readPoint(dataMap, labels) {
  for (const label of labels) {
    const point = findRegisterDatapoint(dataMap, { label, decimals: 3 })
    if (point) return point
  }
  return null
}

function toNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function isFreshPoint(point) {
  return !point?.timestamp || isFresh(point.timestamp)
}

function readFreshPoint(dataMap, labels) {
  const point = readPoint(dataMap, labels)
  return isFreshPoint(point) ? point : null
}

function readFreshNumber(dataMap, labels) {
  return toNumber(readFreshPoint(dataMap, labels)?.value)
}

function formatNumber(value, decimals = 1) {
  return value != null && Number.isFinite(value) ? value.toFixed(decimals) : '--'
}

function formatFlow(value) {
  return value != null && Number.isFinite(value) ? `${value.toFixed(3)} MMSCFD` : '--'
}

function formatUnit(unit) {
  if (!unit) return ''
  const text = String(unit).trim()
  if (/deg\s*f/i.test(text) || /f$/i.test(text) && text.charCodeAt(0) > 127) return 'deg F'
  return text
}

function statusForDevice(data) {
  const timestamp = latestTimestamp(data)
  if (!data) return { state: 'offline', label: 'NO DATA', tone: 'neutral', timestamp, age: 'No data' }
  if (!isFresh(timestamp)) return { state: 'stale', label: 'STALE', tone: 'warn', timestamp, age: ageText(timestamp) }
  return { state: 'fresh', label: 'LIVE', tone: 'good', timestamp, age: ageText(timestamp) }
}

function buildWells(panelMap) {
  return WELLS.map(well => {
    const flowPoint = readPoint(panelMap, WELL_FLOW_LABELS[well.number])
    const targetPoint = readPoint(panelMap, WELL_TARGET_LABELS[well.number])
    const staticPoint = readPoint(panelMap, WELL_STATIC_LABELS[well.number])
    const actual = toNumber(flowPoint?.value)
    const target = toNumber(targetPoint?.value)
    const staticPressure = toNumber(staticPoint?.value)
    const variance = actual != null && target != null ? actual - target : null
    const matchPct = actual != null && target != null && target > 0
      ? Math.max(0, 100 - Math.abs(actual - target) / target * 100)
      : null

    return {
      ...well,
      actual,
      target,
      staticPressure,
      variance,
      matchPct,
      flowUnit: formatUnit(flowPoint?.units || 'MMSCFD'),
      flowTimestamp: flowPoint?.timestamp,
      hasLiveValue: actual != null || target != null || staticPressure != null,
    }
  }).filter(well => well.hasLiveValue)
}

function buildCompressor(unit, rawData, panelMap, dataMap, index) {
  const health = statusForDevice(rawData)
  const actualFlowPoint = readFreshPoint(dataMap, COMPRESSOR_FLOW_LABELS)
  const desiredFlowPoint = readFreshPoint(panelMap, COMPRESSOR_TARGET_LABELS[index]) || readFreshPoint(dataMap, COMPRESSOR_TARGET_LABELS[index])
  const rpm = readFreshNumber(dataMap, COMPRESSOR_SPEED_LABELS)
  const shutdownPoint = readFreshPoint(dataMap, COMPRESSOR_SHUTDOWN_LABELS)
  const actualFlow = toNumber(actualFlowPoint?.value)
  const desiredFlow = toNumber(desiredFlowPoint?.value)
  const shutdownText = shutdownPoint?.value == null ? '' : String(shutdownPoint.value)
  const isShutdown = /shutdown|fault|trip/i.test(shutdownText)
  const isRunning = health.state === 'fresh' && !isShutdown && ((rpm != null && rpm > 100) || (actualFlow != null && actualFlow > 0.01))
  const status = health.state !== 'fresh'
    ? health.label
    : isShutdown
      ? 'SHUTDOWN'
      : isRunning
        ? 'RUNNING'
        : 'STOPPED'

  const registers = getVisibleCompressorRegisters(dataMap, {})
    .filter(meta => meta.datapoint?.value != null && String(meta.datapoint.value).trim() !== '')
    .filter(meta => isFreshPoint(meta.datapoint))
    .filter(meta => meta.label !== 'Flow Rate PID PV')
    .slice(0, 10)

  return {
    ...unit,
    health,
    status,
    isRunning,
    actualFlow,
    actualFlowUnit: formatUnit(actualFlowPoint?.units || 'MMSCFD'),
    desiredFlow,
    desiredFlowUnit: formatUnit(desiredFlowPoint?.units || 'MMSCFD'),
    rpm,
    registers,
  }
}

function toneClasses(tone) {
  if (tone === 'good') return 'border-[#1f6b3b] bg-[#091c12] text-[#52e085]'
  if (tone === 'warn') return 'border-[#70521e] bg-[#1a1308] text-[#f8c767]'
  if (tone === 'bad') return 'border-[#702020] bg-[#1a0b0b] text-[#ff776a]'
  return 'border-[#2b3444] bg-[#0f141d] text-[#9aa7b8]'
}

function Dot({ tone }) {
  const color = tone === 'good' ? 'bg-[#22c55e]' : tone === 'warn' ? 'bg-[#f8c767]' : tone === 'bad' ? 'bg-[#ef4444]' : 'bg-[#6b7280]'
  return <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
}

function MetricCard({ label, value, helper, tone = 'neutral' }) {
  return (
    <div className={`rounded-lg border p-4 ${toneClasses(tone)}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-75">{label}</div>
      <div className="mt-2 text-[24px] font-black leading-none text-white" style={{ fontFamily: "'Arial Black', sans-serif" }}>
        {value}
      </div>
      {helper && <div className="mt-2 text-[11px] leading-relaxed opacity-75">{helper}</div>}
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <section className="mb-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-black uppercase tracking-[0.12em] text-white" style={{ fontFamily: "'Arial Black', sans-serif" }}>{title}</h2>
          {subtitle && <p className="mt-1 text-[11px] text-[#7f8a9b]">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, body }) {
  return (
    <div className="rounded-lg border border-[#2b3444] bg-[#0f141d] p-4 text-[12px] text-[#9aa7b8]">
      <div className="font-bold text-white">{title}</div>
      <div className="mt-1">{body}</div>
    </div>
  )
}

function DeviceHealthBar({ panelHealth, compressorHealth }) {
  const devices = [{ label: 'Panel', health: panelHealth }, ...compressorHealth]

  return (
    <div className="grid gap-2 md:grid-cols-3">
      {devices.map(device => (
        <div key={device.label} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${toneClasses(device.health.tone)}`}>
          <div className="flex min-w-0 items-center gap-2">
            <Dot tone={device.health.tone} />
            <div className="min-w-0">
              <div className="truncate text-[11px] font-bold text-white">{device.label}</div>
              <div className="truncate text-[10px] opacity-75">{device.health.age}</div>
            </div>
          </div>
          <div className="text-[10px] font-black tracking-[0.12em]">{device.health.label}</div>
        </div>
      ))}
    </div>
  )
}

function WellFlowTable({ wells, hasTargets, panelFresh }) {
  if (!wells.length) {
    return <EmptyState title="No well values returned" body="MLink did not return well flow, target, or static pressure tags on this refresh." />
  }

  const flowLabel = panelFresh ? 'Current Flow' : 'Last Known Flow'

  return (
    <div className="overflow-hidden rounded-lg border border-[#202b3a] bg-[#0d1118]">
      <div className="grid grid-cols-[1fr_1fr] gap-0 border-b border-[#202b3a] bg-[#111827] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8fa1b8] md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
        <div>Well</div>
        <div className="text-right">{flowLabel}</div>
        <div className="hidden text-right md:block">Target</div>
        <div className="hidden text-right md:block">Variance</div>
        <div className="hidden text-right md:block">Static Pressure</div>
      </div>
      {wells.map(well => (
        <div key={well.number} className="grid grid-cols-[1fr_1fr] items-center border-b border-[#17202c] px-3 py-3 last:border-b-0 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
          <div>
            <div className="text-[13px] font-bold text-white">Well {well.number} / {well.name}</div>
            <div className="mt-0.5 text-[10px] text-[#68758a]">Gas P{well.gasPriority} / Oil P{well.oilPriority}</div>
            {!panelFresh && well.flowTimestamp && (
              <div className="mt-0.5 text-[10px] text-[#9a7a3d]">Last value {well.flowTimestamp.toLocaleTimeString()}</div>
            )}
          </div>
          <div className="text-right text-[14px] font-black text-[#58e68f]" style={{ fontFamily: "'Arial Black', sans-serif" }}>
            {formatFlow(well.actual)}
          </div>
          <div className="hidden text-right text-[12px] text-[#cbd5e1] md:block">
            {hasTargets ? formatFlow(well.target) : 'Not published'}
          </div>
          <div className="hidden text-right text-[12px] text-[#cbd5e1] md:block">
            {well.variance != null ? `${well.variance >= 0 ? '+' : ''}${well.variance.toFixed(3)} MMSCFD` : 'Not available'}
          </div>
          <div className="hidden text-right text-[12px] text-[#cbd5e1] md:block">
            {well.staticPressure != null ? `${formatNumber(well.staticPressure, 0)} PSI` : 'Not published'}
          </div>
        </div>
      ))}
    </div>
  )
}

function CompressorCard({ compressor }) {
  const fresh = compressor.health.state === 'fresh'
  const statusTone = compressor.status === 'RUNNING'
    ? 'good'
    : compressor.status === 'SHUTDOWN'
      ? 'bad'
      : fresh
        ? 'neutral'
        : 'warn'

  return (
    <div className="rounded-lg border border-[#202b3a] bg-[#0d1118] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[13px] font-black text-white" style={{ fontFamily: "'Arial Black', sans-serif" }}>{compressor.label}</div>
          <div className="mt-0.5 text-[10px] text-[#6f7c90]">{compressor.unit}</div>
        </div>
        <span className={`rounded border px-2 py-1 text-[10px] font-black tracking-[0.12em] ${toneClasses(statusTone)}`}>{compressor.status}</span>
      </div>

      {!fresh ? (
        <div className="rounded border border-[#70521e] bg-[#1a1308] p-3 text-[11px] leading-relaxed text-[#f8c767]">
          MLink has not returned a fresh compressor update. Old compressor readings are hidden.
          <div className="mt-2 text-[#b7924f]">Last compressor update: {compressor.health.timestamp ? compressor.health.timestamp.toLocaleString() : 'No timestamp'}</div>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            {compressor.actualFlow != null && (
              <MetricCard label="Actual Flow" value={formatFlow(compressor.actualFlow)} helper={compressor.actualFlowUnit} tone="good" />
            )}
            {compressor.desiredFlow != null && (
              <MetricCard label="Demand" value={formatFlow(compressor.desiredFlow)} helper={compressor.desiredFlowUnit} tone="neutral" />
            )}
            {compressor.rpm != null && (
              <MetricCard label="Speed" value={`${formatNumber(compressor.rpm, 0)} RPM`} tone="neutral" />
            )}
          </div>

          {compressor.registers.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {compressor.registers.map(meta => (
                <div key={meta.id} className="rounded border border-[#1b2431] bg-[#090d14] p-2">
                  <div className="text-[9px] uppercase tracking-[0.1em] text-[#6f7c90]">{meta.label}</div>
                  <div className="mt-1 text-[13px] font-bold text-white">
                    {formatLiveRegisterValue(meta, meta.datapoint)}
                    {meta.datapoint.units && <span className="ml-1 text-[10px] font-normal text-[#6f7c90]">{formatUnit(meta.datapoint.units)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DemandEventLog({ events }) {
  if (!events.length) {
    return <EmptyState title="No compressor demand changes recorded" body="The event log will populate when the well panel publishes a compressor demand change." />
  }

  return (
    <div className="space-y-3">
      {events.map((event, index) => (
        <div key={`${event.timestamp}-${index}`} className="rounded-lg border border-[#202b3a] bg-[#0d1118] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[12px] font-bold text-white">{new Date(event.timestamp).toLocaleString()}</div>
            <div className="text-[10px] text-[#8fa1b8]">
              C1 {formatFlow(toNumber(event.demand?.comp1))} / C2 {formatFlow(toNumber(event.demand?.comp2))}
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {(event.wells || []).filter(well => well.flowRate != null || well.staticPressure != null).map(well => (
              <div key={well.wellNumber} className="rounded border border-[#1b2431] bg-[#090d14] p-2 text-[10px] text-[#9aa7b8]">
                <div className="font-bold text-white">Well {well.wellNumber} / {well.physical}</div>
                <div className="mt-1">Flow: {formatFlow(toNumber(well.flowRate))}</div>
                <div>Static: {well.staticPressure != null ? `${formatNumber(toNumber(well.staticPressure), 0)} PSI` : 'Not published'}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SupremeLiveView() {
  const [panelData, setPanelData] = useState(null)
  const [unitData, setUnitData] = useState({ unit2139: null, unit2140: null })
  const [errors, setErrors] = useState([])
  const [demandEvents, setDemandEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_S)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [panelResult, unit2139Result, unit2140Result, events] = await Promise.all([
      fetchSupremeDevice(ASSETS.panel),
      fetchSupremeDevice(ASSETS.unit2139),
      fetchSupremeDevice(ASSETS.unit2140),
      fetchDemandEvents(),
    ])

    setPanelData(panelResult.data)
    setUnitData({
      unit2139: unit2139Result.data,
      unit2140: unit2140Result.data,
    })
    setDemandEvents(events)
    setErrors([panelResult.error, unit2139Result.error, unit2140Result.error].filter(Boolean))
    setLastRefresh(new Date())
    setCountdown(REFRESH_INTERVAL_S)
    setLoading(false)
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
    const timer = setInterval(() => setCountdown(value => (value > 0 ? value - 1 : REFRESH_INTERVAL_S)), 1000)
    return () => clearInterval(timer)
  }, [])

  const panelMap = useMemo(() => parseLiveDatapoints(panelData), [panelData])
  const unitMaps = useMemo(() => ({
    unit2139: parseLiveDatapoints(unitData.unit2139),
    unit2140: parseLiveDatapoints(unitData.unit2140),
  }), [unitData])

  const panelHealth = statusForDevice(panelData)
  const compressorRows = COMPRESSORS.map((compressor, index) =>
    buildCompressor(compressor, unitData[compressor.key], panelMap, unitMaps[compressor.key], index)
  )
  const wells = buildWells(panelMap)
  const totalInjection = wells.reduce((sum, well) => sum + (well.actual ?? 0), 0)
  const wellsWithTargets = wells.filter(well => well.target != null)
  const hasTargets = wellsWithTargets.length > 0
  const freshCompressors = compressorRows.filter(compressor => compressor.health.state === 'fresh').length
  const hasAnyData = !!panelData || compressorRows.some(compressor => compressor.health.state !== 'offline')
  const pageTone = panelHealth.tone === 'good' ? 'good' : panelHealth.tone === 'warn' ? 'warn' : 'bad'
  const panelFresh = panelHealth.state === 'fresh'
  const injectionLabel = panelFresh ? 'Current Injection' : 'Last Known Injection'
  const injectionHelper = panelFresh
    ? `${wells.length} wells publishing now`
    : `${wells.length} wells last returned by panel`
  const wellSectionTitle = panelFresh ? 'Current Well Flow' : 'Last Known Well Flow'
  const wellSectionSubtitle = panelFresh
    ? (hasTargets ? 'Actual flow and target values from fresh MLink data.' : 'Actual flow only. Desired-flow target tags are not currently published.')
    : 'Panel data is stale. Values below are the last MLink values returned, not current operating proof.'

  return (
    <div className="min-h-screen bg-[#070a0f] text-[#d8e0ec]">
      <header className="border-b border-[#1b2431] bg-[#0b1018] px-5 py-4">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Dot tone={pageTone} />
              <h1 className="text-[17px] font-black text-white" style={{ fontFamily: "'Arial Black', sans-serif" }}>Supreme COP Live Data</h1>
            </div>
            <div className="mt-1 text-[11px] text-[#7f8a9b]">ConocoPhillips / Supreme / DE4000 / live MLink only</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#9aa7b8]">
            {lastRefresh && <span className="rounded border border-[#263244] bg-[#101722] px-2 py-1">Page refresh {lastRefresh.toLocaleTimeString()}</span>}
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="rounded border border-[#263244] bg-[#101722] px-3 py-1 font-bold text-white hover:bg-[#172131] disabled:opacity-50"
            >
              {loading ? 'Refreshing' : `Refresh in ${countdown}s`}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-5 py-5">
        {errors.length > 0 && (
          <div className="mb-4 rounded-lg border border-[#702020] bg-[#1a0b0b] p-3 text-[12px] text-[#ffb4ae]">
            MLink returned errors on this refresh: {errors.join(' | ')}
          </div>
        )}

        {!loading && !hasAnyData ? (
          <div className="mt-16 rounded-lg border border-[#702020] bg-[#1a0b0b] p-6 text-center">
            <div className="text-[13px] font-black uppercase tracking-[0.16em] text-[#ff776a]">Live Supreme Data Unavailable</div>
            <div className="mt-2 text-[24px] font-black text-white" style={{ fontFamily: "'Arial Black', sans-serif" }}>Waiting on MLink live feed</div>
            <p className="mx-auto mt-3 max-w-[620px] text-[12px] text-[#caa4a1]">This page shows live MLink values only. No static fallback values are displayed.</p>
          </div>
        ) : (
          <>
            <section className="mb-5 rounded-lg border border-[#202b3a] bg-[#0d1118] p-4">
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <div className={`mb-3 inline-flex items-center gap-2 rounded border px-2 py-1 text-[10px] font-black tracking-[0.14em] ${toneClasses(pageTone)}`}>
                    <Dot tone={pageTone} />
                    PANEL {panelHealth.label}
                  </div>
                  <h2 className="text-[30px] font-black leading-tight text-white" style={{ fontFamily: "'Arial Black', sans-serif" }}>
                    Supreme Field Data
                  </h2>
                  <p className="mt-2 max-w-[720px] text-[13px] leading-relaxed text-[#9aa7b8]">
                    {panelFresh
                      ? 'Current well flow values are shown from fresh MLink data. Target comparisons, pressure checks, and compressor readings appear only when those tags are published fresh.'
                      : 'MLink panel data is stale. The well values below are last-known readings only, so this screen should trigger MLink investigation before field decisions.'}
                  </p>
                </div>
                <DeviceHealthBar
                  panelHealth={panelHealth}
                  compressorHealth={compressorRows.map(compressor => ({ label: `${compressor.label} ${compressor.unit}`, health: compressor.health }))}
                />
              </div>
            </section>

            <div className="mb-5 grid gap-3 md:grid-cols-4">
              <MetricCard label={injectionLabel} value={formatFlow(totalInjection)} helper={injectionHelper} tone={panelFresh ? 'good' : 'warn'} />
              <MetricCard label="Panel Timestamp" value={panelHealth.timestamp ? panelHealth.timestamp.toLocaleTimeString() : '--'} helper={panelHealth.age} tone={panelHealth.tone} />
              <MetricCard label="Compressor Live Feeds" value={`${freshCompressors}/${COMPRESSORS.length}`} helper="Fresh compressor devices" tone={freshCompressors === COMPRESSORS.length ? 'good' : 'warn'} />
              <MetricCard label="Target Tags" value={hasTargets ? `${wellsWithTargets.length}/${wells.length}` : 'Not published'} helper="No target math without target tags" tone={hasTargets ? 'good' : 'neutral'} />
            </div>

            <Section title={wellSectionTitle} subtitle={wellSectionSubtitle}>
              <WellFlowTable wells={wells} hasTargets={hasTargets} panelFresh={panelFresh} />
            </Section>

            <Section title="Compressor Availability" subtitle="Stale compressor readings are hidden and shown as stale, not as current operating data.">
              <div className="grid gap-4 lg:grid-cols-2">
                {compressorRows.map(compressor => <CompressorCard key={compressor.key} compressor={compressor} />)}
              </div>
            </Section>

            <Section title="Compressor Demand Change Log" subtitle="Recorded only when the well panel publishes a demand change.">
              <DemandEventLog events={demandEvents} />
            </Section>
          </>
        )}
      </main>

      <footer className="border-t border-[#1b2431] bg-[#0b1018] px-5 py-3 text-center text-[10px] text-[#596579]">
        Supreme COP live field view / MLink refresh every 60 seconds / stale values are not treated as current
      </footer>
    </div>
  )
}
