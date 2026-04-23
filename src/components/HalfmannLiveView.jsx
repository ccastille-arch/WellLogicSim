import { useState, useEffect, useCallback } from 'react'
import {
  formatLiveRegisterValue,
  getVisibleLiveRegisters,
  loadAwiRegisterCatalog,
  parseLiveDatapoints,
} from '../engine/liveRegisters'

// Public read-only live MLink dashboard for Halfmann 1214 — no auth required, no navigation
// API key stays server-side; this page calls the same /api/mlink/* proxy routes.

const API_BASE = import.meta.env.VITE_API_URL || ''
const REFRESH_INTERVAL_S = 60 // 1 minute

const HALFMANN_DEVICES = {
  panel:   '2507-501508', // main well control panel
  unit2130: '2507-500709', // 2130 Halfmann 1214 01H/02H/03H
  unit2127: '2504-504108', // 2127 Halfmann 1214 01H/02H/03H
  unit2129: '2504-504102', // 2129 Halfmann 1214 01H/02H/03H
  unit2128: '2507-500076', // 2128 Halfmann 1214 01H/02H/03H
}

const UNIT_CARDS = [
  { key: 'unit2130', label: 'Unit 2130', deviceId: HALFMANN_DEVICES.unit2130 },
  { key: 'unit2127', label: 'Unit 2127', deviceId: HALFMANN_DEVICES.unit2127 },
  { key: 'unit2129', label: 'Unit 2129', deviceId: HALFMANN_DEVICES.unit2129 },
  { key: 'unit2128', label: 'Unit 2128', deviceId: HALFMANN_DEVICES.unit2128 },
]

const LIVE_WELL_FLOW_KEYS = [
  ['Well 1 Injection Gas Flow Rate', 'Well #1 Flow Rate'],
  ['Well 2 Injection Gas Flow Rate', 'Well #2 Flow Rate'],
  ['Well 3 Injection Gas Flow Rate', 'Well #3 Flow Rate'],
  ['Well 4 Injection Gas Flow Rate', 'Well #4 Flow Rate'],
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

function getFirstDatapoint(dataMap, keys) {
  for (const key of keys) {
    if (dataMap[key] != null) return dataMap[key]
  }
  return null
}

function isUnitRunning(dataMap) {
  // Consider unit running if any numeric register has a non-zero value
  const entries = Object.values(dataMap)
  return entries.some((dp) => {
    const numeric = Number(dp?.value)
    return Number.isFinite(numeric) && numeric !== 0
  })
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

// ─── unit device card ──────────────────────────────────────────────────────────

function UnitCard({ label, dataMap, time, fetchError, registerCatalog }) {
  if (fetchError && !dataMap) {
    return (
      <div className="bg-[#111118] rounded-xl border border-[#222] p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-[#444]" />
          <h3 className="text-[13px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>{label}</h3>
          <span className="text-[9px] font-bold ml-auto text-[#888]">NO DATA</span>
        </div>
        <div className="text-[11px] text-[#666] text-center py-6">
          Unable to reach device
        </div>
      </div>
    )
  }

  const running = isUnitRunning(dataMap)
  const visibleRegisters = getVisibleLiveRegisters(dataMap, registerCatalog, {})
  const displayRegisters = visibleRegisters.length > 0 ? visibleRegisters : null

  // Fall back to raw parseLiveDatapoints entries if no catalog matches
  const rawEntries = displayRegisters
    ? null
    : Object.entries(dataMap).slice(0, 30)

  return (
    <div className="bg-[#111118] rounded-xl border border-[#222] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-3 h-3 rounded-full ${running ? 'bg-[#22c55e] shadow-lg shadow-[#22c55e]/50' : 'bg-[#444]'}`}
        />
        <h3 className="text-[13px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>{label}</h3>
        <span className={`text-[9px] font-bold ml-auto ${running ? 'text-[#22c55e]' : 'text-[#888]'}`}>
          {running ? 'RUNNING' : 'UNKNOWN'}
        </span>
      </div>

      {displayRegisters ? (
        <div className="grid grid-cols-2 gap-2">
          {displayRegisters.map((meta) => (
            <div key={meta.id} className="bg-[#0a0a14] rounded border border-[#2a2a3a] p-2">
              <div className="text-[8px] text-[#888] uppercase tracking-wider leading-tight">{meta.label}</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-[13px] font-bold text-white" style={{ fontFamily: "'Arial Black'" }}>
                  {formatLiveRegisterValue(meta, meta.datapoint)}
                </span>
                {meta.datapoint?.units && (
                  <span className="text-[8px] text-[#666]">{meta.datapoint.units}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : rawEntries ? (
        <div className="space-y-1">
          {rawEntries.map(([key, dp]) => (
            <div key={key} className="flex items-start justify-between gap-3">
              <div className="text-[8px] text-[#777] leading-tight truncate max-w-[55%]">{key}</div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-white font-bold">{dp?.value ?? '--'}</span>
                {dp?.units && <span className="text-[8px] text-[#666] ml-1">{dp.units}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-[#666] text-center py-6">No data</div>
      )}

      {time && (
        <div className="text-[8px] text-[#444] mt-3 text-right">
          Updated: {time.toLocaleString()}
        </div>
      )}
    </div>
  )
}

// ─── main component ────────────────────────────────────────────────────────────

export default function HalfmannLiveView() {
  const [panelData, setPanelData] = useState(null)
  const [unitData, setUnitData] = useState({ unit2130: null, unit2127: null, unit2129: null, unit2128: null })
  const [unitErrors, setUnitErrors] = useState({})
  const [registerCatalog, setRegisterCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [liveError, setLiveError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_S)
  const [padVisible, setPadVisible] = useState(true) // assume visible until told otherwise

  // ─── pad visibility check (once on mount) ─────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/public/pad-visibility`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body && body.halfmann === false) setPadVisible(false)
      })
      .catch(() => {
        // fetch failed — assume visible
      })
  }, [])

  // ─── data refresh ─────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true)
    setLiveError('')

    const [panelResult, ...unitResults] = await Promise.all([
      fetchDevice(HALFMANN_DEVICES.panel),
      ...UNIT_CARDS.map((u) => fetchDevice(u.deviceId)),
    ])

    setPanelData(panelResult.data)

    const newUnitData = {}
    const newUnitErrors = {}
    UNIT_CARDS.forEach((u, i) => {
      newUnitData[u.key] = unitResults[i].data
      newUnitErrors[u.key] = unitResults[i].error
    })
    setUnitData(newUnitData)
    setUnitErrors(newUnitErrors)

    const allErrors = [panelResult.error, ...unitResults.map((r) => r.error)].filter(Boolean)
    const allNull = !panelResult.data && unitResults.every((r) => !r.data)
    if (allNull) {
      setLiveError(
        allErrors.length > 0
          ? `No live MLINK data available right now. ${allErrors.join(' | ')}`
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
      setCountdown((c) => (c > 0 ? c - 1 : REFRESH_INTERVAL_S))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    loadAwiRegisterCatalog().then(setRegisterCatalog).catch(() => {})
  }, [])

  // ─── derived data ───────────────────────────────────────────────────────────
  const panel = parseLiveDatapoints(panelData)
  const panelTime = getTimestamp(panelData)

  // ─── not available gate ──────────────────────────────────────────────────────
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
      {/* Minimal public header — no navigation links */}
      <header className="flex items-center justify-between px-5 py-3 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-lg shadow-[#22c55e]/60 animate-pulse" />
          <div>
            <div className="text-[13px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>
              Live Field Data — Halfmann 1214
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
          {loading && !panelData && unitData.unit2130 === null ? (
            <div className="text-center py-24 text-[#888] text-sm">Connecting to field units…</div>
          ) : (
            <>
              {liveError && (
                <div className="mb-4 rounded-lg border border-[#5a1d1d] bg-[#1f0c0c] px-4 py-3 text-[11px] text-[#fca5a5]">
                  {liveError}
                </div>
              )}

              {/* Panel status bar */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-3 h-3 rounded-full ${panelData ? 'bg-[#22c55e] shadow-lg shadow-[#22c55e]/50' : 'bg-[#444]'}`} />
                <span className={`text-[13px] font-bold ${panelData ? 'text-[#22c55e]' : 'text-[#888]'}`}>
                  {panelData ? 'ONLINE — Panel Active' : 'PANEL OFFLINE'}
                </span>
                {panelTime && (
                  <span className="ml-auto text-[10px] text-[#555]">
                    Data from: {panelTime.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Well Injection Flow Rates */}
              <div className="bg-[#111118] rounded-xl border border-[#222] p-5 mb-5">
                <h2 className="text-sm text-white font-bold mb-4" style={{ fontFamily: "'Arial Black'" }}>
                  Well Injection Flow Rates
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {LIVE_WELL_FLOW_KEYS.map((keys, i) => {
                    const dp = getFirstDatapoint(panel, keys)
                    const val = dp ? parseFloat(dp.value) : null
                    const maxFlow = 1.2
                    const widthPct =
                      val != null && !Number.isNaN(val)
                        ? Math.max(0, Math.min(100, (val / maxFlow) * 100))
                        : 0
                    return (
                      <div key={i} className="bg-[#0a0a14] rounded-lg border border-[#2a2a3a] p-4 text-center">
                        <div className="text-[10px] text-[#888] mb-1">Well {i + 1}</div>
                        <div
                          className="text-2xl text-[#22c55e] font-bold mb-2"
                          style={{ fontFamily: "'Arial Black'" }}
                        >
                          {val != null && !Number.isNaN(val) ? val.toFixed(3) : '--'}
                        </div>
                        <div className="text-[9px] text-[#888]">MMSCFD</div>
                        <div className="w-full bg-[#1a1a2a] rounded h-2 mt-2 overflow-hidden">
                          <div
                            className="h-full bg-[#22c55e] rounded transition-all"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 text-center">
                  <span className="text-[#888] text-[11px]">Total Injection: </span>
                  <span
                    className="text-white font-bold text-[14px]"
                    style={{ fontFamily: "'Arial Black'" }}
                  >
                    {LIVE_WELL_FLOW_KEYS.reduce((sum, keys) => {
                      const dp = getFirstDatapoint(panel, keys)
                      return sum + (dp ? parseFloat(dp.value) || 0 : 0)
                    }, 0).toFixed(3)}{' '}
                    MMSCFD
                  </span>
                </div>
              </div>

              {/* Unit device cards — 2×2 grid */}
              <div>
                <h2 className="text-sm text-white font-bold mb-3" style={{ fontFamily: "'Arial Black'" }}>
                  Compression Units
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {UNIT_CARDS.map((u) => (
                    <UnitCard
                      key={u.key}
                      label={u.label}
                      dataMap={parseLiveDatapoints(unitData[u.key])}
                      time={getTimestamp(unitData[u.key])}
                      fetchError={unitErrors[u.key]}
                      registerCatalog={registerCatalog}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer — no links */}
      <footer className="px-5 py-3 bg-[#0c0c16] border-t border-[#1a1a2a] text-center">
        <span className="text-[9px] text-[#444]">
          WellLogic™ Simulator · Halfmann 1214 · Data refreshes every 60 seconds
        </span>
      </footer>
    </div>
  )
}
