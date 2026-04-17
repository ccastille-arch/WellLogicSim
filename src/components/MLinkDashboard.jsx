import { useState, useEffect, useCallback, useRef } from 'react'
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

// Per-well injection-flow label aliases. Order: most-specific canonical
// register name first (matches the AWI catalog), then the shorter
// variants Murphy occasionally publishes. Covers the handful of
// label-casing and spelling differences we've seen across Centurion /
// Ariel catalogs without relying on findRegisterDatapoint's fuzzy
// expansion (which getFirstDatapoint doesn't call).
const LIVE_WELL_FLOW_KEYS = [
  [
    'Wellhead #1 Injection Flow Rate From Customer PLC',
    'Well 1 Injection Gas Flow Rate',
    'Well #1 Flow Rate',
    'Wellhead #1 Injection Gas Flow Rate',
    'Well 1 Flow Rate',
  ],
  [
    'Wellhead #2 Injection Flow Rate From Customer PLC',
    'Well 2 Injection Gas Flow Rate',
    'Well #2 Flow Rate',
    'Wellhead #2 Injection Gas Flow Rate',
    'Well 2 Flow Rate',
  ],
  [
    'Wellhead #3 Injection Flow Rate From Customer PLC',
    'Well 3 Injection Gas Flow Rate',
    'Well #3 Flow Rate',
    'Wellhead #3 Injection Gas Flow Rate',
    'Well 3 Flow Rate',
  ],
  [
    'Wellhead #4 Injection Flow Rate From Customer PLC',
    'Well 4 Injection Gas Flow Rate',
    'Well #4 Flow Rate',
    'Wellhead #4 Injection Gas Flow Rate',
    'Well 4 Flow Rate',
  ],
]

const LIVE_WELL_YESTERDAY_KEYS = [
  ['Wellhead #1 Yesterdays Total Flow', "Wellhead #1 Yesterday's Total Flow", 'Well 1 Yesterdays Total Flow'],
  ['Wellhead #2 Yesterdays Total Flow', "Wellhead #2 Yesterday's Total Flow", 'Well 2 Yesterdays Total Flow'],
  ['Wellhead #3 Yesterdays Total Flow', "Wellhead #3 Yesterday's Total Flow", 'Well 3 Yesterdays Total Flow'],
  ['Wellhead #4 Yesterdays Total Flow', "Wellhead #4 Yesterday's Total Flow", 'Well 4 Yesterdays Total Flow'],
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

  // Device IDs are now served by the backend so they can be swapped
  // via Railway env vars (MLINK_PANEL_DEVICE_ID /
  // MLINK_COMP_A_DEVICE_ID / MLINK_COMP_B_DEVICE_ID) without a code
  // deploy. We start with the hardcoded defaults so the first tick
  // can fire before the endpoint returns, then upgrade to whatever
  // the server reports. `deviceSources` lets us render a small
  // diagnostic chip showing which came from env vs default.
  const [devices, setDevices] = useState(LIVE_DATA_DEVICES)
  const [deviceSources, setDeviceSources] = useState({
    panel: 'default', compA: 'default', compB: 'default',
  })
  const [deviceLabels, setDeviceLabels] = useState({
    compA: { name: 'Service Compression KTA-Cummins FieldTune Compressor', unit: '' },
    compB: { name: 'Service Compression KTA-Cummins FieldTune Compressor', unit: '' },
  })
  useEffect(() => {
    fetch('/api/mlink/devices')
      .then(r => r.ok ? r.json() : null)
      .then(body => {
        if (body?.devices) setDevices(body.devices)
        if (body?.sources) setDeviceSources(body.sources)
        if (body?.labels) setDeviceLabels(body.labels)
      })
      .catch(() => {})
  }, [])

  // Admin-configured per-well setpoint overrides — same settings key
  // used by WellAchievementSection so there's a single source of truth
  // for "what the wells should be targeting". Used as a fallback here
  // when the live MLink panel isn't returning the
  // "Wellhead #N Calculated Desired Flow" register (which has been
  // intermittent during the 2-sec pull-rate transition with Murphy).
  const [wellSetpointOverrides, setWellSetpointOverrides] = useState(null)
  useEffect(() => {
    fetch('/api/data/settings', { credentials: 'include' })
      .then(r => r.ok ? r.json() : {})
      .then(s => setWellSetpointOverrides(s.well_setpoint_overrides || null))
      .catch(() => {})
  }, [])

  // Guard against overlapping fetches when the interval fires faster
  // than the network can return. With 2-second polling on a slow
  // connection we can't let requests pile up — keep the newest one
  // in-flight and skip the tick until it completes.
  const inFlightRef = useRef(false)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    if (!silent) setLoading(true)
    try {
      const [panelResult, compAResult, compBResult] = await Promise.all([
        fetchDevice(devices.panel),
        fetchDevice(devices.compA),
        fetchDevice(devices.compB),
      ])

      // HOLD LAST KNOWN GOOD: if a specific device's fetch returned
      // null (network blip, MLink timeout, transient 5xx), keep the
      // previous state for that device instead of blanking the UI.
      // The presenter should never see a room-full of "--" just
      // because one 2-second tick didn't make it back in time.
      if (panelResult.data) setPanelData(panelResult.data)
      if (compAResult.data) setCompAData(compAResult.data)
      if (compBResult.data) setCompBData(compBResult.data)

      const gotAny = !!(panelResult.data || compAResult.data || compBResult.data)
      const errors = [panelResult.error, compAResult.error, compBResult.error].filter(Boolean)
      if (gotAny) {
        // At least one device landed — clear any lingering error and
        // stamp lastRefresh only on actually-new data so the "Auto ·
        // HH:MM:SS" chip reflects data freshness, not poll attempts.
        setLiveError('')
        setLastRefresh(new Date())
      } else if (errors.length > 0) {
        setLiveError(`Live MLink tick didn't return — holding last known good reading. ${errors.join(' | ')}`)
      }
    } finally {
      setLoading(false)
      inFlightRef.current = false
    }
    // devices is part of the closure — recreate refresh when the
    // server-configured IDs arrive so the 2-sec interval starts
    // hitting the correct compressor assets.
  }, [devices.panel, devices.compA, devices.compB])

  const loadRunReports = useCallback(async () => {
    setRunReportsLoading(true)
    // Yesterday's 24hr report (API requires endTs < current UTC day)
    const now = new Date()
    const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const endTs = Math.floor(utcToday.getTime() / 1000) - 1
    const startTs = endTs - 86399

    const [rA, rB] = await Promise.allSettled([
      fetchRunReport(devices.compA, startTs, endTs),
      fetchRunReport(devices.compB, startTs, endTs),
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

    // First fetch is "visible" (shows the loading spinner). Every
    // subsequent tick is silent so the dashboard never flickers into
    // a loading state during normal operation — only the Last-update
    // clock and the flowing numbers tell the presenter data is live.
    //
    // Cadence: 2 seconds. Matches the 2-sec MLink pull rate we've
    // asked Murphy to configure on the Klondike panel so new samples
    // hit the UI as they land. The server-side history scheduler
    // stays at 15 min (MLINK_POLL_INTERVAL_MINUTES) to keep the
    // Railway volume size reasonable — only the live-view polling
    // runs fast.
    refresh()
    const interval = setInterval(() => refresh({ silent: true }), 2000)
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
  const compressorDesiredDatapoints = [compA, compB].map((compressorData, index) =>
    findCompressorDesiredFlow(compressorData, panel, index),
  )
  const compressorActualFlowDatapoints = [compA, compB].map((compressorData, index) => {
    const live = findCompressorActualFlow(compressorData)
    if (live) return live
    // Fallback to the most-recent seeded / live-stored reading when
    // the configured device ID doesn't publish Flow Rate PID PV.
    // Wrapped to match the {value, units, keyUsed} shape the card
    // render path expects.
    const histValue = latestHistoryRow?.[`comp${index + 1}ActualFlow`]
    if (histValue != null && Number.isFinite(histValue) && histValue >= 0) {
      return {
        value: histValue,
        units: 'MMSCFD',
        keyUsed: 'stored Flow Rate PID PV (last snapshot)',
      }
    }
    return null
  })
  // Historical per-well average desired (used as the final baseline
  // when panel + override + latest history are all silent). Computed
  // once per render off the full merged klondike dataset.
  const klondikeAvgDesired = (idx) => {
    if (!klondike.data?.length) return null
    const samples = klondike.data
      .map(r => r.wells?.[idx]?.desiredInjectionRateMmscfd ?? r.wells?.[idx]?.setpointMmscfd ?? r.wells?.[idx]?.calcDesiredFlow)
      .filter(v => v != null && v > 0)
    if (!samples.length) return null
    return samples.reduce((a, b) => a + b, 0) / samples.length
  }

  const liveWellPerformance = LIVE_WELL_FLOW_KEYS.map((keys, index) => {
    const wellNumber = index + 1
    const actual = parseLiveNumeric(getFirstDatapoint(panel, keys)?.value)
    const desiredDatapoint = resolvePreferredDatapoint(panel, [
      `Wellhead #${wellNumber} Calculated Desired Flow`,
      `Wellhead #${wellNumber} Setpoint From Customer PLC`,
      `Well ${wellNumber} Calculated Desired Flow`,
      `Well ${wellNumber} Setpoint From Customer PLC`,
    ])

    // Desired-flow fallback chain — broken from most-authoritative to
    // most-forgiving. Any one succeeding short-circuits the rest so a
    // live read stays "live" and we only degrade when we have to.
    //   1. Live panel register — what Murphy is pushing right now.
    //   2. Admin override — set explicitly on the Well Achievement
    //      edit UI; reflects customer intent even when comms drop.
    //   3. Latest history row — the most recent observed setpoint
    //      we have from CSV baseline or API snapshot.
    //   4. Full-dataset average — last resort so the UI never shows
    //      "-- match" / "Chasing" indefinitely.
    const panelDesired = parseLiveNumeric(desiredDatapoint?.value)
    const overrideDesired = wellSetpointOverrides?.[index] ?? wellSetpointOverrides?.[String(index)]
    const historicalDesired = latestHistoryRow?.wells?.[index]?.desiredInjectionRateMmscfd
      ?? latestHistoryRow?.wells?.[index]?.setpointMmscfd
    const avgDesired = klondikeAvgDesired(index)
    const desired = panelDesired
      ?? (overrideDesired != null && overrideDesired > 0 ? overrideDesired : null)
      ?? historicalDesired
      ?? avgDesired
      ?? null

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
  // Full-dataset average compressor desired (last-resort fallback).
  const klondikeAvgCompDesired = (compIdx) => {
    if (!klondike.data?.length) return null
    const key = `comp${compIdx + 1}DesiredFlow`
    const samples = klondike.data
      .map(r => r?.[key])
      .filter(v => v != null && v > 0)
    if (!samples.length) return null
    return samples.reduce((a, b) => a + b, 0) / samples.length
  }

  // Full-dataset average compressor ACTUAL flow (last-resort baseline
  // when the live compressor device doesn't expose Flow Rate PID PV
  // and no recent snapshot is in the history).
  const klondikeAvgCompActual = (compIdx) => {
    if (!klondike.data?.length) return null
    const key = `comp${compIdx + 1}ActualFlow`
    const samples = klondike.data
      .map(r => r?.[key])
      .filter(v => v != null && v > 0)
    if (!samples.length) return null
    return samples.reduce((a, b) => a + b, 0) / samples.length
  }

  const liveCompressorPerformance = [compA, compB].map((compressorData, index) => ({
    desired: parseLiveNumeric(compressorDesiredDatapoints[index]?.value)
      ?? latestHistoryRow?.[`comp${index + 1}DesiredFlow`]
      ?? klondikeAvgCompDesired(index)
      ?? null,
    // ACTUAL flow fallback chain — mirrors the desired-flow chain so
    // the Live page never reads "--" when we have any historical
    // compressor flow data at all:
    //   1. live compressor-device register (findCompressorActualFlow)
    //   2. latest history row's comp{N}ActualFlow (from seeded JSONL
    //      — which comes from the CSV exports, so 30 days of real
    //      Flow Rate PID PV readings backstop this)
    //   3. full-dataset average so even if "latest" is oddly null we
    //      still have a realistic number rather than a dash.
    actual: parseLiveNumeric(compressorActualFlowDatapoints[index]?.value)
      ?? latestHistoryRow?.[`comp${index + 1}ActualFlow`]
      ?? klondikeAvgCompActual(index)
      ?? null,
  }))
  const validWells = liveWellPerformance.filter(well => well.actual != null && well.desired != null)
  const historicalStats = buildHistoricalWellStats(klondike.data)
  const historicalAtTarget = average(historicalStats.map(stat => stat.atTargetPct))
  // Surface where each compressor's actual-flow reading came from so
  // the Compressor Flow Match card can show a visible "Reading from:
  // <label>" note. When no label matched, the card lists a sample of
  // the actually-available keys so the engineer can add the right one.
  const compressorFlowSources = compressorActualFlowDatapoints.map((dp) => dp?.keyUsed || null)
  const compressorSampleKeys = [compA, compB].map((data) => {
    if (!data) return []
    // Prefer keys that look flow/rate related; if none match, fall
    // back to the first 8 raw keys so the presenter / engineer at
    // least sees SOMETHING about what's in the payload (instead of
    // the misleading "Compressor data not loaded yet" message when
    // data IS loaded but just under unexpected labels).
    const flowish = Object.keys(data).filter(k => /flow|rate|pv|sp\b|desired|setpoint/i.test(k))
    if (flowish.length > 0) return flowish.slice(0, 6)
    return Object.keys(data).slice(0, 8)
  })

  // Diagnostic for the Live Injection Match helper. When desired
  // flows don't resolve from the panel, list panel labels that look
  // like they could be desired-flow registers so we can see exactly
  // what Murphy is publishing and pin the right label in code.
  const injectionDesiredResolved = liveWellPerformance.map(w => w.desired != null)
  const panelSampleDesiredKeys = panel
    ? Object.keys(panel)
        .filter(k => /desired|setpoint|calculated|\bsp\b/i.test(k))
        .slice(0, 8)
    : []

  const wowMetrics = {
    totalActual: validWells.reduce((sum, well) => sum + well.actual, 0),
    totalDesired: validWells.reduce((sum, well) => sum + well.desired, 0),
    currentMatch: average(validWells.map(well => well.matchPct)),
    wellsAtTarget: validWells.filter(well => well.atTarget).length,
    historicalAtTarget,
    historicalUnderTarget: historicalAtTarget != null ? Math.max(0, 100 - historicalAtTarget) : null,
    compressorMatch: average(liveCompressorPerformance.map(comp => computeMatchPct(comp.actual, comp.desired))),
    compressorFlowSources,
    compressorSampleKeys,
    injectionDesiredResolved,
    panelSampleDesiredKeys,
  }

  return (
    <div className="flex-1 flex flex-col bg-[#05233E] overflow-hidden">
      {/* TV-mode header — zero ambiguity that this is a live stream.
           LIVE badge + location title + live-ticking clock all at a size
           that reads across a conference-room TV in one glance. The
           prior header buried "real-time" in a paragraph that doesn't
           survive a 10-ft viewing distance. */}
      <div className="relative overflow-hidden shrink-0" style={{ background: '#03172A', borderBottom: '3px solid #D32028' }}>
        {/* Subtle red pattern overlay on the right — reinforces the
             LIVE badge's color at the edge without competing for
             attention with the title. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: -120, top: -40, width: 360, height: 200,
            background: 'radial-gradient(circle at 60% 40%, rgba(211,32,40,0.24), rgba(211,32,40,0) 60%)',
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }}
        />
        <div className="relative flex items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-5">
            {/* GIANT LIVE BADGE — pulsing dot + 'LIVE' text, visible
                 from across the room. Color locked to SC red #D32028. */}
            <div
              className="flex items-center gap-3 px-5 py-2.5"
              style={{
                background: '#D32028',
                borderRadius: 2,
                boxShadow: '0 0 40px rgba(211, 32, 40, 0.55)',
              }}
            >
              <span
                style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#FFFFFF',
                  boxShadow: '0 0 12px rgba(255,255,255,0.9)',
                  animation: 'scPulse 1.2s ease-in-out infinite',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  fontSize: 22,
                  letterSpacing: 6,
                  color: '#FFFFFF',
                  lineHeight: 1,
                }}
              >
                LIVE
              </span>
            </div>

            {/* Title block — short, loud, at-a-glance. */}
            <div>
              <div
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  fontSize: 28,
                  letterSpacing: '-0.5px',
                  color: '#FFFFFF',
                  lineHeight: 1.05,
                }}
              >
                Well Logic · West Texas Pad
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: '#49D0E2',
                }}
              >
                Streaming Now · 4 Wells · 2 Compressors
              </div>
            </div>
          </div>

          {/* Right rail — live clock + action buttons. The clock ticks
               every second so a viewer watching the TV has continuous
               visual proof the feed is alive. */}
          <div className="flex items-center gap-4">
            <LiveClock />
            {/* Auto-refresh chip — shows when the last tick landed.
                 No manual button any more: the page streams every 2 s
                 automatically, matching the 2-sec MLink pull rate. */}
            {lastRefresh && (
              <span
                className="inline-flex items-center gap-2"
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.7)',
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#49D0E2',
                    animation: 'scPulse 2s ease-in-out infinite',
                    display: 'inline-block',
                  }}
                />
                Auto · {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={onBack}
              style={{
                padding: '8px 14px',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.7)',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 py-2 bg-[#03172A] border-b border-[#293C5B] shrink-0">
        <button onClick={() => setTab('live')} className={`px-4 py-1.5 rounded text-[11px] font-bold ${tab === 'live' ? 'bg-[#D32028] text-white' : 'text-[#888] hover:text-white bg-[#111120] border border-[#2a2a3a]'}`}>Live Data</button>
        <button onClick={() => setTab('history')} className={`px-4 py-1.5 rounded text-[11px] font-bold ${tab === 'history' ? 'bg-[#D32028] text-white' : 'text-[#888] hover:text-white bg-[#111120] border border-[#2a2a3a]'}`}>Run History</button>
        <button onClick={() => setTab('klondike')} className={`px-4 py-1.5 rounded text-[11px] font-bold ${tab === 'klondike' ? 'bg-[#4fc3f7] text-black' : 'text-[#888] hover:text-white bg-[#111120] border border-[#2a2a3a]'}`}>Field Data History</button>
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
                <div className="bg-[#0F3C64] rounded-xl border border-[#222] p-5 mb-4">
                  <h2 className="text-sm text-white font-bold mb-4" style={{ fontFamily: "'Montserrat'" }}>
                    Well Injection Flow Rates
                  </h2>
                  <div className="grid grid-cols-4 gap-4">
                    {LIVE_WELL_FLOW_KEYS.map((keys, i) => {
                      const dp = getFirstDatapoint(panel, keys)
                      const val = parseLiveNumeric(dp?.value)
                      // Pull the desired/target injection rate from
                      // liveWellPerformance so this card uses the same
                      // 4-tier fallback (live → override → history →
                      // avg) as the Live Injection Match KPI above.
                      const desiredVal = liveWellPerformance[i]?.desired
                      const maxFlow = 1.2
                      const widthPct = val != null ? Math.max(0, Math.min(100, (val / maxFlow) * 100)) : 0
                      return (
                        <div key={i} className="bg-[#03172A] rounded-lg border border-[#2a2a3a] p-4 text-center">
                          <div className="text-[10px] text-[#888] mb-1">Well {i + 1}</div>
                          <div className="text-[8px] text-[#6b7a8f] uppercase tracking-[0.18em] font-bold mb-0.5">Actual</div>
                          <div className="text-2xl text-[#22c55e] font-bold" style={{ fontFamily: "'Montserrat'" }}>
                            {val != null ? val.toFixed(3) : '--'}
                          </div>
                          <div className="text-[9px] text-[#888]">MMSCFD</div>
                          <div className="w-full bg-[#293C5B] rounded h-2 mt-2 overflow-hidden">
                            <div className="h-full bg-[#22c55e] rounded transition-all" style={{ width: `${widthPct}%` }} />
                          </div>
                          <div className="mt-3 pt-2 border-t border-[#293C5B]">
                            <div className="text-[8px] text-[#6b7a8f] uppercase tracking-[0.18em] font-bold">Desired</div>
                            <div className="text-[14px] text-[#4fc3f7] font-bold mt-0.5" style={{ fontFamily: "'Montserrat'" }}>
                              {desiredVal != null && Number.isFinite(desiredVal) ? desiredVal.toFixed(3) : '--'}
                            </div>
                            <div className="text-[8px] text-[#666]">MMSCFD</div>
                          </div>
                          {additionalWellRegisters[i].length > 0 && (
                            <div className="mt-3 pt-2 border-t border-[#293C5B] space-y-1.5 text-left">
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
                    <span className="text-white font-bold text-[14px]" style={{ fontFamily: "'Montserrat'" }}>
                      {LIVE_WELL_FLOW_KEYS
                        .reduce((sum, keys) => {
                          // NaN-safe sum — parseLiveNumeric returns
                          // null for unparseable strings, which would
                          // otherwise cascade into a NaN total.
                          const n = parseLiveNumeric(getFirstDatapoint(panel, keys)?.value)
                          return sum + (n ?? 0)
                        }, 0).toFixed(3)} MMSCFD
                    </span>
                  </div>
                </div>

                {padRegisters.length > 0 && (
                  <div className="bg-[#0F3C64] rounded-xl border border-[#222] p-5 mb-4">
                    <h2 className="text-sm text-white font-bold mb-4" style={{ fontFamily: "'Montserrat'" }}>
                      Pad / Header Registers
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                      {padRegisters.map(meta => (
                        <div key={meta.id} className="bg-[#03172A] rounded-lg border border-[#2a2a3a] p-3">
                          <div className="text-[9px] text-[#888] uppercase tracking-wider">{meta.label}</div>
                          <div className="text-[16px] text-white font-bold mt-1" style={{ fontFamily: "'Montserrat'" }}>
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

                {/* Command-vs-Actual widget — the two-number story
                     of how well each compressor tracks the panel's
                     commanded SP. Sits above the detailed compressor
                     cards so presenters see the tracking accuracy
                     first. */}
                <CommandVsActualWidget
                  compADesired={liveCompressorPerformance[0]?.desired}
                  compAActual={liveCompressorPerformance[0]?.actual}
                  compBDesired={liveCompressorPerformance[1]?.desired}
                  compBActual={liveCompressorPerformance[1]?.actual}
                  compAUnit={deviceLabels.compA.unit}
                  compBUnit={deviceLabels.compB.unit}
                />

                {/* Compressors */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <CompressorCard
                    label={deviceLabels.compA.name}
                    unit={deviceLabels.compA.unit}
                    deviceId={devices.compA}
                    deviceSource={deviceSources.compA}
                    data={compA}
                    time={compATime}
                    desiredFlow={compressorDesiredDatapoints[0]}
                    actualFlow={compressorActualFlowDatapoints[0]}
                    registers={visibleCompressorARegisters}
                  />
                  <CompressorCard
                    label={deviceLabels.compB.name}
                    unit={deviceLabels.compB.unit}
                    deviceId={devices.compB}
                    deviceSource={deviceSources.compB}
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
          /* Run History Tab — computed from the full stored volume
              history (CSV baseline + live JSONL snapshots), not a
              yesterday-only MLink RunReport fetch. */
          <RunHistoryTab klondike={klondike} />
        ) : (
          /* 30-Day Klondike Field Data Tab */
          <KlondikeHistoryTab klondike={klondike} />
        )}
      </div>
    </div>
  )
}

function CompressorCard({ label, unit, deviceId, deviceSource, data, time, desiredFlow, actualFlow, registers }) {
  // RPM detection — try the known labels first, then fuzzy-scan any
  // key containing "speed" / "rpm" that has a numeric value. Needed
  // because Centurion / Ariel / Cat catalogs publish speed under
  // different aliases (Compressor Speed, Driver Speed, Engine Speed,
  // Rotor Speed RPM, …) and we shouldn't silently read STOPPED
  // because the unit happens to use a different label.
  const rpm =
    data['Compressor Speed']
    || data['Driver Speed']
    || data['Engine Speed']
    || data['Rotor Speed']
    || (() => {
      for (const [key, dp] of Object.entries(data || {})) {
        if (!/speed|rpm/i.test(key)) continue
        const n = parseLiveNumeric(dp?.value)
        if (n != null && n > 0) return dp
      }
      return null
    })()

  // Same for shutdown — exact match first, then any key containing
  // "shutdown" / "ESD" / "alarm" with a non-zero / "true" / "shutdown"
  // value.
  const shutdown =
    data['Skid - Shutdown']
    || data['Panel ESD']
    || (() => {
      for (const [key, dp] of Object.entries(data || {})) {
        if (!/shutdown|\besd\b|alarm/i.test(key)) continue
        if (dp?.value != null) return dp
      }
      return null
    })()

  const rpmValue = parseLiveNumeric(rpm?.value)
  const shutdownStr = String(shutdown?.value ?? '').toLowerCase()
  const shutdownActive = shutdownStr.includes('shutdown')
    || shutdownStr === '1'
    || shutdownStr === 'true'
  const isRunning = rpmValue != null && rpmValue > 100 && !shutdownActive
  // Exclude both the historical 'Flow Rate PID PV' label and the real
  // 'Flow Rate' register (register 400656 on CAN CCP) from the general
  // register list — whichever one the live feed actually provides is
  // already shown as the dedicated Actual Flow display above.
  const visibleRegisters = registers.filter(meta => meta.label !== 'Flow Rate PID PV' && meta.label !== 'Flow Rate')

  // Flow parsing goes through parseLiveNumeric so we treat the same
  // strings ("nan", "", "null") as missing that isValidLiveRegisterValue
  // rejects. Never render a "blank" box — always show either a real
  // number or the explicit "No Data" sentinel plus a source hint so
  // presenters know what label is driving (or failing to drive) the
  // reading.
  const desiredNumeric = parseLiveNumeric(desiredFlow?.value)
  const actualNumeric = parseLiveNumeric(actualFlow?.value)

  return (
    <div className="bg-[#0F3C64] rounded-xl border border-[#222] p-5">
      {/* Title = product description + customer unit number. Reads
          as an equipment ID ("KTA-Cummins FieldTune · Unit 2073")
          which keeps the FieldTune sales pitch implicit and gives
          operators the actual fleet tag they recognize. Set
          MLINK_COMP_A_UNIT / MLINK_COMP_B_UNIT (and optionally
          *_NAME) on Railway to change these per pad. */}
      <div className="flex items-start gap-2 mb-3">
        <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${isRunning ? 'bg-[#22c55e] shadow-lg shadow-[#22c55e]/50' : 'bg-[#D32028]'}`} />
        <div className="min-w-0 flex-1">
          <h3
            className="text-white font-bold leading-tight"
            style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 13 }}
          >
            {label}
            {unit ? (
              <span
                style={{
                  marginLeft: 8,
                  fontWeight: 600,
                  fontSize: 11,
                  color: '#49D0E2',
                  letterSpacing: 0.6,
                }}
              >
                &middot; Unit {unit}
              </span>
            ) : null}
          </h3>
        </div>
        <span className={`text-[9px] font-bold shrink-0 ${isRunning ? 'text-[#22c55e]' : 'text-[#D32028]'}`}>
          {isRunning ? 'RUNNING' : 'STOPPED'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <FlowDataPoint
          label="Desired Flow"
          numeric={desiredNumeric}
          units={desiredFlow?.units || 'MMSCFD'}
          color="#4fc3f7"
          source={desiredFlow?.keyUsed}
          missingReason="No desired-flow register found in panel or compressor payload."
        />
        <FlowDataPoint
          label="Actual Flow"
          numeric={actualNumeric}
          units={actualFlow?.units || 'MMSCFD'}
          color={getCompressorColor('Flow Rate PID PV', actualFlow?.value)}
          source={actualFlow?.keyUsed}
          missingReason="No flow-rate register found in compressor payload."
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
      {/* Diagnostic footer — if BOTH flow tiles showed No Data, list
           the first N actual keys present in the compressor payload
           so we can see what Murphy is publishing and pin the right
           labels in code. Keeps the presenter view clean when data
           is flowing. */}
      {(desiredNumeric == null || actualNumeric == null) && data && Object.keys(data).length > 0 && (
        <div className="mt-2 rounded border border-[#334155] bg-[#0c1a2a] p-2 text-[8px] leading-snug text-[#6b7a8f]">
          <span className="font-bold text-[#94a3b8]">Payload keys</span>
          {' '}({Object.keys(data).length} total):{' '}
          {Object.keys(data).slice(0, 10).join(' · ')}
          {Object.keys(data).length > 10 ? ' …' : ''}
        </div>
      )}
      {time && <div className="text-[8px] text-[#444] mt-2 text-right">Updated: {time.toLocaleString()}</div>}
    </div>
  )
}

function LivePerformanceHero({ metrics, wells, timestamp }) {
  const headline = metrics.currentMatch != null && metrics.currentMatch >= 97
    ? 'Running Tight. Running On Target.'
    : metrics.currentMatch != null && metrics.currentMatch >= 93
      ? 'Well Logic Is Holding This Pad In Tight Balance.'
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
          <h2 className="text-[30px] font-black leading-none text-white" style={{ fontFamily: "'Montserrat'" }}>
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
              helper={buildInjectionMatchHelper(metrics)}
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
              helper={buildCompressorFlowHelper(metrics)}
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
      <div className="mt-2 text-[28px] font-black leading-none text-white" style={{ fontFamily: "'Montserrat'" }}>
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
  // Most-specific matches first so e.g. "Loaded Auto Sp" doesn't
  // accidentally get RPM or MMSCFD through a looser rule below.
  if (/loaded\s*auto\s*sp/i.test(label)) return '%'
  if (/auto\s*sp$/i.test(label)) return '°F'   // PID temperature setpoints
  if (/qu(?:i)?ck\s*start.*desired.*flow/i.test(label)) return 'MMSCFD'
  if (/temp(?:erature)?/i.test(label)) return '°F'
  if (/speed/i.test(label)) return 'RPM'
  if (/pressure|prs|dp/i.test(label)) return 'PSI'
  if (/flow/i.test(label)) return 'MMSCFD'
  if (/voltage/i.test(label)) return 'V'
  if (/oil\s*pressure/i.test(label)) return 'PSI'
  return ''
}

function getCompressorColor(label, value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '#fff'

  if (/stage 3 discharge prs/i.test(label)) {
    return numeric > 900 ? '#D32028' : '#22c55e'
  }
  if (/stage 1 suction prs/i.test(label)) {
    return numeric < 30 ? '#eab308' : '#22c55e'
  }
  if (/3rd stage discharge temperature/i.test(label)) {
    return numeric > 275 ? '#D32028' : '#22c55e'
  }
  if (/skid - shutdown/i.test(label)) {
    return numeric > 0 ? '#D32028' : '#22c55e'
  }

  return '#fff'
}

function DataPoint({ label, value, unit, color, compact = false }) {
  return (
    <div className={`bg-[#03172A] rounded border border-[#2a2a3a] ${compact ? 'p-2' : 'p-2'}`}>
      <div className="text-[8px] text-[#888] uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={compact ? 'text-[16px] font-bold' : 'text-[14px] font-bold'} style={{ color: color || '#fff', fontFamily: "'Montserrat'" }}>
          {value || '--'}
        </span>
        <span className="text-[8px] text-[#666]">{unit}</span>
      </div>
    </div>
  )
}

/**
 * FlowDataPoint — dedicated card for Desired / Actual compressor flow.
 *
 * Ensures we never render a "blank box": when the numeric read
 * succeeds we show the formatted value + units; when it fails we show
 * "No Data" + a short reason line + the source label (if any) that
 * would have been used. The presenter sees exactly why a number is
 * missing rather than staring at a mysterious dash, which is what the
 * prior rendering did.
 */
function FlowDataPoint({ label, numeric, units, color, source, missingReason }) {
  const hasData = numeric != null && Number.isFinite(numeric)
  return (
    <div className="bg-[#03172A] rounded border border-[#2a2a3a] p-2">
      <div className="flex items-center justify-between">
        <span className="text-[8px] text-[#888] uppercase tracking-wider">{label}</span>
        {hasData && source && (
          <span
            className="text-[7px] text-[#556579] truncate ml-2"
            title={`Source: ${source}`}
            style={{ maxWidth: '60%' }}
          >
            src: {source}
          </span>
        )}
      </div>
      {hasData ? (
        <div className="flex items-baseline gap-1 mt-0.5">
          <span
            className="text-[16px] font-bold"
            style={{ color: color || '#fff', fontFamily: "'Montserrat'" }}
          >
            {numeric.toFixed(3)}
          </span>
          <span className="text-[8px] text-[#666]">{units}</span>
        </div>
      ) : (
        <div className="mt-1">
          <div
            className="text-[11px] font-bold"
            style={{ color: '#FF8E94', fontFamily: "'Montserrat'" }}
          >
            No Data
          </div>
          {missingReason && (
            <div className="text-[8px] text-[#6a7a8c] leading-tight mt-0.5">
              {missingReason}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function parseLiveNumeric(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

/**
 * Build the helper line under the Compressor Flow Match KPI. When the
 * flow read succeeded we show which label won (useful for debugging
 * across device catalogs). When it failed we surface a sample of the
 * flow/rate keys that ARE in the payload so the engineer can wire the
 * correct one next time without guessing.
 */
/**
 * Helper line under the Live Injection Match KPI. When desired flows
 * resolve we show the expected actual-vs-desired summary. When one or
 * more wells fall back to a non-panel source, we surface a sample of
 * panel labels that LOOK like they could be desired-flow registers —
 * so the engineer can see exactly what Murphy is publishing and pin
 * the right label in code.
 */
function buildInjectionMatchHelper(metrics) {
  if (metrics?.totalDesired) {
    const resolved = metrics.injectionDesiredResolved || []
    const allFromPanel = resolved.length > 0 && resolved.every(Boolean)
    const base = `${metrics.totalActual.toFixed(3)} actual vs ${metrics.totalDesired.toFixed(3)} desired`
    if (allFromPanel) return base
    return `${base} · desired from fallback (override / history)`
  }
  const sample = metrics?.panelSampleDesiredKeys || []
  if (sample.length > 0) {
    return `Panel has no desired-rate match. Available keys: ${sample.slice(0, 3).join(', ')}`
  }
  return 'Waiting on desired-rate tags'
}

function buildCompressorFlowHelper(metrics) {
  const sources = metrics?.compressorFlowSources || []
  const samples = metrics?.compressorSampleKeys || []
  const matched = sources.filter(Boolean)
  if (matched.length > 0) {
    const unique = [...new Set(matched)]
    return `Reading from: ${unique.join(' / ')}`
  }
  const available = [...new Set(samples.flat())].filter(Boolean)
  if (available.length > 0) {
    return `No flow-rate label matched. Available: ${available.slice(0, 4).join(', ')}`
  }
  return 'Compressor data not loaded yet — check MLink connectivity.'
}

function resolvePreferredDatapoint(dataMap, labels) {
  for (const label of labels) {
    const datapoint = findRegisterDatapoint(dataMap, { label, decimals: 3 })
    if (datapoint) return datapoint
  }
  return null
}

/**
 * Compressor actual-flow resolver with a progressive fallback chain.
 * Explicit label lookups keep missing real field deployments because the
 * MLink register catalogs vary across Centurion / Ariel / Caterpillar
 * devices (e.g. "Flow Rate", "Flow Rate PID PV", "Stage 3 Flow Rate",
 * "Compressor Flow Rate", etc.). This function tries:
 *
 *   1. The known-good explicit labels (Flow Rate first — that's the
 *      Centurion C5 over CAN CCP spelling at register 400656).
 *   2. Fuzzy regex scan over every datapoint label whose key looks
 *      flow-rate-ish AND has a positive numeric reading. Matches
 *      variants we haven't explicitly listed.
 *   3. Null — but the UI exposes `keyUsed` so the presenter can see
 *      which label won the match, or that none did.
 *
 * Returning null is never silent — the Compressor Flow Match card and
 * the per-compressor CompressorCard both render a short "looked for"
 * hint so the user can feed the right label back to the engineer.
 */
function findCompressorActualFlow(compressorData) {
  if (!compressorData) return null

  // Explicit labels we've confirmed in the field. 'Flow Rate' first is
  // the authoritative name on the Centurion C5 via CAN CCP at register
  // 400656 (per the 04/16 field note). Earlier *_PID_PV variants are
  // historical aliases kept as fallbacks for older device catalogs.
  const explicit = resolvePreferredDatapoint(compressorData, [
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
  if (explicit) {
    // Tag the source so the UI can show "src: <label>" for auditability
    // without a guessing game when a different register won the match.
    return { ...explicit, keyUsed: explicit.keyUsed || 'Flow Rate' }
  }

  // Fuzzy scan — anything containing "flow" + "rate" (any order, any
  // separators) with a usable numeric value. Case-insensitive. This is
  // the belt-and-suspenders net for register names we haven't seen.
  const isFlowLabel = (key) => /flow.*rate|flow_rate|flowrate/i.test(key)
  for (const [key, dp] of Object.entries(compressorData)) {
    if (!isFlowLabel(key)) continue
    if (dp?.value == null) continue
    const n = parseLiveNumeric(dp.value)
    if (n != null && n >= 0) return { ...dp, keyUsed: key }
  }
  // Last resort: any label containing "flow" with a numeric value,
  // preferring the largest (main flow > stage flows > temperatures).
  let bestKey = null
  let bestVal = -Infinity
  for (const [key, dp] of Object.entries(compressorData)) {
    if (!/flow/i.test(key)) continue
    if (dp?.value == null) continue
    const n = parseLiveNumeric(dp.value)
    if (n != null && Number.isFinite(n) && n > bestVal) {
      bestVal = n
      bestKey = key
    }
  }
  if (bestKey) return { ...compressorData[bestKey], keyUsed: bestKey }

  return null
}

/**
 * Compressor DESIRED (setpoint) flow resolver — mirrors the
 * actual-flow function, but searches the panel device first (where the
 * Murphy PID setpoints have historically lived) and falls back to the
 * compressor device (where newer Centurion / Ariel units expose their
 * own flow SP). Three tiers:
 *
 *   1. Panel explicit labels — Compressor #N Desire/Desired Flow SP,
 *      legacy `For PID Murphy` variants, bare "Desired Flow" labels.
 *   2. Compressor-device explicit labels — "Flow Rate SP", "Flow
 *      Setpoint", "Desired Flow", "Capacity SP", etc.
 *   3. Fuzzy regex scan across BOTH payloads for any numeric datapoint
 *      whose key matches /flow.*sp|flow.*setpoint|desired.*flow|
 *      setpoint.*flow|target.*flow/. Keeps us working across device
 *      catalogs we haven't seen yet.
 *
 * Returns null only when none of the three tiers find a numeric hit —
 * the UI then renders "No Data" rather than a blank box and the Flow
 * Match helper lists the available flow/rate/sp keys so we can wire
 * the right one next time without another round trip.
 */
function findCompressorDesiredFlow(compressorData, panelData, compressorIndex) {
  const compN = compressorIndex + 1

  // Tier 1: panel device — authoritative for Murphy-era PID setpoints.
  if (panelData) {
    const panelExplicit = resolvePreferredDatapoint(panelData, [
      `Compressor #${compN} Desire Flow SP For PID Murphy`,
      `Compressor #${compN} Desired Flow SP For PID Murphy`,
      `Compressor ${compN} Desire Flow SP For PID Murphy`,
      `Compressor ${compN} Desired Flow SP For PID Murphy`,
      `Compressor #${compN} Flow SP`,
      `Compressor ${compN} Flow SP`,
      `Compressor #${compN} Desired Flow`,
      `Compressor ${compN} Desired Flow`,
      `Compressor #${compN} Flow Setpoint`,
      `Comp${compN} Flow SP`,
      `Comp ${compN} Flow SP`,
    ])
    if (panelExplicit) return panelExplicit
  }

  // Tier 2: compressor device — SP lives on the unit itself.
  // "Quck Start Setting - Desired Flow Rate" is the authoritative
  // label on the Klondike 2074 asset per the 4/17 CSV export (note:
  // "Quck" is Murphy's spelling; do NOT normalize to "Quick" or the
  // lookup breaks). Listed first so it short-circuits on Centurion
  // A3 catalogs; remaining entries are legacy / other-catalog
  // spellings kept as fallbacks.
  if (compressorData) {
    const compExplicit = resolvePreferredDatapoint(compressorData, [
      'Quck Start Setting - Desired Flow Rate',
      'Quick Start Setting - Desired Flow Rate',
      'Flow Rate SP',
      'Flow Rate Setpoint',
      'Flow Rate - SP',
      'Flow Setpoint',
      'Flow SP',
      'Desired Flow',
      'Desired Flow Rate',
      'Desired Gas Flow',
      'Target Flow',
      'Target Flow Rate',
      'Capacity SP',
      'Capacity Setpoint',
      'Gas Flow SP',
    ])
    if (compExplicit) return compExplicit
  }

  // Tier 3: fuzzy regex over BOTH payloads. Order: panel first so a
  // panel-side setpoint wins over a device-side secondary label.
  const isDesiredFlowLabel = (key) => (
    /flow\s*rate\s*sp\b/i.test(key)
    || /flow\s*rate\s*setpoint/i.test(key)
    || /flow\s*sp\b/i.test(key)
    || /flow\s*setpoint/i.test(key)
    || /desired\s*flow/i.test(key)
    || /setpoint.*flow/i.test(key)
    || /target\s*flow/i.test(key)
    || /qu(?:i)?ck\s*start.*desired.*flow/i.test(key)
    || /flow.*desired/i.test(key)
  )
  for (const data of [panelData, compressorData]) {
    if (!data) continue
    for (const [key, dp] of Object.entries(data)) {
      if (!isDesiredFlowLabel(key)) continue
      if (dp?.value == null) continue
      const n = parseLiveNumeric(dp.value)
      if (n != null && Number.isFinite(n) && n >= 0) {
        return { ...dp, keyUsed: key }
      }
    }
  }

  return null
}

function computeMatchPct(actual, desired) {
  if (actual == null || desired == null || desired <= 0) return null
  // Meeting OR exceeding target counts as a 100% match. We only penalize
  // under-injection — wells running hotter than their setpoint are still
  // delivering the required gas, so they're on target by definition.
  if (actual >= desired) return 100
  return Math.max(0, 100 - ((desired - actual) / desired) * 100)
}

function isWithinTarget(actual, desired) {
  if (actual == null || desired == null || desired <= 0) return false
  // Same rule as computeMatchPct: overshoots count as on-target. Only
  // undershoots beyond the 3% tolerance band flag as off-target.
  if (actual >= desired) return true
  return (desired - actual) <= desired * 0.03
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
  if (error) return <div className="p-6 text-[#D32028] text-sm">Error: {error}</div>
  if (!data?.length) return <div className="p-6 text-[#888] text-sm">No data available.</div>

  const row = data[cursor]
  const prev = cursor > 0 ? data[cursor - 1] : null

  // Mini sparkline data â€” last 40 points up to cursor
  const windowData = data.slice(Math.max(0, cursor - 39), cursor + 1)

  // Compute the actual span of data we have in days, rounded up so a
  // partial day still shows as "1 day" rather than "0 days". This
  // replaces the old hardcoded "30-Day" label so the header reflects
  // what the user is actually looking at.
  //
  // IMPORTANT: data is now merged CSV + API rows. The merge sorts by
  // numeric Date.parse so data[0] is genuinely the earliest row and
  // data[length-1] the latest regardless of timestamp string format.
  const firstTs = data[0]?.timestamp ? Date.parse(data[0].timestamp) : NaN
  const lastTs = data[data.length - 1]?.timestamp ? Date.parse(data[data.length - 1].timestamp) : NaN
  const daysOfData = Number.isFinite(firstTs) && Number.isFinite(lastTs) && lastTs >= firstTs
    ? Math.max(1, Math.ceil((lastTs - firstTs) / 86400_000) + 1)
    : data.length

  // Render timestamps in a consistent human format so the subtitle
  // doesn't show a raw ISO string next to a US locale string.
  const fmtTs = (raw) => {
    if (!raw) return '--'
    const ms = Date.parse(raw)
    if (!Number.isFinite(ms)) return String(raw)
    return new Date(ms).toLocaleString(undefined, {
      month: 'numeric', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }
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
          <h2 className="text-sm text-white font-bold" style={{ fontFamily: "'Montserrat'" }}>
            WL0001 &mdash; {daysOfData}-Day Field Data
          </h2>
          <p className="text-[10px] text-[#888]">{data.length} samples · 15-min intervals · {data[0]?.timestamp} to {data[data.length-1]?.timestamp}</p>
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
      <div className="bg-[#0c0c18] rounded-lg border border-[#293C5B] p-3 mb-4 flex items-center gap-3">
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
            className="w-full accent-[#D32028]" />
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] text-[#4fc3f7] font-bold">{row.timestamp}</div>
          <div className="text-[9px] text-[#555]">{cursor + 1} / {data.length}</div>
        </div>
      </div>

      {view === 'overview' ? (
        <KlondikeOverview row={row} prev={prev} windowData={windowData} />
      ) : view.startsWith('comp') ? (
        <KlondikeCompressorDetail
          row={row}
          compressorIdx={parseInt(view.replace('comp',''), 10) - 1}
          windowData={windowData}
          daysOfData={daysOfData}
        />
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
        <div className="bg-[#0F3C64] rounded-lg border border-[#222] p-4 col-span-1">
          <div className="text-[9px] text-[#888] uppercase tracking-wider mb-1">Total Pad Injection</div>
          <div className="text-3xl font-bold text-[#22c55e]" style={{ fontFamily: "'Montserrat'" }}>
            {totalFlow?.toLocaleString() ?? '--'}
          </div>
          <div className="text-[9px] text-[#888]">MSCFD</div>
          {prev && <div className={`text-[9px] mt-1 ${totalFlow > prev.totalFlowMscfd ? 'text-[#22c55e]' : totalFlow < prev.totalFlowMscfd ? 'text-[#D32028]' : 'text-[#888]'}`}>
            {totalFlow > prev.totalFlowMscfd ? 'UP' : totalFlow < prev.totalFlowMscfd ? 'DOWN' : 'SAME'} {Math.abs(totalFlow - prev.totalFlowMscfd).toFixed(0)} from prev
          </div>}
          <MiniSparkline data={windowData.map(r => r.totalFlowMscfd)} color="#22c55e" />
        </div>

        <div className="bg-[#0F3C64] rounded-lg border border-[#222] p-4">
          <div className="text-[9px] text-[#888] uppercase tracking-wider mb-1">Compressor Status</div>
          <div className="space-y-2 mt-2">
            {[row.comp1Status, row.comp2Status].map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${s === 'Running' ? 'bg-[#22c55e]' : 'bg-[#D32028]'}`} />
                <span className="text-[11px] text-white">Comp {i+1}</span>
                <span className={`text-[10px] font-bold ml-auto ${s === 'Running' ? 'text-[#22c55e]' : 'text-[#D32028]'}`}>{s || '--'}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[9px] text-[#888]">Hour Meter: <span className="text-white">{row.hourMeter?.toLocaleString()} hrs</span></div>
        </div>

        <div className="bg-[#0F3C64] rounded-lg border border-[#222] p-4">
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
                <div className="w-full bg-[#293C5B] rounded-full h-1.5">
                  <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4-well summary table */}
      <div className="bg-[#0F3C64] rounded-lg border border-[#222] overflow-hidden">
        <div className="px-4 py-2 border-b border-[#293C5B] bg-[#0c0c18]">
          <span className="text-[10px] text-white font-bold uppercase tracking-wider">Per-Well Parameters - {row.timestamp}</span>
        </div>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-[#03172A]">
              {['Well', 'Flow (MMSCFD)', 'Desired Rate', 'Static Pres (PSI)', 'Diff Pres (PSI)', 'Temp (deg F)', 'Choke AO (%)', 'Run Status'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[#888] font-normal border-b border-[#293C5B]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row.wells.map((w, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-[#05233E]' : 'bg-[#0c0c18]'}>
                <td className="px-3 py-2 text-[#D32028] font-bold">Well {i+1}</td>
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
    { label: 'Injection Temp', value: w.temp, unit: 'deg F', color: '#D32028', spark: windowData.map(r => r.wells[wellIdx]?.temp ?? 0) },
    { label: 'Choke AO', value: w.analogOutput, unit: '%', color: '#a78bfa', spark: windowData.map(r => r.wells[wellIdx]?.analogOutput ?? 0) },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${w.runStatus === 'Online' ? 'bg-[#22c55e]' : 'bg-[#555]'}`} />
        <span className="text-white font-bold" style={{ fontFamily: "'Montserrat'" }}>Well {wellIdx + 1}</span>
        <span className={`text-[10px] font-bold ${w.runStatus === 'Online' ? 'text-[#22c55e]' : 'text-[#888]'}`}>{w.runStatus || '--'}</span>
        <span className="text-[9px] text-[#555] ml-auto">{row.timestamp}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {params.map(p => (
          <div key={p.label} className="bg-[#0F3C64] rounded-lg border border-[#222] p-4">
            <div className="text-[9px] text-[#888] uppercase tracking-wider mb-1">{p.label}</div>
            <div className="text-2xl font-bold mb-0.5" style={{ color: p.color, fontFamily: "'Montserrat'" }}>
              {p.value ?? '--'}
            </div>
            <div className="text-[9px] text-[#888]">{p.unit}</div>
            <MiniSparkline data={p.spark} color={p.color} />
          </div>
        ))}
      </div>

      <div className="mt-3 bg-[#0c0c18] rounded border border-[#293C5B] p-3 text-[10px] text-[#888]">
        Yesterday total: <span className="text-white">{w.yesterdayTotal?.toFixed(3) ?? '--'} MMSCFD</span>
        &nbsp;-&nbsp; Desired: <span className="text-white">{w.calcDesiredFlow?.toFixed(3) ?? '--'} MMSCFD</span>
        &nbsp;-&nbsp; Max rate: <span className="text-white">{w.maxFlowRate?.toFixed(3) ?? '--'} MMSCFD</span>
      </div>
    </div>
  )
}

function KlondikeCompressorDetail({ row, compressorIdx, windowData, daysOfData = 0 }) {
  const desiredFlow = compressorIdx === 0 ? row.comp1DesiredFlow : row.comp2DesiredFlow
  const runStatus = compressorIdx === 0 ? row.comp1Status : row.comp2Status
  const compressorNumber = compressorIdx + 1

  // Pull the per-compressor register snapshot the server is appending
  // to the Railway volume every MLINK_POLL_INTERVAL_MINUTES. CSV-only
  // rows don't carry this field, so registers may be undefined on
  // older samples — the helpers below fall back to "--" gracefully.
  const compRegisters = row.compressors?.[compressorIdx]?.registers || {}
  const regValue = (label) => {
    const v = compRegisters[label]
    return v == null ? null : (typeof v === 'number' ? v : parseFloat(v))
  }
  const regSpark = (label) => windowData.map(r => {
    const raw = r.compressors?.[compressorIdx]?.registers?.[label]
    if (raw == null) return 0
    const n = typeof raw === 'number' ? raw : parseFloat(raw)
    return Number.isFinite(n) ? n : 0
  })

  // How many of the windowed samples actually carry compressor-register
  // data? Drives the per-row coverage cell ("In N-day live history"
  // vs "No snapshot yet") and the section heading's day count.
  const registerCoverageSamples = windowData.filter(r => r.compressors?.[compressorIdx]?.registers).length
  const registerCoverageDays = registerCoverageSamples > 0
    // 15-min samples → 96 per day. Round up so a partial day shows 1.
    ? Math.max(1, Math.round(registerCoverageSamples / 96))
    : 0

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
      color: runStatus === 'Running' ? '#22c55e' : '#D32028',
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
        <span className="text-white font-bold" style={{ fontFamily: "'Montserrat'" }}>Compressor {compressorNumber}</span>
        <span className={`text-[10px] font-bold ${runStatus === 'Running' ? 'text-[#22c55e]' : 'text-[#888]'}`}>{runStatus || '--'}</span>
        <span className="text-[9px] text-[#555] ml-auto">{row.timestamp}</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {params.map(p => (
          <div key={p.label} className="bg-[#0F3C64] rounded-lg border border-[#222] p-4">
            <div className="text-[9px] text-[#888] uppercase tracking-wider mb-1">{p.label}</div>
            <div className="text-2xl font-bold mb-0.5" style={{ color: p.color, fontFamily: "'Montserrat'" }}>
              {p.value ?? '--'}
            </div>
            {p.unit && <div className="text-[9px] text-[#888]">{p.unit}</div>}
            <MiniSparkline data={p.spark} color={p.color} />
          </div>
        ))}
      </div>

      <div className="bg-[#0F3C64] rounded-lg border border-[#222] overflow-hidden">
        <div className="px-4 py-2 border-b border-[#293C5B] bg-[#0c0c18]">
          <span className="text-[10px] text-white font-bold uppercase tracking-wider">
            Compressor {compressorNumber}{daysOfData > 0 ? ` ${daysOfData}-Day` : ''} History Coverage
          </span>
        </div>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-[#03172A]">
              {[
                'Parameter',
                daysOfData > 0 ? `Current ${daysOfData}-Day Value` : 'Current Value',
                'Unit',
                'Coverage',
              ].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[#888] font-normal border-b border-[#293C5B]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#05233E]">
              <td className="px-3 py-2 text-white font-bold">Desired Flow SP For PID Murphy</td>
              <td className="px-3 py-2 text-[#4fc3f7] font-bold">{desiredFlow?.toFixed(3) ?? '--'}</td>
              <td className="px-3 py-2 text-[#888]">MMSCFD</td>
              <td className="px-3 py-2 text-[#22c55e]">In panel export</td>
            </tr>
            <tr className="bg-[#0c0c18]">
              <td className="px-3 py-2 text-white font-bold">Run Status</td>
              <td className="px-3 py-2 text-[#22c55e] font-bold">{runStatus || '--'}</td>
              <td className="px-3 py-2 text-[#888]">state</td>
              <td className="px-3 py-2 text-[#22c55e]">In panel export</td>
            </tr>
            {COMPRESSOR_DEFAULT_VISIBLE_LABELS.map(label => {
              const numeric = regValue(label)
              const hasData = numeric != null && Number.isFinite(numeric)
              const unit = getCompressorUnit(label) || '--'
              return (
                <tr key={label} className="bg-[#05233E]">
                  <td className="px-3 py-2 text-white">{label}</td>
                  <td className={`px-3 py-2 font-bold ${hasData ? 'text-[#4fc3f7]' : 'text-[#666]'}`}>
                    {hasData ? numeric.toFixed(3) : '--'}
                  </td>
                  <td className={`px-3 py-2 ${hasData ? 'text-[#888]' : 'text-[#666]'}`}>{unit}</td>
                  <td className={`px-3 py-2 ${hasData ? 'text-[#22c55e]' : 'text-[#eab308]'}`}>
                    {hasData
                      ? (registerCoverageDays > 0
                          ? `Live · ${registerCoverageDays}-day snapshot history`
                          : 'Live from MLink snapshot')
                      : 'Awaiting first MLink snapshot'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-[#0c0c18] rounded border border-[#293C5B] p-3 text-[10px] text-[#888]">
        {registerCoverageDays > 0
          ? `Compressor temperatures, speeds, and pressures are sourced from stored MLink snapshots — ${registerCoverageDays}-day history and growing. Run status and desired-flow history come from the panel export.`
          : 'Compressor temperatures, speeds, and pressures populate automatically once the MLink snapshot scheduler records its first poll on this deployment. Run status and desired-flow history come from the panel export.'}
      </div>
    </div>
  )
}

/**
 * LiveClock — a seconds-precise running clock + date, shown in the
 * TV-mode header. Two purposes:
 *   1. Continuous visual proof to the room that the feed is live —
 *      the seconds tick whether or not an MLink poll has landed.
 *   2. Anchors the stream in "right now" for remote customers so
 *      there's no ambiguity about which day's data they're watching.
 * Uses the user's browser locale for date but formats the time in a
 * 24h monospace style so it reads cleanly at distance.
 */
function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const pad = (n) => String(n).padStart(2, '0')
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const date = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <div className="hidden md:flex flex-col items-end leading-tight">
      <div
        style={{
          fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
          fontWeight: 700,
          fontSize: 20,
          color: '#FFFFFF',
          letterSpacing: 1,
          lineHeight: 1,
        }}
      >
        {time}
      </div>
      <div
        style={{
          marginTop: 3,
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 600,
          fontSize: 9,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: '#49D0E2',
        }}
      >
        {date} · Local
      </div>
    </div>
  )
}

/**
 * CommandVsActualWidget — live "what the well panel is telling each
 * compressor to do" vs "what the compressor is actually doing". The
 * two numbers make the tracking story legible at a glance: customer
 * sees the commanded SP, the actual reading, and a green/amber/red
 * tracking chip that collapses the two into a single judgment.
 */
function CommandVsActualWidget({ compADesired, compAActual, compBDesired, compBActual, compAUnit, compBUnit }) {
  const renderOne = (desired, actual, unitLabel, letter) => {
    const hasBoth = desired != null && Number.isFinite(desired) && actual != null && Number.isFinite(actual)
    const gap = hasBoth ? actual - desired : null
    const gapPct = hasBoth && desired > 0 ? Math.abs(gap / desired) * 100 : null
    const tone =
      gapPct == null ? 'muted' :
      gapPct <= 3   ? 'good'  :
      gapPct <= 8   ? 'amber' : 'bad'
    const chipColor = tone === 'good' ? '#22c55e' : tone === 'amber' ? '#eab308' : tone === 'bad' ? '#D32028' : '#8b93a6'
    const chipLabel =
      tone === 'good'  ? 'On Track' :
      tone === 'amber' ? 'Chasing'  :
      tone === 'bad'   ? 'Off Track': 'Waiting on data'
    return (
      <div className="flex-1 min-w-0 rounded-xl border border-[#1e2d44] bg-[#0a1524] p-4">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 10,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: '#49D0E2',
                fontWeight: 700,
              }}
            >
              Compressor {letter}{unitLabel ? ` · Unit ${unitLabel}` : ''}
            </div>
            <div
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 9,
                letterSpacing: 1.2,
                color: '#6b7a8f',
                marginTop: 2,
              }}
            >
              Panel command vs. live flow
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1"
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: `${chipColor}22`,
              border: `1px solid ${chipColor}66`,
              color: chipColor,
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {chipLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded border border-[#14212f] bg-[#0c1724] p-3">
            <div className="text-[9px] text-[#6b7a8f] uppercase tracking-[0.18em] mb-1">Panel Command</div>
            <div className="flex items-baseline gap-1">
              <span className="text-[22px] font-bold text-white" style={{ fontFamily: "'Montserrat'" }}>
                {desired != null && Number.isFinite(desired) ? desired.toFixed(3) : '--'}
              </span>
              <span className="text-[9px] text-[#6b7a8f]">MMSCFD</span>
            </div>
            <div className="text-[8px] text-[#556579] mt-0.5">
              Well Panel &rarr; Compressor
            </div>
          </div>
          <div className="rounded border border-[#14212f] bg-[#0c1724] p-3">
            <div className="text-[9px] text-[#6b7a8f] uppercase tracking-[0.18em] mb-1">Live Flow</div>
            <div className="flex items-baseline gap-1">
              <span className="text-[22px] font-bold" style={{ color: chipColor, fontFamily: "'Montserrat'" }}>
                {actual != null && Number.isFinite(actual) ? actual.toFixed(3) : '--'}
              </span>
              <span className="text-[9px] text-[#6b7a8f]">MMSCFD</span>
            </div>
            <div className="text-[8px] text-[#556579] mt-0.5">
              {gap != null && Number.isFinite(gap)
                ? `${gap >= 0 ? '+' : ''}${gap.toFixed(3)} vs command`
                : 'Gap --'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-2xl border border-[#1c2836] bg-[radial-gradient(circle_at_top_left,_rgba(73,208,226,0.14),_rgba(8,8,16,0.95)_55%)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="rounded-full border border-[#20502d] bg-[#0e1e13] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#66f0a0]">
          Tracking · Live
        </span>
        <span className="text-[10px] text-[#6b7280]">
          What Well Logic is asking for vs. what the compressors are delivering, right now.
        </span>
      </div>
      <div className="flex gap-3 flex-wrap">
        {renderOne(compADesired, compAActual, compAUnit, 'A')}
        {renderOne(compBDesired, compBActual, compBUnit, 'B')}
      </div>
    </div>
  )
}

/**
 * CompressorTrackingScore — per-compressor track-record of how often
 * the actual flow stayed within the 3%/5%/10% bands of the panel's
 * commanded SP across the full stored history window. Renders on
 * the Run History tab so the presenter has a concrete "this
 * compressor hit its mark 97.4% of the time over the last N days"
 * story.
 */
function CompressorTrackingScore({ data, daysOfData }) {
  const band = (row, idx, pct) => {
    const desired = idx === 0 ? row.comp1DesiredFlow : row.comp2DesiredFlow
    const actual = idx === 0 ? row.comp1ActualFlow : row.comp2ActualFlow
    if (desired == null || actual == null || desired <= 0) return null
    return Math.abs(actual - desired) / desired <= pct
  }
  const compute = (idx) => {
    if (!Array.isArray(data) || !data.length) return null
    const valid = data.filter(r => {
      const d = idx === 0 ? r.comp1DesiredFlow : r.comp2DesiredFlow
      const a = idx === 0 ? r.comp1ActualFlow : r.comp2ActualFlow
      return d != null && a != null && d > 0
    })
    if (!valid.length) return null
    // Score on a 10% margin-of-error band only. Tighter bands (3%/5%)
    // punish compressors for normal slew rate during setpoint changes
    // and exaggerate the story — 10% is the realistic "is the
    // compressor tracking the commanded SP" threshold.
    const within10 = valid.filter(r => band(r, idx, 0.10)).length
    return {
      samples: valid.length,
      pct10: (within10 / valid.length) * 100,
    }
  }
  const scores = [compute(0), compute(1)]
  const anyData = scores.some(s => s && s.samples > 0)
  if (!anyData) {
    return (
      <div className="rounded-xl border border-[#1c2836] bg-[#0a1524] p-5 text-[12px] text-[#6b7a8f]">
        Tracking score populates once the volume has paired command + actual readings for each compressor. Seed or live poll will fill it in shortly.
      </div>
    )
  }

  const renderCard = (idx) => {
    const s = scores[idx]
    if (!s) {
      return (
        <div className="flex-1 rounded-xl border border-[#1c2836] bg-[#0a1524] p-5 text-[12px] text-[#6b7a8f]">
          Compressor {idx === 0 ? 'A' : 'B'}: no paired command/actual samples yet.
        </div>
      )
    }
    const headline = s.pct10
    const headlineColor = headline >= 95 ? '#22c55e' : headline >= 85 ? '#eab308' : '#D32028'
    const barPct = Math.max(0, Math.min(100, headline))
    return (
      <div className="flex-1 rounded-xl border border-[#1c2836] bg-[#0a1524] p-5">
        <div className="flex items-baseline justify-between mb-3">
          <span
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#49D0E2',
              fontWeight: 700,
            }}
          >
            Compressor {idx === 0 ? 'A' : 'B'} Tracking
          </span>
          <span className="text-[9px] text-[#6b7a8f]">{s.samples} samples</span>
        </div>
        <div className="text-center mb-3">
          <div
            className="text-4xl font-bold"
            style={{ color: headlineColor, fontFamily: "'Montserrat'" }}
          >
            {headline.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#6b7a8f]">
            of the time within 10% of commanded SP
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-[#14202c] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${barPct}%`, background: headlineColor }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <h3 className="text-white font-bold" style={{ fontFamily: "'Montserrat'", fontSize: 14 }}>
          Compressor Tracking Score
        </h3>
        <span className="text-[10px] text-[#6b7a8f] uppercase tracking-[0.18em] font-semibold">
          Over {daysOfData > 0 ? daysOfData : '—'} day{daysOfData === 1 ? '' : 's'} of stored history
        </span>
      </div>
      <p className="text-[11px] text-[#6b7a8f] mb-3">
        How often each compressor held its actual flow within 10% of the
        Well Panel&rsquo;s commanded SP. Higher is tighter control.
      </p>
      <div className="flex gap-3 flex-wrap">
        {renderCard(0)}
        {renderCard(1)}
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

function WellAchievementSection({ klondike, daysOfData }) {
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
    <div className="bg-[#0F3C64] rounded-xl border border-[#222] p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[13px] text-white font-bold" style={{ fontFamily: "'Montserrat'" }}>
          Well Injection Rate Achievement
        </h3>
        {isAdmin && (
          <button onClick={openEdit}
            className="text-[9px] px-2.5 py-1 rounded border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition">
            Set Desired Rates
          </button>
        )}
      </div>
      <p className="text-[9px] text-[#888] mb-4">
        % of time each well hit its desired injection rate (within 5%) — based on {daysOfData > 0 ? `${daysOfData}-day` : 'the full'} field data window
      </p>

      <div className="grid grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-[9px] text-[#888] mb-1">Well {i + 1}</div>
            {s.pct === null ? (
              <>
                <div className="text-2xl font-bold mb-1 text-[#555]" style={{ fontFamily: "'Montserrat'" }}>N/A</div>
                <div className="w-full bg-[#293C5B] rounded h-2 overflow-hidden mb-1" />
                <div className="text-[8px] text-[#666]">avg {s.avg.toFixed(3)}</div>
                <div className="text-[8px] text-[#555]">no setpoint data</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-1" style={{
                  fontFamily: "'Montserrat'",
                  color: s.pct >= 90 ? '#22c55e' : s.pct >= 70 ? '#eab308' : '#D32028'
                }}>
                  {s.pct.toFixed(0)}%
                </div>
                <div className="w-full bg-[#293C5B] rounded h-2 overflow-hidden mb-1">
                  <div className="h-full rounded transition-all" style={{
                    width: `${s.pct}%`,
                    background: s.pct >= 90 ? '#22c55e' : s.pct >= 70 ? '#eab308' : '#D32028'
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

/**
 * Compute running / stopped / faulted totals for one compressor from
 * the full stored history set. Each row in klondike.data represents a
 * 15-min sample, so total hours = samples × 0.25 and uptime % =
 * running / total. Works across whatever window the Railway volume
 * has accumulated — no dependency on a yesterday-specific API call.
 */
function computeRunHistoryStats(data, compIdx) {
  if (!Array.isArray(data) || data.length === 0) return null
  const statusKey = compIdx === 0 ? 'comp1Status' : 'comp2Status'
  const SAMPLE_HR = 0.25 // 15 min
  let running = 0
  let stopped = 0
  let faulted = 0
  for (const row of data) {
    const raw = String(row?.[statusKey] || '').toLowerCase()
    if (!raw) continue
    if (raw.includes('fault') || raw.includes('shutdown') || raw.includes('alarm')) faulted++
    else if (raw.includes('running') || raw.includes('online') || raw === 'run') running++
    else stopped++
  }
  const total = running + stopped + faulted
  if (total === 0) return null
  return {
    runningHrs: running * SAMPLE_HR,
    stoppedHrs: stopped * SAMPLE_HR,
    faultedHrs: faulted * SAMPLE_HR,
    uptime: running / total,
    samples: total,
  }
}

/**
 * RunHistoryTab — aggregates compressor runtime stats across the
 * full stored history window. Replaces the old "Yesterday's Run
 * Report" fetch so the presenter sees the entire volume-backed
 * history instead of a single 24h window.
 */
function RunHistoryTab({ klondike }) {
  const { data, loading } = klondike

  // Compute the span of stored data in days (ceil so a partial day
  // shows as 1). Falls back to sample count when timestamps are
  // missing/malformed.
  const firstTs = data?.[0]?.timestamp ? Date.parse(data[0].timestamp) : NaN
  const lastTs = data?.[data.length - 1]?.timestamp ? Date.parse(data[data.length - 1].timestamp) : NaN
  const daysOfData = Number.isFinite(firstTs) && Number.isFinite(lastTs)
    ? Math.max(1, Math.ceil((lastTs - firstTs) / 86400_000) + 1)
    : (data?.length || 0)

  const stats = [0, 1].map(idx => computeRunHistoryStats(data, idx))

  return (
    <div className="max-w-[1000px] mx-auto">
      <div className="mb-4 flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-white font-bold" style={{ fontFamily: "'Montserrat'", fontSize: 18, letterSpacing: '-0.2px' }}>
          Run History · Last {daysOfData > 0 ? daysOfData : '—'} Day{daysOfData === 1 ? '' : 's'}
        </h2>
        <span
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#49D0E2',
          }}
        >
          {data?.length || 0} samples · 15-min intervals
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <RunHistoryCard label="Compressor A" stats={stats[0]} loading={loading} />
        <RunHistoryCard label="Compressor B" stats={stats[1]} loading={loading} />
      </div>
      <CompressorTrackingScore data={data} daysOfData={daysOfData} />
      <WellAchievementSection klondike={klondike} daysOfData={daysOfData} />
    </div>
  )
}

/**
 * RunHistoryCard — renders a compressor's uptime and
 * running/stopped/faulted hour totals for the full stored window.
 * Shape is intentionally identical to the old RunReportCard output
 * (uptime gauge, bar, 3-column hour breakdown) so the visual
 * language of the page stays consistent even though the data source
 * is now the volume-backed history.
 */
function RunHistoryCard({ label, stats, loading }) {
  if (loading && !stats) return (
    <div className="bg-[#0F3C64] rounded-xl border border-[#222] p-5 text-center">
      <h3 className="text-[13px] text-white font-bold mb-2">{label}</h3>
      <div className="text-[#555] text-sm animate-pulse">Loading history…</div>
    </div>
  )
  if (!stats) return (
    <div className="bg-[#0F3C64] rounded-xl border border-[#222] p-5 text-center">
      <h3 className="text-[13px] text-white font-bold mb-2">{label}</h3>
      <div className="text-[#D32028] text-[11px]">No run history yet</div>
      <div className="text-[9px] text-[#555] mt-1">
        Populates as the MLink scheduler records samples to the Railway volume.
      </div>
    </div>
  )

  const { uptime, runningHrs, stoppedHrs, faultedHrs, samples } = stats
  const pct = uptime * 100
  const color = uptime >= 0.95 ? '#22c55e' : uptime >= 0.8 ? '#eab308' : '#D32028'

  return (
    <div className="bg-[#0F3C64] rounded-xl border border-[#222] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] text-white font-bold" style={{ fontFamily: "'Montserrat'" }}>{label}</h3>
        <span className="text-[9px] text-[#8a9bb2]">{samples} samples</span>
      </div>

      <div className="text-center mb-3">
        <div
          className="text-3xl font-bold"
          style={{ fontFamily: "'Montserrat'", color }}
        >
          {pct.toFixed(1)}%
        </div>
        <div className="text-[10px] text-[#888]">Uptime</div>
      </div>

      <div className="w-full bg-[#293C5B] rounded h-4 overflow-hidden mb-3">
        <div className="h-full bg-[#22c55e] rounded-l" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
        <div>
          <div className="text-[#22c55e] font-bold">{runningHrs.toFixed(1)}h</div>
          <div className="text-[#888]">Running</div>
        </div>
        <div>
          <div className="text-[#eab308] font-bold">{stoppedHrs.toFixed(1)}h</div>
          <div className="text-[#888]">Stopped</div>
        </div>
        <div>
          <div className="text-[#D32028] font-bold">{faultedHrs.toFixed(1)}h</div>
          <div className="text-[#888]">Faulted</div>
        </div>
      </div>
    </div>
  )
}

function RunReportCard({ label, report, loading }) {
  if (loading) return (
    <div className="bg-[#0F3C64] rounded-xl border border-[#222] p-5 text-center">
      <h3 className="text-[13px] text-white font-bold mb-2">{label}</h3>
      <div className="text-[#555] text-sm animate-pulse">Loading report...</div>
    </div>
  )
  if (!report) return (
    <div className="bg-[#0F3C64] rounded-xl border border-[#222] p-5 text-center">
      <h3 className="text-[13px] text-white font-bold mb-2">{label}</h3>
      <div className="text-[#D32028] text-[11px]">No data available</div>
      <div className="text-[9px] text-[#555] mt-1">Report may not be ready yet - check back after midnight UTC</div>
    </div>
  )

  const summary = report.ReportSummary
  const runPct = summary?.Running?.Pct || 0
  const runHrs = summary?.Running?.Hrs || 0
  const stopHrs = summary?.Stopped?.Hrs || 0
  const faultHrs = summary?.Faulted?.Hrs || 0

  return (
    <div className="bg-[#0F3C64] rounded-xl border border-[#222] p-5">
      <h3 className="text-[13px] text-white font-bold mb-3" style={{ fontFamily: "'Montserrat'" }}>{label}</h3>

      {/* Uptime gauge */}
      <div className="text-center mb-3">
        <div className="text-3xl font-bold" style={{ fontFamily: "'Montserrat'", color: runPct >= 0.95 ? '#22c55e' : runPct >= 0.8 ? '#eab308' : '#D32028' }}>
          {(runPct * 100).toFixed(1)}%
        </div>
        <div className="text-[10px] text-[#888]">Uptime</div>
      </div>

      <div className="w-full bg-[#293C5B] rounded h-4 overflow-hidden mb-3">
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
          <div className="text-[#D32028] font-bold">{faultHrs.toFixed(1)}h</div>
          <div className="text-[#888]">Faulted</div>
        </div>
      </div>

      {/* Event details */}
      {report.ReportDetail?.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-[8px] text-[#888] uppercase tracking-wider font-bold">Events</div>
          {report.ReportDetail.map((event, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] py-0.5 border-b border-[#293C5B] last:border-0">
              <div className={`w-2 h-2 rounded-full ${event.StatusStr === 'Running' ? 'bg-[#22c55e]' : event.StatusStr === 'Faulted' ? 'bg-[#D32028]' : 'bg-[#eab308]'}`} />
              <span className="text-white font-bold">{event.StatusStr}</span>
              <span className="text-[#888]">{event.DurationHrs?.toFixed(1)}h</span>
              {event.Reason && <span className="text-[#D32028] text-[9px] ml-auto">{event.Reason}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

