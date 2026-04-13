import { useState, useEffect, useCallback } from 'react'
import { useKlondikeData } from '../engine/klondikeData'

// MLINK Live Dashboard — data fetched via server-side proxy (key never in browser)
// ALL customer names, site names, and device IDs are stripped. Generic labels only.

// Device IDs — not shown to user
const DEVICES = {
  panel: '2504-504495',
  compA: '2504-505561',
  compB: '2504-505472',
}

async function fetchDevice(deviceId) {
  try {
    const res = await fetch(`/api/mlink/device?deviceId=${deviceId}`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function fetchRunReport(deviceId, startTs, endTs) {
  try {
    const res = await fetch(`/api/mlink/runreport?deviceId=${deviceId}&startTs=${startTs}&endTs=${endTs}`)
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
  const [panelData, setPanelData] = useState(null)
  const [compAData, setCompAData] = useState(null)
  const [compBData, setCompBData] = useState(null)
  const [runReports, setRunReports] = useState({ compA: null, compB: null })
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [tab, setTab] = useState('live') // live | history | klondike
  const klondike = useKlondikeData()

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
    refresh()
    loadRunReports()
    const interval = setInterval(refresh, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const panel = parseDatapoints(panelData)
  const compA = parseDatapoints(compAData)
  const compB = parseDatapoints(compBData)
  const panelTime = getTimestamp(panelData)
  const compATime = getTimestamp(compAData)

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
        <button onClick={() => setTab('klondike')} className={`px-4 py-1.5 rounded text-[11px] font-bold ${tab === 'klondike' ? 'bg-[#4fc3f7] text-black' : 'text-[#888] hover:text-white bg-[#111120] border border-[#2a2a3a]'}`}>📂 30-Day Field Data</button>
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
        ) : tab === 'history' ? (
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
        ) : (
          /* 30-Day Klondike Field Data Tab */
          <KlondikeHistoryTab klondike={klondike} />
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

// ─── Klondike 30-Day History Tab ───────────────────────────────────────────

function KlondikeHistoryTab({ klondike }) {
  const { data, loading, error } = klondike
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState('overview') // overview | well1 | well2 | well3 | well4

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

  // Mini sparkline data — last 40 points up to cursor
  const windowData = data.slice(Math.max(0, cursor - 39), cursor + 1)

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>
            Klondike COP0001 — 30-Day Field Data
          </h2>
          <p className="text-[10px] text-[#888]">{data.length} samples · 15-min intervals · {data[0]?.timestamp} → {data[data.length-1]?.timestamp}</p>
        </div>
        <div className="flex items-center gap-2">
          {['overview','1','2','3','4'].map(v => (
            <button key={v} onClick={() => setView(v === 'overview' ? 'overview' : `well${v}`)}
              className={`px-3 py-1 text-[10px] font-bold rounded ${
                view === (v === 'overview' ? 'overview' : `well${v}`)
                  ? 'bg-[#4fc3f7] text-black' : 'text-[#888] border border-[#333] hover:text-white'
              }`}>
              {v === 'overview' ? 'Overview' : `Well ${v}`}
            </button>
          ))}
        </div>
      </div>

      {/* Playback controls */}
      <div className="bg-[#0c0c18] rounded-lg border border-[#1a1a2a] p-3 mb-4 flex items-center gap-3">
        <button onClick={() => setCursor(0)} className="text-[10px] text-[#888] border border-[#333] rounded px-2 py-1 hover:text-white">⏮</button>
        <button onClick={() => setCursor(c => Math.max(0, c - 1))} className="text-[10px] text-[#888] border border-[#333] rounded px-2 py-1 hover:text-white">◀</button>
        <button onClick={() => setPlaying(p => !p)}
          className={`px-4 py-1 text-[10px] font-bold rounded ${playing ? 'bg-[#eab308] text-black' : 'bg-[#22c55e] text-black'}`}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={() => setCursor(c => Math.min(data.length - 1, c + 1))} className="text-[10px] text-[#888] border border-[#333] rounded px-2 py-1 hover:text-white">▶</button>
        <button onClick={() => setCursor(data.length - 1)} className="text-[10px] text-[#888] border border-[#333] rounded px-2 py-1 hover:text-white">⏭</button>

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
            {totalFlow?.toLocaleString() ?? '—'}
          </div>
          <div className="text-[9px] text-[#888]">MSCFD</div>
          {prev && <div className={`text-[9px] mt-1 ${totalFlow > prev.totalFlowMscfd ? 'text-[#22c55e]' : totalFlow < prev.totalFlowMscfd ? 'text-[#E8200C]' : 'text-[#888]'}`}>
            {totalFlow > prev.totalFlowMscfd ? '▲' : totalFlow < prev.totalFlowMscfd ? '▼' : '—'} {Math.abs(totalFlow - prev.totalFlowMscfd).toFixed(0)} from prev
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
                <span className={`text-[10px] font-bold ml-auto ${s === 'Running' ? 'text-[#22c55e]' : 'text-[#E8200C]'}`}>{s || '—'}</span>
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
          <span className="text-[10px] text-white font-bold uppercase tracking-wider">Per-Well Parameters — {row.timestamp}</span>
        </div>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-[#0a0a14]">
              {['Well', 'Flow (MMSCFD)', 'Setpoint', 'Static Pres (PSI)', 'Diff Pres (PSI)', 'Temp (°F)', 'Choke AO (%)', 'Run Status'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[#888] font-normal border-b border-[#1a1a2a]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row.wells.map((w, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-[#080810]' : 'bg-[#0c0c18]'}>
                <td className="px-3 py-2 text-[#E8200C] font-bold">Well {i+1}</td>
                <td className="px-3 py-2 text-[#22c55e] font-bold">{w.flowMmscfd?.toFixed(3) ?? '—'}</td>
                <td className="px-3 py-2 text-[#888]">{w.setpointMmscfd?.toFixed(3) ?? '—'}</td>
                <td className="px-3 py-2 text-white">{w.staticPressure ?? '—'}</td>
                <td className="px-3 py-2 text-white">{w.diffPressure ?? '—'}</td>
                <td className="px-3 py-2 text-white">{w.temp ?? '—'}</td>
                <td className="px-3 py-2 text-white">{w.analogOutput ?? '—'}</td>
                <td className="px-3 py-2">
                  <span className={`font-bold ${w.runStatus === 'Online' ? 'text-[#22c55e]' : 'text-[#888]'}`}>
                    {w.runStatus || '—'}
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
    { label: 'Setpoint', value: w.setpointMmscfd?.toFixed(3), unit: 'MMSCFD', color: '#4fc3f7', spark: windowData.map(r => r.wells[wellIdx]?.setpointMmscfd ?? 0) },
    { label: 'Static Pressure', value: w.staticPressure, unit: 'PSI', color: '#eab308', spark: windowData.map(r => r.wells[wellIdx]?.staticPressure ?? 0) },
    { label: 'Differential Pres', value: w.diffPressure, unit: 'PSI', color: '#f97316', spark: windowData.map(r => r.wells[wellIdx]?.diffPressure ?? 0) },
    { label: 'Injection Temp', value: w.temp, unit: '°F', color: '#E8200C', spark: windowData.map(r => r.wells[wellIdx]?.temp ?? 0) },
    { label: 'Choke AO', value: w.analogOutput, unit: '%', color: '#a78bfa', spark: windowData.map(r => r.wells[wellIdx]?.analogOutput ?? 0) },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${w.runStatus === 'Online' ? 'bg-[#22c55e]' : 'bg-[#555]'}`} />
        <span className="text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>Well {wellIdx + 1}</span>
        <span className={`text-[10px] font-bold ${w.runStatus === 'Online' ? 'text-[#22c55e]' : 'text-[#888]'}`}>{w.runStatus || '—'}</span>
        <span className="text-[9px] text-[#555] ml-auto">{row.timestamp}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {params.map(p => (
          <div key={p.label} className="bg-[#111118] rounded-lg border border-[#222] p-4">
            <div className="text-[9px] text-[#888] uppercase tracking-wider mb-1">{p.label}</div>
            <div className="text-2xl font-bold mb-0.5" style={{ color: p.color, fontFamily: "'Arial Black'" }}>
              {p.value ?? '—'}
            </div>
            <div className="text-[9px] text-[#888]">{p.unit}</div>
            <MiniSparkline data={p.spark} color={p.color} />
          </div>
        ))}
      </div>

      <div className="mt-3 bg-[#0c0c18] rounded border border-[#1a1a2a] p-3 text-[10px] text-[#888]">
        Yesterday total: <span className="text-white">{w.yesterdayTotal?.toFixed(3) ?? '—'} MMSCFD</span>
        &nbsp;·&nbsp; Desired: <span className="text-white">{w.calcDesiredFlow?.toFixed(3) ?? '—'} MMSCFD</span>
        &nbsp;·&nbsp; Max rate: <span className="text-white">{w.maxFlowRate?.toFixed(3) ?? '—'} MMSCFD</span>
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
