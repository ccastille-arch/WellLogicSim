import { useState } from 'react'
import { DEFAULT_TUNING } from '../engine/simulation'

const ADMIN_PASSWORD = 'sc2026'

// All tunable parameters with labels, descriptions, and ranges
const TUNING_PARAMS = [
  { section: 'Valve & Flow Response', params: [
    { key: 'chokeMoveRate', label: 'Choke Valve Travel Speed', desc: 'How fast choke valves open/close per tick. Higher = faster valve movement.', min: 0.01, max: 0.5, step: 0.01 },
    { key: 'flowResponseRate', label: 'Flow Response Rate', desc: 'How fast flow establishes through piping per tick. Higher = less piping lag.', min: 0.01, max: 0.5, step: 0.01 },
    { key: 'productionLag', label: 'Production Inertia', desc: 'How fast well production responds to injection changes. Higher = faster response.', min: 0.005, max: 0.3, step: 0.005 },
  ]},
  { section: 'WellLogic Control Response', params: [
    { key: 'rebalanceRate', label: 'WellLogic Rebalance Speed', desc: 'How fast WellLogic corrects allocation after a disturbance. Higher = faster prioritization.', min: 0.005, max: 0.3, step: 0.005 },
    { key: 'disturbanceThreshold', label: 'Disturbance Detection Threshold', desc: 'MCFD capacity change required to trigger disturbance response.', min: 5, max: 100, step: 5, unit: 'MCFD' },
  ]},
  { section: 'Compressor Response', params: [
    { key: 'compressorRamp', label: 'Compressor Ramp Rate', desc: 'How fast compressor RPM and load change per tick. Higher = faster engine response.', min: 0.02, max: 0.5, step: 0.01 },
    { key: 'compressorSpindownRate', label: 'Compressor Spindown Rate', desc: 'How fast a tripped compressor spins down. Higher = faster shutdown.', min: 0.02, max: 0.3, step: 0.01 },
  ]},
  { section: 'Pressure System', params: [
    { key: 'pressureResponse', label: 'Pressure Response Speed', desc: 'How fast suction/discharge pressure changes per tick.', min: 0.02, max: 0.5, step: 0.01 },
    { key: 'salesValveOpenRate', label: 'Sales Valve Open Speed', desc: 'How fast the sales valve opens during pressure events.', min: 0.02, max: 0.5, step: 0.01 },
    { key: 'salesValveCloseRate', label: 'Sales Valve Close Speed', desc: 'How fast the sales valve closes when pressure normalizes.', min: 0.01, max: 0.3, step: 0.01 },
  ]},
  { section: 'Simulation Timing', params: [
    { key: 'tickInterval', label: 'Tick Interval', desc: 'Milliseconds between simulation ticks. Lower = faster simulation. Default 500ms.', min: 100, max: 2000, step: 50, unit: 'ms' },
    { key: 'unloadChance', label: 'Random Unload Probability', desc: 'Chance of a random well unload event per tick. Higher = more frequent events.', min: 0, max: 0.1, step: 0.005 },
  ]},
]

export default function AdminPanel({ state, onFieldChange, onClose }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const tuning = state.tuning || DEFAULT_TUNING

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
      setError(false)
    } else {
      setError(true)
      setPassword('')
    }
  }

  const updateTuning = (key, value) => {
    onFieldChange('tuning', { ...tuning, [key]: value })
  }

  const resetToDefaults = () => {
    onFieldChange('tuning', { ...DEFAULT_TUNING })
  }

  // Preset speed profiles
  const applyPreset = (preset) => {
    const presets = {
      realtime: { // Closest to real-life timing
        chokeMoveRate: 0.03, flowResponseRate: 0.04, productionLag: 0.02,
        rebalanceRate: 0.015, compressorRamp: 0.06, compressorSpindownRate: 0.04,
        pressureResponse: 0.08, salesValveOpenRate: 0.10, salesValveCloseRate: 0.03,
        tickInterval: 500,
      },
      demo: { // Good for demos — visible but not too slow
        chokeMoveRate: 0.08, flowResponseRate: 0.10, productionLag: 0.05,
        rebalanceRate: 0.04, compressorRamp: 0.12, compressorSpindownRate: 0.08,
        pressureResponse: 0.15, salesValveOpenRate: 0.20, salesValveCloseRate: 0.08,
        tickInterval: 500,
      },
      fast: { // Fast for quick walkthroughs
        chokeMoveRate: 0.15, flowResponseRate: 0.20, productionLag: 0.10,
        rebalanceRate: 0.08, compressorRamp: 0.20, compressorSpindownRate: 0.15,
        pressureResponse: 0.25, salesValveOpenRate: 0.30, salesValveCloseRate: 0.15,
        tickInterval: 400,
      },
      instant: { // Near-instant for testing
        chokeMoveRate: 0.40, flowResponseRate: 0.40, productionLag: 0.30,
        rebalanceRate: 0.30, compressorRamp: 0.40, compressorSpindownRate: 0.30,
        pressureResponse: 0.40, salesValveOpenRate: 0.40, salesValveCloseRate: 0.30,
        tickInterval: 300,
      },
    }
    onFieldChange('tuning', { ...tuning, ...presets[preset] })
  }

  if (!authenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
        <div className="bg-[#111118] border border-[#333] rounded-xl p-8 w-[380px] shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#E8200C] text-xl">🔐</span>
            <h2 className="text-lg text-white font-bold" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>Admin Access</h2>
          </div>
          <p className="text-[12px] text-[#888] mb-4">
            Enter the admin password to access simulation tuning controls.
          </p>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false) }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            className="w-full bg-[#1a1a2a] border border-[#333] rounded px-3 py-2.5 text-white text-sm outline-none focus:border-[#E8200C] mb-3"
            autoFocus
          />
          {error && <p className="text-[#E8200C] text-[11px] mb-3">Incorrect password. Try again.</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white hover:border-[#555]">
              Cancel
            </button>
            <button onClick={handleLogin} className="flex-1 py-2 text-[11px] font-bold bg-[#E8200C] text-white rounded hover:bg-[#c01a0a]">
              Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end" onClick={onClose}>
      <div className="w-[420px] h-full bg-[#0e0e18] border-l border-[#2a2a3a] shadow-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0e0e18] border-b border-[#2a2a3a] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[#E8200C]">🔧</span>
              <h2 className="text-sm text-white font-bold" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
                Admin — Simulation Tuning
              </h2>
            </div>
            <button onClick={onClose} className="text-[#888] hover:text-white text-lg">✕</button>
          </div>
          <p className="text-[10px] text-[#666] mt-1">Adjust response rates and timing for all control logic.</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Presets */}
          <div className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-3">
            <div className="text-[9px] text-[#E8200C] uppercase tracking-wider font-bold mb-2">Speed Presets</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'realtime', label: 'Real-Time', desc: '30-90 sec response' },
                { id: 'demo', label: 'Demo Speed', desc: '10-25 sec response' },
                { id: 'fast', label: 'Fast', desc: '5-10 sec response' },
                { id: 'instant', label: 'Instant', desc: 'Near-instant for testing' },
              ].map(p => (
                <button key={p.id} onClick={() => applyPreset(p.id)}
                  className="py-2 px-3 rounded border border-[#333] bg-[#0a0a14] hover:border-[#E8200C] hover:bg-[#E8200C]/5 text-left transition-colors">
                  <div className="text-[11px] text-white font-bold">{p.label}</div>
                  <div className="text-[9px] text-[#666]">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Parameter sections */}
          {TUNING_PARAMS.map(section => (
            <div key={section.section} className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-3">
              <div className="text-[9px] text-[#f97316] uppercase tracking-wider font-bold mb-2">{section.section}</div>
              {section.params.map(param => (
                <TuningSlider
                  key={param.key}
                  param={param}
                  value={tuning[param.key]}
                  defaultValue={DEFAULT_TUNING[param.key]}
                  onChange={v => updateTuning(param.key, v)}
                />
              ))}
            </div>
          ))}

          {/* Reset */}
          <button onClick={resetToDefaults}
            className="w-full py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white hover:border-[#E8200C] transition-colors">
            Reset All to Defaults
          </button>

          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}

function TuningSlider({ param, value, defaultValue, onChange }) {
  const { key, label, desc, min, max, step, unit } = param
  const isDefault = Math.abs(value - defaultValue) < step * 0.5
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] text-[#ccc] font-bold">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-white font-bold tabular-nums">{value.toFixed(step < 0.1 ? 3 : step < 1 ? 2 : 0)}</span>
          {unit && <span className="text-[9px] text-[#666]">{unit}</span>}
          {!isDefault && (
            <button onClick={() => onChange(defaultValue)} className="text-[8px] text-[#E8200C] hover:text-white ml-1">↩</button>
          )}
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#E8200C]" style={{ height: 4 }}
      />
      <div className="flex justify-between text-[8px] text-[#444] mt-0.5">
        <span>Slower ({min})</span>
        <span>Faster ({max})</span>
      </div>
      {desc && <p className="text-[9px] text-[#555] mt-0.5">{desc}</p>}
    </div>
  )
}
