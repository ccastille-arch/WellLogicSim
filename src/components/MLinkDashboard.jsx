import { useState, useEffect, useCallback } from 'react'
import { useKlondikeData } from '../engine/klondikeData'
import { useAuth } from './auth/AuthProvider'
import {
  COMPRESSOR_DEFAULT_VISIBLE_LABELS,
  findRegisterDatapoint,
  getVisibleCompressorRegisters,
  LIVE_DATA_DEVICES,
  formatLiveRegisterValue,
  getVisibleLiveRegisters,
  loadAwiRegisterCatalog,
  parseLiveDatapoints,
} from '../engine/liveRegisters'

// MLINK Live Dashboard - data fetched via server-side proxy (key never in browser)
// ALL customer names, site names, and device IDs are stripped. Generic labels only.

const API_BASE = import.meta.env.VITE_API_URL || ''

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

async function fetchRunReport(deviceId, startTs, endTs) {
  try {
    const res = await fetch(`${API_BASE}/api/mlink/runreport?deviceId=${encodeURIComponent(deviceId)}&startTs=${startTs}&endTs=${endTs}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
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

export default function MLinkDashboard({ onBack }) {
  const { settings } = useAuth()
  const [panelData, setPanelData] = useState(null)
  const [compAData, setCompAData] = useState(null)
  const [compBData, setCompBData] = useState(null)
  const [registerCatalog, setRegisterCatalog] = useState([])
  const [runReports, setRunReports] = useState({ compA: undefined, compB: undefined })
  const [runReportsLoading, setRunReportsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [liveError, setLiveError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [tab, setTab] = useState('live') // live | history | klondike
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
          ? `No live MLINK data is coming back right now. ${errors.join(' | ')}`
          : 'No live MLINK data is coming back right now. Check the MLINK proxy route, Railway environment variables, and field comms.',
      )
    }
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  const loadRunReports = useCallback(async () => {
    setRunReportsLoading(true)
    // Yesterday's 24hr report (API requires endTs < current UTC day)
    const now = new Date()
    const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const endTs = Math.floor(utcToday.getTime() / 1000) - 1
    const startTs = endTs - 86399

    const [rA, rB] = await Promise.allSettled([
      fetchRunReport(LIVE_DATA_DEVICES.compA, startTs, endTs),
      fetchRunReport(LIVE_DATA_DEVICES.compB, startTs, endTs),
    ])
    setRunReports({
      compA: rA.status === 'fulfilled' ? rA.value : null,
      compB: rB.status === 'fulfilled' ? rB.value : null,
    })
    setRunReportsLoading(false)
  }, [])

  useEffect(() => {
    loadAwiRegisterCatalog().then(setRegisterCatalog).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab !== 'live') return undefined

    refresh()
    const interval = setInterval(refresh, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [tab, refresh])

  useEffect(() => {
    if (tab !== 'history') return
    if (runReports.compA !== undefined || runReports.compB !== undefined) return
    loadRunReports()
  }, [tab, loadRunReports, runReports.compA, runReports.compB])

  const panel = parseLiveDatapoints(panelData)
  const compA = parseLiveDatapoints(compAData)
  const compB = parseLiveDatapoints(compBData)
  const panelTime = getTimestamp(panelData)
  const compATime = getTimestamp(compAData)
  const latestHistoryRow = klondike.data?.[klondike.data.length - 1]
  const visibleRegisters = getVisibleLiveRegisters(panel, registerCatalog, settings?.liveDataRegisterVisibility || {})
  const visibleCompressorARegisters = getVisibleCompressorRegisters(compA, settings?.liveDataCompressorVisibility || {})
  const visibleCompressorBRegisters = getVisibleCompressorRegisters(compB, settings?.liveDataCompressorVisibility || {})
  const hourMeterRegister = visibleRegisters.find(meta => meta.label === 'Hour Meter')
  const padRegisters = visibleRegisters.filter(meta => meta.groupId === 'pad' && meta.label !== 'Hour Meter')
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

  return (
    <div className="flex-1 flex flex-col bg-[#080810] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg text-white font-bold flex items-center gap-2" style={{ fontFamily: "'Arial Black'" }}>
              <span className="text-[#22c55e]">ON</span> Live Field Data - Pad Logic in Production
            </h1>
            <p className="text-[11px] text-[#888]">
              Real-time data from an active Pad Logic panel and compressors running in West Texas
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-[9px] text-[#555]">
                Last update: {lastRefresh.toLocaleTimeString()} (refreshes every 15 min)
              </span>
            )}
            <button onClick={refresh} disabled={loading}
              className="px-3 py-1.5 text-[10px] font-bold text-[#4fc3f7] border border-[#4fc3f7]/30 rounded hover:bg-[#4fc3f7]/10 disabled:opacity-50">
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button onClick={onBack} className="px-3 py-1.5 text-[10px] font-bold text-[#888] border border-[#333] rounded hover:text-white">Back</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 py-2 bg-[#0a0a14] border-b border-[#1a1a2a] shrink-0">
        <button onClick={() => setTab('live')} className={`px-4 py-1.5 rounded text-[11px] font-bold ${tab === 'live' ? 'bg-[#E8200C] text-white' : 'text-[#888] hover:text-white bg-[#111120] border border-[#2a2a3a]'}`}>Live Data</button>
        <button onClick={() => setTab('history')} className={`px-4 py-1.5 rounded text-[11px] font-bold ${tab === 'history' ? 'bg-[#E8200C] text-white' : 'text-[#888] hover:text-white bg-[#111120] border border-[#2a2a3a]'}`}>Run History</button>
        <button onClick={() => setTab('klondike')} className={`px-4 py-1.5 rounded text-[11px] font-bold ${tab === 'klondike' ? 'bg-[#4fc3f7] text-black' : 'text-[#888] hover:text-white bg-[#111120] border border-[#2a2a3a]'}`}>30-Day Field Data</button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tab === 'live' ? (
          <div className="max-w-[1280px] mx-auto">
            {loading && !panelData ? (
              <div className="text-center py-20 text-[#888]">Connecting to field unit...</div>
            ) : (
              <>
                {liveError && (
                  <div className="mb-4 rounded-lg border border-[#5a1d1d] bg-[#1f0c0c] px-4 py-3 text-[11px] text-[#fca5a5]">
                    {liveError}
                  </div>
                )}

                <LivePerformanceHero
                  metrics={wowMetrics}
                  wells={liveWellPerformance}
                  timestamp={panelTime}
                />

                {/* Panel status */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-[#22c55e] shadow-lg shadow-[#22c55e]/50" />
                  <span className="text-[13px] text-[#22c55e] font-bold">ONLINE - Panel Active</span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="rounded-full border border-[#2f2f40] bg-[#111120] px-2 py-0.5 text-[8px] uppercase tracking-[0.18em] text-[#777]">
                      Hour Meter <span className="ml-1 text-[10px] text-white font-bold normal-case tracking-normal">{formatHourMeterValue(hourMeterRegister?.datapoint?.value ?? panel['\t Hour Meter']?.value ?? panel['Hour Meter']?.value)}</span>
                    </span>
                  {panelTime && <span className="text-[10px] text-[#555]">Data from: {panelTime.toLocaleString()}</span>}
                  </div>
                </div>

                {/* Well Flow Rates */}
                <div className="bg-[#111118] rounded-xl border border-[#222] p-5 mb-4">
                  <h2 className="text-sm text-white font-bold mb-4" style={{ fontFamily: "'Arial Black'" }}>
                    Well Injection Flow Rates
                  </h2>
                  <div className="grid grid-cols-4 gap-4">
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

                {padRegisters.length > 0 && (
                  <div className="bg-[#111118] rounded-xl border border-[#222] p-5 mb-4">
                    <h2 className="text-sm text-white font-bold mb-4" style={{ fontFamily: "'Arial Black'" }}>
                      Pad / Header Registers
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                      {padRegisters.map(meta => (
                        <div key={meta.id} className="bg-[#0a0a14] rounded-lg border border-[#2a2a3a] p-3">
                          <div className="text-[9px] text-[#888] uppercase tracking-wider">{meta.label}</div>
                          <div className="text-[16px] text-white font-bold mt-1" style={{ fontFamily: "'Arial Black'" }}>
                            {formatLiveRegisterValue(meta, meta.datapoint)}
                          </div>
                          <div className="text-[8px] text-[#666] mt-0.5">
                            {meta.datapoint.units || `Register ${meta.register}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compressors */}
                <div className="grid grid-cols-2 gap-4 mb-4">
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
        ) : tab === 'history' ? (
          /* Run History Tab */
          <div className="max-w-[1000px] mx-auto">
            <h2 className="text-sm text-white font-bold mb-4" style={{ fontFamily: "'Arial Black'" }}>
              Yesterday's Run Report
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <RunReportCard label="Compressor A" report={runReports.compA} loading={runReportsLoading} />
              <RunReportCard label="Compressor B" report={runReports.compB} loading={runReportsLoading} />
            </div>
            <WellAchievementSection klondike={klondike} />
            <p className="text-[9px] text-[#555] mt-4 text-center">
              Compressor run reports cover yesterday's 24-hour window. Well achievement uses 30-day field data.
            </p>
          </div>
        ) : (
          /* 30-Day Klondike Field Data Tab */
          <KlondikeHistoryTab klondike={klondike} />
        )}
      </div>
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
        <DataPoint
          label="Desired Flow"
          value={desiredFlowValue}
          unit={desiredFlow?.units || 'MMSCFD'}
          color="#4fc3f7"
          compact
        />
        <DataPoint
          label="Actual Flow"
          value={actualFlowValue}
          unit={actualFlow?.units || 'MMSCFD'}
          color={getCompressorColor('Flow Rate PID PV', actualFlow?.value)}
          compact
        />
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
            This is actual live data from a running location right now. Customers should see instantly how tightly this pad is operating:
            actual well injection riding on top of desired injection, compressors carrying commanded flow, and the historical time spent
            below target exposed in plain sight.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <WowMetricCard
              label="Live Injection Match"
              value={formatPercent(metrics.currentMatch, 1)}
              tone="green"
              helper={metrics.totalDesired ? `${metrics.totalActual.toFixed(3)} actual vs ${metrics.totalDesired.toFixed(3)} desired` : 'Waiting on desired-rate tags'}
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

  if (/stage 3 discharge prs/i.test(label)) {
    return numeric > 900 ? '#E8200C' : '#22c55e'
  }
  if (/stage 1 suction prs/i.test(label)) {
    return numeric < 30 ? '#eab308' : '#22c55e'
  }
  if (/3rd stage discharge temperature/i.test(label)) {
    return numeric > 275 ? '#E8200C' : '#22c55e'
  }
  if (/skid - shutdown/i.test(label)) {
    return numeric > 0 ? '#E8200C' : '#22c55e'
  }

  return '#fff'
}

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
  const valid = values.filter(value => value != null && Number.isFinite(value))
  if (!valid.length) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
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

    return {
      atTargetPct: (good / samples.length) * 100,
    }
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

// â”€â”€â”€ Klondike 30-Day History Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function KlondikeHistoryTab({ klondike }) {
  const { data, loading, error } = klondike
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState('overview') // overview | well1..4 | comp1..2

  useEffect(() => {
    if (!playing || !data) return
    const id = setInterval(() => {
      setCursor(c => {
        if (c >= data.length - 1) { setPlaying(false); return c }
        return c + 1
      })
    }, 120)
    return () => clearInterval(id)
  }, [playing, data])

  if (loading) return <div className="flex items-center justify-center h-40 text-[#888] text-sm">Loading field data...</div>
  if (error) return <div className="p-6 text-[#E8200C] text-sm">Error: {error}</div>
  if (!data?.length) return <div className="p-6 text-[#888] text-sm">No data available.</div>

  const row = data[cursor]
  const prev = cursor > 0 ? data[cursor - 1] : null

  // Mini sparkline data â€” last 40 points up to cursor
  const windowData = data.slice(Math.max(0, cursor - 39), cursor + 1)
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'well1', label: 'Well 1' },
    { id: 'well2', label: 'Well 2' },
    { id: 'well3', label: 'Well 3' },
    { id: 'well4', label: 'Well 4' },
    { id: 'comp1', label: 'Comp 1' },
    { id: 'comp2', label: 'Comp 2' },
  ]

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>
            Klondike COP0001 - 30-Day Field Data
          </h2>
          <p className="text-[10px] text-[#888]">{data.length} samples - 15-min intervals - {data[0]?.timestamp} to {data[data.length-1]?.timestamp}</p>
        </div>
        <div className="flex items-center gap-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)}
              className={`px-3 py-1 text-[10px] font-bold rounded ${
                view === tab.id
                  ? 'bg-[#4fc3f7] text-black' : 'text-[#888] border border-[#333] hover:text-white'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Playback controls */}
      <div className="bg-[#0c0c18] rounded-lg border border-[#1a1a2a] p-3 mb-4 flex items-center gap-3">
        <button onClick={() => setCursor(0)} className="text-[10px] text-[#888] border border-[#333] rounded px-2 py-1 hover:text-white">Start</button>
        <button onClick={() => setCursor(c => Math.max(0, c - 1))} className="text-[10px] text-[#888] border border-[#333] rounded px-2 py-1 hover:text-white">Prev</button>
        <button onClick={() => setPlaying(p => !p)}
          className={`px-4 py-1 text-[10px] font-bold rounded ${playing ? 'bg-[#eab308] text-black' : 'bg-[#22c55e] text-black'}`}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={() => setCursor(c => Math.min(data.length - 1, c + 1))} className="text-[10px] text-[#888] border border-[#333] rounded px-2 py-1 hover:text-white">Next</button>
        <button onClick={() => setCursor(data.length - 1)} className="text-[10px] text-[#888] border border-[#333] rounded px-2 py-1 hover:text-white">End</button>

        <div className="flex-1 mx-2">
          <input type="range" min={0} max={data.length - 1} value={cursor}
            onChange={e => { setCursor(+e.target.value); setPlaying(false) }}
            className="w-full accent-[#E8200C]" />
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] text-[#4fc3f7] font-bold">{row.timestamp}</div>
          <div className="text-[9px] text-[#555]">{cursor + 1} / {data.length}</div>
        </div>
      </div>

      {view === 'overview' ? (
        <KlondikeOverview row={row} prev={prev} windowData={windowData} />
      ) : view.startsWith('comp') ? (
        <KlondikeCompressorDetail row={row} compressorIdx={parseInt(view.replace('comp',''), 10) - 1} windowData={windowData} />
      ) : (
        <KlondikeWellDetail row={row} prev={prev} wellIdx={parseInt(view.replace('well','')) - 1} windowData={windowData} />
      )}
    </div>
  )
}

function KlondikeOverview({ row, prev, windowData }) {
  const totalFlow = row.totalFlowMscfd

  return (
    <div className="space-y-4">
      {/* Pad Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111118] rounded-lg border border-[#222] p-4 col-span-1">
          <div className="text-[9px] text-[#888] uppercase tracking-wider mb-1">Total Pad Injection</div>
          <div className="text-3xl font-bold text-[#22c55e]" style={{ fontFamily: "'Arial Black'" }}>
            {totalFlow?.toLocaleString() ?? '--'}
          </div>
          <div className="text-[9px] text-[#888]">MSCFD</div>
          {prev && <div className={`text-[9px] mt-1 ${totalFlow > prev.totalFlowMscfd ? 'text-[#22c55e]' : totalFlow < prev.totalFlowMscfd ? 'text-[#E8200C]' : 'text-[#888]'}`}>
            {totalFlow > prev.totalFlowMscfd ? 'UP' : totalFlow < prev.totalFlowMscfd ? 'DOWN' : 'SAME'} {Math.abs(totalFlow - prev.totalFlowMscfd).toFixed(0)} from prev
          </div>}
          <MiniSparkline data={windowData.map(r => r.totalFlowMscfd)} color="#22c55e" />
        </div>

        <div className="bg-[#111118] rounded-lg border border-[#222] p-4">
          <div className="text-[9px] text-[#888] uppercase tracking-wider mb-1">Compressor Status</div>
          <div className="space-y-2 mt-2">
            {[row.comp1Status, row.comp2Status].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${s === 'Running' ? 'bg-[#22c55e]' : 'bg-[#E8200C]'}`} />
                <span className="text-[11px] text-white">Comp {i+1}</span>
                <span className={`text-[10px] font-bold ml-auto ${s === 'Running' ? 'text-[#22c55e]' : 'text-[#E8200C]'}`}>{s || '--'}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[9px] text-[#888]">Hour Meter: <span className="text-white">{row.hourMeter?.toLocaleString()} hrs</span></div>
        </div>

        <div className="bg-[#111118] rounded-lg border border-[#222] p-4">
          <div className="text-[9px] text-[#888] uppercase tracking-wider mb-2">Well Flow Distribution</div>
          {row.wells.map((w, i) => {
            const flow = w.flowMmscfd ?? 0
            const sp = w.setpointMmscfd ?? 1
            const pct = Math.min(100, (flow / sp) * 100)
            return (
              <div key={i} className="mb-1.5">
                <div className="flex justify-between text-[9px] mb-0.5">
                  <span className="text-[#888]">W{i+1}</span>
                  <span className="text-white">{flow.toFixed(3)} MMSCFD</span>
                </div>
                <div className="w-full bg-[#1a1a2a] rounded-full h-1.5">
                  <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4-well summary table */}
      <div className="bg-[#111118] rounded-lg border border-[#222] overflow-hidden">
        <div className="px-4 py-2 border-b border-[#1a1a2a] bg-[#0c0c18]">
          <span className="text-[10px] text-white font-bold uppercase tracking-wider">Per-Well Parameters - {row.timestamp}</span>
        </div>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-[#0a0a14]">
              {['Well', 'Flow (MMSCFD)', 'Desired Rate', 'Static Pres (PSI)', 'Diff Pres (PSI)', 'Temp (deg F)', 'Choke AO (%)', 'Run Status'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[#888] font-normal border-b border-[#1a1a2a]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row.wells.map((w, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-[#080810]' : 'bg-[#0c0c18]'}>
                <td className="px-3 py-2 text-[#E8200C] font-bold">Well {i+1}</td>
                <td className="px-3 py-2 text-[#22c55e] font-bold">{w.flowMmscfd?.toFixed(3) ?? '--'}</td>
                <td className="px-3 py-2 text-[#888]">{(w.desiredInjectionRateMmscfd ?? w.setpointMmscfd)?.toFixed(3) ?? '--'}</td>
                <td className="px-3 py-2 text-white">{w.staticPressure ?? '--'}</td>
                <td className="px-3 py-2 text-white">{w.diffPressure ?? '--'}</td>
                <td className="px-3 py-2 text-white">{w.temp ?? '--'}</td>
                <td className="px-3 py-2 text-white">{w.analogOutput ?? '--'}</td>
                <td className="px-3 py-2">
                  <span className={`font-bold ${w.runStatus === 'Online' ? 'text-[#22c55e]' : 'text-[#888]'}`}>
                    {w.runStatus || '--'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KlondikeWellDetail({ row, prev, wellIdx, windowData }) {
  const w = row.wells[wellIdx]
  const pw = prev?.wells[wellIdx]

  const params = [
    { label: 'Injection Flow', value: w.flowMmscfd?.toFixed(3), unit: 'MMSCFD', color: '#22c55e', spark: windowData.map(r => r.wells[wellIdx]?.flowMmscfd ?? 0) },
    { label: 'Desired Rate', value: (w.desiredInjectionRateMmscfd ?? w.setpointMmscfd)?.toFixed(3), unit: 'MMSCFD', color: '#4fc3f7', spark: windowData.map(r => r.wells[wellIdx]?.desiredInjectionRateMmscfd ?? r.wells[wellIdx]?.setpointMmscfd ?? 0) },
    { label: 'Static Pressure', value: w.staticPressure, unit: 'PSI', color: '#eab308', spark: windowData.map(r => r.wells[wellIdx]?.staticPressure ?? 0) },
    { label: 'Differential Pres', value: w.diffPressure, unit: 'PSI', color: '#f97316', spark: windowData.map(r => r.wells[wellIdx]?.diffPressure ?? 0) },
    { label: 'Injection Temp', value: w.temp, unit: 'deg F', color: '#E8200C', spark: windowData.map(r => r.wells[wellIdx]?.temp ?? 0) },
    { label: 'Choke AO', value: w.analogOutput, unit: '%', color: '#a78bfa', spark: windowData.map(r => r.wells[wellIdx]?.analogOutput ?? 0) },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${w.runStatus === 'Online' ? 'bg-[#22c55e]' : 'bg-[#555]'}`} />
        <span className="text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>Well {wellIdx + 1}</span>
        <span className={`text-[10px] font-bold ${w.runStatus === 'Online' ? 'text-[#22c55e]' : 'text-[#888]'}`}>{w.runStatus || '--'}</span>
        <span className="text-[9px] text-[#555] ml-auto">{row.timestamp}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {params.map(p => (
          <div key={p.label} className="bg-[#111118] rounded-lg border border-[#222] p-4">
            <div className="text-[9px] text-[#888] uppercase tracking-wider mb-1">{p.label}</div>
            <div className="text-2xl font-bold mb-0.5" style={{ color: p.color, fontFamily: "'Arial Black'" }}>
              {p.value ?? '--'}
            </div>
            <div className="text-[9px] text-[#888]">{p.unit}</div>
            <MiniSparkline data={p.spark} color={p.color} />
          </div>
        ))}
      </div>

      <div className="mt-3 bg-[#0c0c18] rounded border border-[#1a1a2a] p-3 text-[10px] text-[#888]">
        Yesterday total: <span className="text-white">{w.yesterdayTotal?.toFixed(3) ?? '--'} MMSCFD</span>
        &nbsp;-&nbsp; Desired: <span className="text-white">{w.calcDesiredFlow?.toFixed(3) ?? '--'} MMSCFD</span>
        &nbsp;-&nbsp; Max rate: <span className="text-white">{w.maxFlowRate?.toFixed(3) ?? '--'} MMSCFD</span>
      </div>
    </div>
  )
}

function KlondikeCompressorDetail({ row, compressorIdx, windowData }) {
  const desiredFlow = compressorIdx === 0 ? row.comp1DesiredFlow : row.comp2DesiredFlow
  const runStatus = compressorIdx === 0 ? row.comp1Status : row.comp2Status
  const compressorNumber = compressorIdx + 1

  const params = [
    {
      label: 'Desired Flow SP',
      value: desiredFlow?.toFixed(3),
      unit: 'MMSCFD',
      color: '#4fc3f7',
      spark: windowData.map(r => compressorIdx === 0 ? (r.comp1DesiredFlow ?? 0) : (r.comp2DesiredFlow ?? 0)),
    },
    {
      label: 'Run Status',
      value: runStatus || '--',
      unit: '',
      color: runStatus === 'Running' ? '#22c55e' : '#E8200C',
      spark: windowData.map(r => ((compressorIdx === 0 ? r.comp1Status : r.comp2Status) === 'Running' ? 1 : 0)),
    },
    {
      label: 'Pad Injection',
      value: row.totalFlowMscfd?.toFixed(0),
      unit: 'MSCFD',
      color: '#22c55e',
      spark: windowData.map(r => r.totalFlowMscfd ?? 0),
    },
    {
      label: 'Hour Meter',
      value: row.hourMeter?.toFixed(0),
      unit: 'hrs',
      color: '#eab308',
      spark: windowData.map(r => r.hourMeter ?? 0),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${runStatus === 'Running' ? 'bg-[#22c55e]' : 'bg-[#555]'}`} />
        <span className="text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>Compressor {compressorNumber}</span>
        <span className={`text-[10px] font-bold ${runStatus === 'Running' ? 'text-[#22c55e]' : 'text-[#888]'}`}>{runStatus || '--'}</span>
        <span className="text-[9px] text-[#555] ml-auto">{row.timestamp}</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {params.map(p => (
          <div key={p.label} className="bg-[#111118] rounded-lg border border-[#222] p-4">
            <div className="text-[9px] text-[#888] uppercase tracking-wider mb-1">{p.label}</div>
            <div className="text-2xl font-bold mb-0.5" style={{ color: p.color, fontFamily: "'Arial Black'" }}>
              {p.value ?? '--'}
            </div>
            {p.unit && <div className="text-[9px] text-[#888]">{p.unit}</div>}
            <MiniSparkline data={p.spark} color={p.color} />
          </div>
        ))}
      </div>

      <div className="bg-[#111118] rounded-lg border border-[#222] overflow-hidden">
        <div className="px-4 py-2 border-b border-[#1a1a2a] bg-[#0c0c18]">
          <span className="text-[10px] text-white font-bold uppercase tracking-wider">
            Compressor {compressorNumber} 30-Day History Coverage
          </span>
        </div>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-[#0a0a14]">
              {['Parameter', 'Current 30-Day Value', 'Unit', 'Coverage'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[#888] font-normal border-b border-[#1a1a2a]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#080810]">
              <td className="px-3 py-2 text-white font-bold">Desired Flow SP For PID Murphy</td>
              <td className="px-3 py-2 text-[#4fc3f7] font-bold">{desiredFlow?.toFixed(3) ?? '--'}</td>
              <td className="px-3 py-2 text-[#888]">MMSCFD</td>
              <td className="px-3 py-2 text-[#22c55e]">In 30-day panel export</td>
            </tr>
            <tr className="bg-[#0c0c18]">
              <td className="px-3 py-2 text-white font-bold">Run Status</td>
              <td className="px-3 py-2 text-[#22c55e] font-bold">{runStatus || '--'}</td>
              <td className="px-3 py-2 text-[#888]">state</td>
              <td className="px-3 py-2 text-[#22c55e]">In 30-day panel export</td>
            </tr>
            {COMPRESSOR_DEFAULT_VISIBLE_LABELS.map(label => (
              <tr key={label} className="bg-[#080810]">
                <td className="px-3 py-2 text-white">{label}</td>
                <td className="px-3 py-2 text-[#666]">--</td>
                <td className="px-3 py-2 text-[#666]">{getCompressorUnit(label) || '--'}</td>
                <td className="px-3 py-2 text-[#eab308]">Needs stored MLINK snapshot history</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[#0c0c18] rounded border border-[#1a1a2a] p-3 text-[10px] text-[#888]">
        The current 30-day panel export carries compressor run status and desired-flow history. Full trends for compressor temperatures, speeds, and pressures require stored MLINK compressor snapshots over the same 30-day window.
      </div>
    </div>
  )
}

function MiniSparkline({ data, color }) {
  if (!data?.length) return null
  const valid = data.filter(v => v != null && !isNaN(v))
  if (valid.length < 2) return null
  const mn = Math.min(...valid), mx = Math.max(...valid)
  const range = mx - mn || 1
  const W = 120, H = 24
  const pts = valid.map((v, i) => {
    const x = (i / (valid.length - 1)) * W
    const y = H - ((v - mn) / range) * H
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={W} height={H} className="mt-2 opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function WellAchievementSection({ klondike }) {
  const { data } = klondike
  const { isAdmin } = useAuth()
  const [spOverrides, setSpOverrides] = useState(null) // null = not loaded yet
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState([])
  const [saving, setSaving] = useState(false)

  // Load admin setpoint overrides from DB settings
  useEffect(() => {
    fetch('/api/data/settings', { credentials: 'include' })
      .then(r => r.ok ? r.json() : {})
      .then(s => {
        setSpOverrides(s.well_setpoint_overrides || null)
      })
      .catch(() => setSpOverrides(null))
  }, [])

  if (!data?.length) return null

  const wellCount = data[0]?.wells?.length || 0

  const stats = Array.from({ length: wellCount }, (_, i) => {
    const samples = data.filter(r => r.wells?.[i] != null)
    if (!samples.length) return { pct: null, avg: 0, sp: null, fromOverride: false }

    const avg = samples.reduce((s, r) => s + (r.wells[i]?.flowMmscfd ?? 0), 0) / samples.length

    // Admin override takes precedence over register data
    const override = spOverrides?.[i]
    let sp = null
    let fromOverride = false
    if (override && override > 0) {
      sp = override
      fromOverride = true
    } else {
      const validSps = samples
        .map(r => r.wells[i]?.calcDesiredFlow ?? r.wells[i]?.setpointMmscfd)
        .filter(v => v > 0)
      sp = validSps.length ? validSps.reduce((a, b) => a + b, 0) / validSps.length : null
    }

    if (sp === null) return { pct: null, avg, sp: null, fromOverride: false }

    const atTarget = samples.filter(r => {
      const flow = r.wells[i]?.flowMmscfd ?? 0
      return flow >= sp * 0.95
    }).length
    return { pct: (atTarget / samples.length) * 100, avg, sp, fromOverride }
  })

  const openEdit = () => {
    setEditValues(stats.map((s, i) => spOverrides?.[i] ?? s.sp ?? ''))
    setEditing(true)
  }

  const saveOverrides = async () => {
    setSaving(true)
    try {
      const overrides = {}
      editValues.forEach((v, i) => { if (v !== '' && !isNaN(+v) && +v > 0) overrides[i] = +v })
      await fetch('/api/data/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ well_setpoint_overrides: overrides }),
      })
      setSpOverrides(overrides)
      setEditing(false)
    } catch {}
    setSaving(false)
  }

  return (
    <div className="bg-[#111118] rounded-xl border border-[#222] p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[13px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>
          Well Injection Rate Achievement
        </h3>
        {isAdmin && (
          <button onClick={openEdit}
            className="text-[9px] px-2.5 py-1 rounded border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition">
            Set Desired Rates
          </button>
        )}
      </div>
      <p className="text-[9px] text-[#888] mb-4">% of time each well hit its desired injection rate (within 5%) - based on 30-day field data</p>

      <div className="grid grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-[9px] text-[#888] mb-1">Well {i + 1}</div>
            {s.pct === null ? (
              <>
                <div className="text-2xl font-bold mb-1 text-[#555]" style={{ fontFamily: "'Arial Black'" }}>N/A</div>
                <div className="w-full bg-[#1a1a2a] rounded h-2 overflow-hidden mb-1" />
                <div className="text-[8px] text-[#666]">avg {s.avg.toFixed(3)}</div>
                <div className="text-[8px] text-[#555]">no setpoint data</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-1" style={{
                  fontFamily: "'Arial Black'",
                  color: s.pct >= 90 ? '#22c55e' : s.pct >= 70 ? '#eab308' : '#E8200C'
                }}>
                  {s.pct.toFixed(0)}%
                </div>
                <div className="w-full bg-[#1a1a2a] rounded h-2 overflow-hidden mb-1">
                  <div className="h-full rounded transition-all" style={{
                    width: `${s.pct}%`,
                    background: s.pct >= 90 ? '#22c55e' : s.pct >= 70 ? '#eab308' : '#E8200C'
                  }} />
                </div>
                <div className="text-[8px] text-[#666]">avg {s.avg.toFixed(3)}</div>
                <div className="text-[8px] flex items-center justify-center gap-1" style={{ color: s.fromOverride ? '#f97316' : '#555' }}>
                  {s.fromOverride && <span title="Admin override">OVR</span>}
                  target {s.sp.toFixed(3)} MMscfd
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Admin setpoint override modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-5" style={{ background: '#0e0e1a', borderColor: '#2a2a40' }}>
            <h3 className="text-sm font-bold text-white mb-1">Override Well Desired Rates</h3>
            <p className="text-[10px] text-[#666] mb-4">
              The MLINK register for some wells returns incorrect desired-rate values. Enter the true targets here and they will be saved for achievement calculations.
            </p>
            <div className="space-y-2.5 mb-4">
              {editValues.map((v, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[11px] text-[#888] w-12">Well {i + 1}</span>
                  <input
                    type="number" step="0.001" min="0" max="5"
                    value={v}
                    onChange={e => setEditValues(ev => { const n = [...ev]; n[i] = e.target.value; return n })}
                    className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-orange-500"
                    style={{ background: '#07070f', border: '1px solid #2a2a40' }}
                    placeholder="MMSCFD"
                  />
                  <span className="text-[10px] text-[#555]">MMSCFD</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-xl text-[11px] font-bold text-[#888] border border-[#333] hover:text-white transition">Cancel</button>
              <button onClick={saveOverrides} disabled={saving}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold text-white transition disabled:opacity-50"
                style={{ background: '#f97316' }}>
                {saving ? 'Saving...' : 'Save Overrides'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RunReportCard({ label, report, loading }) {
  if (loading) return (
    <div className="bg-[#111118] rounded-xl border border-[#222] p-5 text-center">
      <h3 className="text-[13px] text-white font-bold mb-2">{label}</h3>
      <div className="text-[#555] text-sm animate-pulse">Loading report...</div>
    </div>
  )
  if (!report) return (
    <div className="bg-[#111118] rounded-xl border border-[#222] p-5 text-center">
      <h3 className="text-[13px] text-white font-bold mb-2">{label}</h3>
      <div className="text-[#E8200C] text-[11px]">No data available</div>
      <div className="text-[9px] text-[#555] mt-1">Report may not be ready yet - check back after midnight UTC</div>
    </div>
  )

  const summary = report.ReportSummary
  const runPct = summary?.Running?.Pct || 0
  const runHrs = summary?.Running?.Hrs || 0
  const stopHrs = summary?.Stopped?.Hrs || 0
  const faultHrs = summary?.Faulted?.Hrs || 0

  return (
    <div className="bg-[#111118] rounded-xl border border-[#222] p-5">
      <h3 className="text-[13px] text-white font-bold mb-3" style={{ fontFamily: "'Arial Black'" }}>{label}</h3>

      {/* Uptime gauge */}
      <div className="text-center mb-3">
        <div className="text-3xl font-bold" style={{ fontFamily: "'Arial Black'", color: runPct >= 0.95 ? '#22c55e' : runPct >= 0.8 ? '#eab308' : '#E8200C' }}>
          {(runPct * 100).toFixed(1)}%
        </div>
        <div className="text-[10px] text-[#888]">Uptime</div>
      </div>

      <div className="w-full bg-[#1a1a2a] rounded h-4 overflow-hidden mb-3">
        <div className="h-full bg-[#22c55e] rounded-l" style={{ width: `${runPct * 100}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
        <div>
          <div className="text-[#22c55e] font-bold">{runHrs.toFixed(1)}h</div>
          <div className="text-[#888]">Running</div>
        </div>
        <div>
          <div className="text-[#eab308] font-bold">{stopHrs.toFixed(1)}h</div>
          <div className="text-[#888]">Stopped</div>
        </div>
        <div>
          <div className="text-[#E8200C] font-bold">{faultHrs.toFixed(1)}h</div>
          <div className="text-[#888]">Faulted</div>
        </div>
      </div>

      {/* Event details */}
      {report.ReportDetail?.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-[8px] text-[#888] uppercase tracking-wider font-bold">Events</div>
          {report.ReportDetail.map((event, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] py-0.5 border-b border-[#1a1a2a] last:border-0">
              <div className={`w-2 h-2 rounded-full ${event.StatusStr === 'Running' ? 'bg-[#22c55e]' : event.StatusStr === 'Faulted' ? 'bg-[#E8200C]' : 'bg-[#eab308]'}`} />
              <span className="text-white font-bold">{event.StatusStr}</span>
              <span className="text-[#888]">{event.DurationHrs?.toFixed(1)}h</span>
              {event.Reason && <span className="text-[#E8200C] text-[9px] ml-auto">{event.Reason}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

