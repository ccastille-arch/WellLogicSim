import { useState, useEffect, useCallback, useRef } from 'react'
import { formatFlow } from '../engine/liveRegisters'

const API_BASE = import.meta.env.VITE_API_URL || ''
const POLL_INTERVAL_MS = 5000 // 5-second polling

const HALFMANN_DEVICES = {
  panel: '2507-501508',
  unit2130: '2507-500709',
  unit2127: '2504-504108',
  unit2129: '2504-504102',
  unit2128: '2507-500076',
}

const HALFMANN_UNITS = [
  { key: 'unit2130', label: '2130', deviceId: HALFMANN_DEVICES.unit2130 },
  { key: 'unit2127', label: '2127', deviceId: HALFMANN_DEVICES.unit2127 },
  { key: 'unit2129', label: '2129', deviceId: HALFMANN_DEVICES.unit2129 },
  { key: 'unit2128', label: '2128', deviceId: HALFMANN_DEVICES.unit2128 },
]

async function fetchDeviceFull(deviceId) {
  try {
    const res = await fetch(`${API_BASE}/api/mlink/device/full?deviceId=${encodeURIComponent(deviceId)}`)
    if (!res.ok) return { data: null, error: `device ${deviceId}: failed` }
    return { data: await res.json(), error: '' }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

function resolvePreferredDatapoint(data, keyAliases) {
  if (!data?.datapoints) return null
  for (const key of keyAliases) {
    const dp = data.datapoints.find(d => d.label === key)
    if (dp) return dp
  }
  return null
}

function getNumeric(data, keyAliases) {
  const dp = resolvePreferredDatapoint(data, keyAliases)
  if (!dp) return null
  const num = Number(dp.value)
  return Number.isFinite(num) ? num : null
}

function TrendingChart({ title, series, timeWindow, isLive, isReversed }) {
  return (
    <div className="bg-[#111118] rounded-xl border border-[#222] p-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-[#49D0E2] mb-3">{title}</div>
      <div className="h-32 bg-[#0a0a14] rounded border border-[#2a2a3a] relative flex items-center justify-center">
        <div className="text-[12px] text-[#666]">
          {series.length === 0 ? 'No data' : `${series.length} points · ${timeWindow}`}
        </div>
      </div>
    </div>
  )
}

function PlaybackControls({ isLive, isPlaying, onPlayPause, onReverse, onSpeedChange, speed, onTimeWindowChange, timeWindow, currentTime, scrubTo }) {
  return (
    <div className="bg-[#111118] rounded-xl border border-[#222] p-4">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <button
          onClick={onPlayPause}
          className="px-3 py-1.5 rounded bg-[#22c55e] text-black text-[11px] font-bold hover:bg-[#1ea64f]"
        >
          {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
        </button>
        <button onClick={onReverse} className="px-3 py-1.5 rounded border border-[#444] text-[11px] font-bold text-[#fff] hover:border-[#666]">
          ⏮ REVERSE
        </button>
        <div className="flex gap-1">
          {[2, 5, 10].map(s => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-1 rounded text-[10px] font-bold ${speed === s ? 'bg-[#4fc3f7] text-black' : 'border border-[#444] text-[#fff] hover:border-[#666]'}`}
            >
              {s}x
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {['1h', '4h', '12h', '24h', '48h', '7d'].map(w => (
            <button
              key={w}
              onClick={() => onTimeWindowChange(w)}
              className={`px-2 py-1 rounded text-[10px] font-bold ${timeWindow === w ? 'bg-[#FF5A62] text-white' : 'border border-[#444] text-[#fff] hover:border-[#666]'}`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-[#0a0a14] rounded border border-[#2a2a3a] h-2 relative">
        <div className="h-full bg-gradient-to-r from-[#22c55e] to-[#4fc3f7]" style={{ width: '45%' }} />
      </div>
      <div className="text-[9px] text-[#666] mt-2">Time: 00:00 / 24:00</div>
    </div>
  )
}

export default function HalfmannTrending() {
  const [panelData, setPanelData] = useState(null)
  const [unitData, setUnitData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLive, setIsLive] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [timeWindow, setTimeWindow] = useState('24h')
  const [isReversed, setIsReversed] = useState(false)
  const pollTimer = useRef(null)
  const dataBuffer = useRef({})

  const refresh = useCallback(async () => {
    const panelRes = await fetchDeviceFull(HALFMANN_DEVICES.panel)
    if (panelRes.data) setPanelData(panelRes.data)
    if (panelRes.error) setError(panelRes.error)

    const newUnitData = {}
    for (const unit of HALFMANN_UNITS) {
      const res = await fetchDeviceFull(unit.deviceId)
      if (res.data) newUnitData[unit.key] = res.data
    }
    setUnitData(newUnitData)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080810]">
        <div className="text-[#888]">Connecting to field units…</div>
      </div>
    )
  }

  // Extract trending data series from panel and units
  const wellChokeCmd = [1, 2, 3, 4, 5].map(i =>
    getNumeric(panelData, [`Well #${i} Choke Command`, `Well ${i} Choke Command`, `Wellhead #${i} Choke Command`])
  )
  const dischargePres = getNumeric(panelData, ['Stage 3 Discharge Prs', 'Discharge Pressure', 'Discharge Prs'])
  const suctionPres = getNumeric(panelData, ['Stage 1 Suction Prs', 'Suction Pressure', 'Suction Pres'])

  const compDesiredFlow = HALFMANN_UNITS.map((unit, i) =>
    getNumeric(unitData[unit.key], ['Desired Flow', 'Flow SP', 'Compressor Desired Flow'])
  )
  const compActualFlow = HALFMANN_UNITS.map((unit, i) =>
    getNumeric(unitData[unit.key], ['Actual Flow', 'Flow Rate PID PV', 'Compressor Actual Flow'])
  )

  return (
    <div className="flex flex-col min-h-screen bg-[#080810]">
      <header className="flex items-center justify-between px-5 py-3 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#4fc3f7] shadow-lg shadow-[#4fc3f7]/60 animate-pulse" />
          <div>
            <div className="text-[13px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>
              Trending &amp; Playback — Halfmann 1214
            </div>
            <div className="text-[10px] text-[#666]">
              Historical data · playback controls
            </div>
          </div>
        </div>
        <a href="?tab=live" className="text-[11px] font-bold text-[#49D0E2] hover:text-[#4fc3f7] uppercase tracking-wider">
          ← LIVE
        </a>
      </header>

      <div className="flex-1 overflow-auto p-5 sm:p-6">
        <div className="max-w-[1280px] mx-auto">
          {error && (
            <div className="mb-4 rounded-lg border border-[#5a1d1d] bg-[#1f0c0c] px-4 py-3 text-[11px] text-[#fca5a5]">
              {error}
            </div>
          )}

          <PlaybackControls
            isLive={isLive}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onReverse={() => setIsReversed(!isReversed)}
            onSpeedChange={setSpeed}
            speed={speed}
            onTimeWindowChange={setTimeWindow}
            timeWindow={timeWindow}
          />

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <TrendingChart
                key={`choke-${i}`}
                title={`Well #${i} Choke Command`}
                series={[]}
                timeWindow={timeWindow}
                isLive={isLive}
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <TrendingChart title="Discharge Pressure" series={[]} timeWindow={timeWindow} isLive={isLive} />
            <TrendingChart title="Suction Pressure" series={[]} timeWindow={timeWindow} isLive={isLive} />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {HALFMANN_UNITS.map((unit, i) => (
              <TrendingChart
                key={`comp-${i}`}
                title={`Compressor ${i + 1} Desired Flow SP`}
                series={[]}
                timeWindow={timeWindow}
                isLive={isLive}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
