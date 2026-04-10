import { useState, useEffect, useCallback } from 'react'

// MLINK Live Dashboard — pulls real data from a WellLogic panel running in the field
// ALL customer names, site names, and device IDs are stripped. Generic labels only.

const API_BASE = 'https://api.fwmurphy-iot.com/api'

// API key stored in localStorage — entered once by admin, never in source code
function getApiKey() {
  return localStorage.getItem('welllogic_mlink_key') || ''
}
function setApiKey(key) {
  localStorage.setItem('welllogic_mlink_key', key)
}

// Device IDs — not shown to user
const DEVICES = {
  panel: '2504-504495',
  compA: '2504-505561',
  compB: '2504-505472',
}

async function fetchDevice(deviceId) {
  try {
    const res = await fetch(`${API_BASE}/LatestDeviceData?deviceId=${deviceId}&code=${getApiKey()}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function fetchRunReport(deviceId, startTs, endTs) {
  try {
    const res = await fetch(`${API_BASE}/RunReport?deviceId=${deviceId}&startTs=${startTs}&endTs=${endTs}&code=${getApiKey()}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

function parseDatapoints(data) {
  if (!data?.datapoints) return {}
  const result = {}
  for (const dp of data.datapoints) {
    const key = dp.alias || dp.desc
    result[key] = { value: dp.value, units: dp.units, desc: dp.desc }
  }
  return result
}

function getTimestamp(data, idx = 0) {
  if (!data?.timestamps?.[idx]) return null
  return new Date(data.timestamps[idx] * 1000)
}

export default function MLinkDashboard({ onBack }) {
  const [apiKey, setApiKeyState] = useState(getApiKey())
  const [keyInput, setKeyInput] = useState('')
  const [panelData, setPanelData] = useState(null)
  const [compAData, setCompAData] = useState(null)
  const [compBData, setCompBData] = useState(null)
  const [runReports, setRunReports] = useState({ compA: null, compB: null })
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [tab, setTab] = useState('live') // live | history

  const refresh = useCallback(async () => {
    setLoading(true)
    const [p, a, b] = await Promise.all([
      fetchDevice(DEVICES.panel),
      fetchDevice(DEVICES.compA),
      fetchDevice(DEVICES.compB),
    ])
    setPanelData(p)
    setCompAData(a)
    setCompBData(b)
    setLastRefresh(new Date())
    setLoading(false)
  }, [])

  const loadRunReports = useCallback(async () => {
    // Yesterday's 24hr report (API requires endTs < current UTC day)
    const now = new Date()
    const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const endTs = Math.floor(utcToday.getTime() / 1000) - 1
    const startTs = endTs - 86399

    const [rA, rB] = await Promise.all([
      fetchRunReport(DEVICES.compA, startTs, endTs),
      fetchRunReport(DEVICES.compB, startTs, endTs),
    ])
    setRunReports({ compA: rA, compB: rB })
  }, [])

  useEffect(() => {
    if (!apiKey) return
    refresh()
    loadRunReports()
    const interval = setInterval(refresh, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [apiKey])

  const panel = parseDatapoints(panelData)
  const compA = parseDatapoints(compAData)
  const compB = parseDatapoints(compBData)
  const panelTime = getTimestamp(panelData)
  const compATime = getTimestamp(compAData)

  // Require API key
  if (!apiKey) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#080810]">
        <div className="w-[440px] bg-[#111118] rounded-xl border border-[#222] p-6">
          <h2 className="text-lg text-white font-bold mb-2" style={{ fontFamily: "'Arial Black'" }}>📡 Connect to Field Data</h2>
          <p className="text-[11px] text-[#888] mb-4">Enter the MLINK API key to connect to live field equipment.</p>
          <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && keyInput) { setApiKey(keyInput); setApiKeyState(keyInput) } }}
            placeholder="MLINK API Key" autoFocus
            className="w-full bg-[#0a0a14] border border-[#333] rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#E8200C] mb-3" />
          <div className="flex gap-2">
            <button onClick={onBack} className="flex-1 py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white">Cancel</button>
            <button onClick={() => { if (keyInput) { setApiKey(keyInput); setApiKeyState(keyInput) } }}
              className="flex-1 py-2 text-[11px] font-bold bg-[#E8200C] text-white rounded hover:bg-[#c01a0a]">Connect</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#080810] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg text-white font-bold flex items-center gap-2" style={{ fontFamily: "'Arial Black'" }}>
              <span className="text-[#22c55e]">●</span> Live Field Data — WellLogic™ in Production
            </h1>
            <p className="text-[11px] text-[#888]">
              Real-time data from an active WellLogic panel and compressors running in West Texas
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
              {loading ? '⟳ Loading...' : '⟳ Refresh'}
            </button>
            <button onClick={onBack} className="px-3 py-1.5 text-[10px] font-bold text-[#888] border border-[#333] rounded hover:text-white">← Back</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 py-2 bg-[#0a0a14] border-b border-[#1a1a2a] shrink-0">
        <button onClick={() => setTab('live')} className={`px-4 py-1.5 rounded text-[11px] font-bold ${tab === 'live' ? 'bg-[#E8200C] text-white' : 'text-[#888] hover:text-white bg-[#111120] border border-[#2a2a3a]'}`}>Live Data</button>
        <button onClick={() => setTab('history')} className={`px-4 py-1.5 rounded text-[11px] font-bold ${tab === 'history' ? 'bg-[#E8200C] text-white' : 'text-[#888] hover:text-white bg-[#111120] border border-[#2a2a3a]'}`}>Run History</button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tab === 'live' ? (
          <div className="max-w-[1000px] mx-auto">
            {loading && !panelData ? (
              <div className="text-center py-20 text-[#888]">Connecting to field unit...</div>
            ) : (
              <>
                {/* Panel status */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-[#22c55e] shadow-lg shadow-[#22c55e]/50" />
                  <span className="text-[13px] text-[#22c55e] font-bold">ONLINE — Panel Active</span>
                  <span className="text-[10px] text-[#888] ml-auto">
                    Hour Meter: {panel['	 Hour Meter']?.value || panel['Hour Meter']?.value || '—'} hours
                  </span>
                  {panelTime && <span className="text-[10px] text-[#555]">Data from: {panelTime.toLocaleString()}</span>}
                </div>

                {/* Well Flow Rates */}
                <div className="bg-[#111118] rounded-xl border border-[#222] p-5 mb-4">
                  <h2 className="text-sm text-white font-bold mb-4" style={{ fontFamily: "'Arial Black'" }}>
                    Well Injection Flow Rates
                  </h2>
                  <div className="grid grid-cols-4 gap-4">
                    {['Well #1 Flow Rate', 'Well #2 Flow Rate', 'Well #3 Flow Rate', 'Well #4 Flow Rate'].map((key, i) => {
                      const dp = panel[key]
                      const val = dp ? parseFloat(dp.value) : 0
                      const maxFlow = 1.2
                      return (
                        <div key={i} className="bg-[#0a0a14] rounded-lg border border-[#2a2a3a] p-4 text-center">
                          <div className="text-[10px] text-[#888] mb-1">Well {i + 1}</div>
                          <div className="text-2xl text-[#22c55e] font-bold mb-2" style={{ fontFamily: "'Arial Black'" }}>
                            {val.toFixed(3)}
                          </div>
                          <div className="text-[9px] text-[#888]">MMSCFD</div>
                          <div className="w-full bg-[#1a1a2a] rounded h-2 mt-2 overflow-hidden">
                            <div className="h-full bg-[#22c55e] rounded transition-all" style={{ width: `${(val / maxFlow) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 text-center">
                    <span className="text-[#888] text-[11px]">Total Injection: </span>
                    <span className="text-white font-bold text-[14px]" style={{ fontFamily: "'Arial Black'" }}>
                      {['Well #1 Flow Rate', 'Well #2 Flow Rate', 'Well #3 Flow Rate', 'Well #4 Flow Rate']
                        .reduce((sum, key) => sum + (panel[key] ? parseFloat(panel[key].value) : 0), 0).toFixed(3)} MMSCFD
                    </span>
                  </div>
                </div>

                {/* Compressors */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <CompressorCard label="Compressor A" data={compA} time={compATime} />
                  <CompressorCard label="Compressor B" data={compB} time={getTimestamp(compBData)} />
                </div>
              </>
            )}
          </div>
        ) : (
          /* Run History Tab */
          <div className="max-w-[1000px] mx-auto">
            <h2 className="text-sm text-white font-bold mb-4" style={{ fontFamily: "'Arial Black'" }}>
              Yesterday's Run Report
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <RunReportCard label="Compressor A" report={runReports.compA} />
              <RunReportCard label="Compressor B" report={runReports.compB} />
            </div>
            <p className="text-[9px] text-[#555] mt-4 text-center">
              Run reports available for the last 30 days in 24-hour windows. Additional date ranges coming soon.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function CompressorCard({ label, data, time }) {
  const rpm = data['Driver Speed']
  const suction = data['Suction Pressure']
  const discharge = data['Discharge Pressure']
  const dischTemp = data['Discharge Temperature']
  const engOil = data['Engine Oil Pressure']
  const compOil = data['Compressor Oil Pressure']
  const voltage = data['System Voltage']

  const isRunning = rpm && parseFloat(rpm.value) > 100

  return (
    <div className="bg-[#111118] rounded-xl border border-[#222] p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-[#22c55e] shadow-lg shadow-[#22c55e]/50' : 'bg-[#E8200C]'}`} />
        <h3 className="text-[13px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>{label}</h3>
        <span className={`text-[9px] font-bold ml-auto ${isRunning ? 'text-[#22c55e]' : 'text-[#E8200C]'}`}>
          {isRunning ? 'RUNNING' : 'STOPPED'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <DataPoint label="Engine Speed" value={rpm?.value} unit="RPM" />
        <DataPoint label="Suction Pressure" value={suction?.value} unit="PSI" color={suction && parseFloat(suction.value) < 30 ? '#eab308' : '#22c55e'} />
        <DataPoint label="Discharge Pressure" value={discharge?.value} unit="PSI" color={discharge && parseFloat(discharge.value) > 900 ? '#E8200C' : '#22c55e'} />
        <DataPoint label="Discharge Temp" value={dischTemp?.value} unit="°F" color={dischTemp && parseFloat(dischTemp.value) > 275 ? '#E8200C' : '#22c55e'} />
        <DataPoint label="Engine Oil" value={engOil?.value} unit="PSI" />
        <DataPoint label="Compressor Oil" value={compOil?.value} unit="PSI" />
        {voltage && <DataPoint label="System Voltage" value={voltage.value} unit="VDC" />}
      </div>
      {time && <div className="text-[8px] text-[#444] mt-2 text-right">Updated: {time.toLocaleString()}</div>}
    </div>
  )
}

function DataPoint({ label, value, unit, color }) {
  return (
    <div className="bg-[#0a0a14] rounded border border-[#2a2a3a] p-2">
      <div className="text-[8px] text-[#888] uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-[14px] font-bold" style={{ color: color || '#fff', fontFamily: "'Arial Black'" }}>
          {value || '—'}
        </span>
        <span className="text-[8px] text-[#666]">{unit}</span>
      </div>
    </div>
  )
}

function RunReportCard({ label, report }) {
  if (!report) return (
    <div className="bg-[#111118] rounded-xl border border-[#222] p-5 text-center">
      <h3 className="text-[13px] text-white font-bold mb-2">{label}</h3>
      <span className="text-[#555]">Loading...</span>
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
