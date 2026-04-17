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
  { section: 'Well Logic Control Response', params: [
    { key: 'rebalanceRate', label: 'Well Logic Rebalance Speed', desc: 'How fast Well Logic corrects allocation after a disturbance. Higher = faster prioritization.', min: 0.005, max: 0.3, step: 0.005 },
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

function isCompressorOnline(compressor) {
  return compressor.status === 'running' || compressor.status === 'locked_out_running'
}

function formatMcfd(value) {
  return `${Math.round(Number(value) || 0).toLocaleString()} MCFD`
}

function formatPsi(value) {
  return `${Math.round(Number(value) || 0)} psi`
}

function buildPriorityAllocation(wells, effectiveGas) {
  const allocation = new Map()
  let remainingGas = Math.max(0, effectiveGas)

  ;[...wells]
    .sort((a, b) => a.priority - b.priority)
    .forEach((well) => {
      const desired = Number(well.desiredRate) || 0
      const allocated = Math.min(desired, remainingGas)
      allocation.set(well.id, allocated)
      remainingGas = Math.max(0, remainingGas - allocated)
    })

  return allocation
}

function buildLogicSummary(state) {
  const compressors = state.compressors || []
  const wells = state.wells || []
  const onlineCompressors = compressors.filter(isCompressorOnline)
  const lockedOutCompressors = compressors.filter(c => c.personnelLockout)
  const onlineCapacity = onlineCompressors.reduce((sum, c) => sum + (Number(c.capacityMcfd) || 0), 0)
  const totalAvailableGas = Number(state.totalAvailableGas) || 0
  const effectiveGas = Math.min(totalAvailableGas, onlineCapacity)
  const totalDesired = wells.reduce((sum, well) => sum + (Number(well.desiredRate) || 0), 0)
  const totalActual = wells.reduce((sum, well) => sum + (Number(well.actualRate) || 0), 0)
  const shortage = Math.max(0, totalDesired - effectiveGas)
  const suctionUpperLimit = (Number(state.suctionTarget) || 0) + (Number(state.suctionHighRange) || 0)
  const startupAssistCount = Math.max(0, Math.min(state.config?.startupAssistWellCount || 0, wells.length))
  const startupAssistIds = new Set(
    [...wells]
      .sort((a, b) => a.priority - b.priority)
      .slice(0, startupAssistCount)
      .map(well => well.id),
  )
  const priorityAllocation = buildPriorityAllocation(wells, effectiveGas)

  let modeTitle = 'Normal optimization'
  let modeBody = `All compressors are available and Well Logic is balancing ${formatMcfd(totalDesired)} of target demand against ${formatMcfd(effectiveGas)} of usable gas.`

  if (onlineCompressors.length === 0) {
    modeTitle = 'Pad shutdown protection'
    modeBody = 'No compressors are online, so Well Logic is suspending flow control and driving wells shut to protect the site.'
  } else if ((state.startupAssistRemaining || 0) > 0) {
    modeTitle = 'Cold-start recovery'
    modeBody = `The pad is recovering from zero-flow conditions, so Well Logic is holding the first ${startupAssistCount} priority well(s) near a fixed choke while compressor throughput stabilizes.`
  } else if (shortage > 5) {
    modeTitle = 'Gas constrained prioritization'
    modeBody = `Demand is ${formatMcfd(totalDesired)} but only ${formatMcfd(effectiveGas)} is available. Well Logic is protecting higher-priority wells first and trimming lower-priority wells.`
  } else if (state.wellUnloadActive) {
    modeTitle = 'Unload event response'
    modeBody = 'A well unload event is active, so Well Logic is protecting header pressure while the upset clears.'
  } else if ((state.salesValvePosition || 0) > 5 || (state.suctionHeaderPressure || 0) > suctionUpperLimit) {
    modeTitle = 'Pressure override active'
    modeBody = 'Header pressure is elevated, so Well Logic is using override logic to bleed pressure and keep the pad inside its operating window.'
  }

  const constraints = []

  if (totalAvailableGas < onlineCapacity - 5) {
    constraints.push(`Incoming gas supply is limited to ${formatMcfd(totalAvailableGas)}, below the ${formatMcfd(onlineCapacity)} the running compressors could move.`)
  }

  if (onlineCapacity < totalDesired - 5) {
    constraints.push(`Online compressor capacity is ${formatMcfd(onlineCapacity)} against ${formatMcfd(totalDesired)} of requested well flow.`)
  }

  if (lockedOutCompressors.length > 0) {
    constraints.push(`${lockedOutCompressors.map(c => c.name).join(', ')} ${lockedOutCompressors.length === 1 ? 'is' : 'are'} in personnel lockout, so remote logic cannot use that machine normally.`)
  }

  if ((state.startupAssistRemaining || 0) > 0) {
    constraints.push(`Startup assist is active for another ${Math.ceil((state.startupAssistRemaining || 0) / 3)} sim ticks while the first wells absorb compressor minimum flow.`)
  }

  if (state.wellUnloadActive) {
    constraints.push('A well unload event is forcing temporary pressure-management actions at the pad level.')
  }

  if ((state.salesValvePosition || 0) > 5) {
    constraints.push(`Sales valve override is ${Math.round(state.salesValvePosition)}% open to protect the suction header.`)
  }

  if ((state.flowMeterTemp || 0) > (state.maxTempAtPlate || 0)) {
    constraints.push(`Flow meter temperature is high at ${Math.round(state.flowMeterTemp)} F, above the ${Math.round(state.maxTempAtPlate)} F limit.`)
  }

  const redWellReasons = wells
    .filter(well => (Number(well.desiredRate) || 0) > 0 && !well.isAtTarget)
    .sort((a, b) => a.priority - b.priority)
    .map((well) => {
      const desired = Number(well.desiredRate) || 0
      const allocated = priorityAllocation.get(well.id) || 0

      let reason = `${well.name} is still moving back toward target after a recent change in pad conditions.`

      if (onlineCompressors.length === 0) {
        reason = `${well.name} is red because no compressors are online, so Well Logic has shut the well in.`
      } else if ((state.startupAssistRemaining || 0) > 0 && !startupAssistIds.has(well.id)) {
        reason = `${well.name} is red because startup assist is giving the first priority wells the minimum flow needed to restart the pad before this well is allowed back up.`
      } else if (allocated <= 5) {
        reason = `${well.name} is red because available gas is short by ${formatMcfd(shortage)}, so Well Logic is fully closing this lower-priority well to protect more important wells.`
      } else if (allocated < desired - 5) {
        reason = `${well.name} is red because Well Logic has trimmed its target to ${formatMcfd(allocated)} while higher-priority wells consume the limited gas.`
      } else if (state.wellUnloadActive) {
        reason = `${well.name} is red because the pad is riding through an unload event and the well has not fully recovered yet.`
      } else if ((state.salesValvePosition || 0) > 5) {
        reason = `${well.name} is red because pressure override logic is active, which is temporarily pulling the system away from individual well targets.`
      }

      return {
        name: well.name,
        title: `${well.name} below target`,
        detail: reason,
        stats: `${formatMcfd(well.actualRate)} actual vs ${formatMcfd(desired)} target`,
      }
    })

  const compressorExplanations = compressors.map((compressor) => {
    let status = 'Healthy'
    let detail = `${compressor.name} is online and carrying ${Math.round(compressor.loadPct || 0)}% load.`

    if (compressor.personnelLockout) {
      status = 'Lockout'
      detail = `${compressor.name} is in personnel lockout, so Well Logic must ignore it for remote optimization actions.`
    } else if (!isCompressorOnline(compressor)) {
      status = 'Offline'
      detail = `${compressor.name} is offline, so the remaining compressors must absorb its share of the pad flow.`
    } else if ((state.startupAssistRemaining || 0) > 0 && (compressor.actualThroughput || 0) < (compressor.capacityMcfd || 0) * 0.35) {
      status = 'Ramping'
      detail = `${compressor.name} is still ramping in from a low-flow or dead-start condition.`
    } else if ((compressor.loadPct || 0) >= 95 && shortage > 5) {
      status = 'At limit'
      detail = `${compressor.name} is effectively maxed out because total well demand is above the available compressor capacity.`
    } else if ((state.suctionHeaderPressure || 0) > suctionUpperLimit) {
      status = 'Pressure control'
      detail = `${compressor.name} is operating while the pad fights elevated suction pressure at ${formatPsi(state.suctionHeaderPressure)}.`
    }

    return {
      name: compressor.name,
      status,
      detail,
      stats: `${formatMcfd(compressor.actualThroughput)} throughput | ${Math.round(compressor.loadPct || 0)}% load`,
      tone: status === 'Healthy' ? 'neutral' : status === 'Ramping' || status === 'Pressure control' ? 'warning' : 'critical',
    }
  })

  return {
    modeTitle,
    modeBody,
    constraints,
    redWellReasons,
    compressorExplanations,
    alarms: state.alarms || [],
    snapshot: {
      effectiveGas,
      onlineCapacity,
      totalAvailableGas,
      totalDesired,
      totalActual,
      onlineCompressors: onlineCompressors.length,
      totalCompressors: compressors.length,
    },
  }
}

export default function AdminPanel({ state, onFieldChange, onClose }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const tuning = state.tuning || DEFAULT_TUNING
  const logicSummary = buildLogicSummary(state)

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
      realtime: {
        chokeMoveRate: 0.03, flowResponseRate: 0.04, productionLag: 0.02,
        rebalanceRate: 0.015, compressorRamp: 0.06, compressorSpindownRate: 0.04,
        pressureResponse: 0.08, salesValveOpenRate: 0.10, salesValveCloseRate: 0.03,
        tickInterval: 500,
      },
      demo: {
        chokeMoveRate: 0.08, flowResponseRate: 0.10, productionLag: 0.05,
        rebalanceRate: 0.04, compressorRamp: 0.12, compressorSpindownRate: 0.08,
        pressureResponse: 0.15, salesValveOpenRate: 0.20, salesValveCloseRate: 0.08,
        tickInterval: 500,
      },
      fast: {
        chokeMoveRate: 0.15, flowResponseRate: 0.20, productionLag: 0.10,
        rebalanceRate: 0.08, compressorRamp: 0.20, compressorSpindownRate: 0.15,
        pressureResponse: 0.25, salesValveOpenRate: 0.30, salesValveCloseRate: 0.15,
        tickInterval: 400,
      },
      instant: {
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
        <div className="bg-[#0F3C64] border border-[#333] rounded-xl p-8 w-[380px] shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#D32028] text-xl">LOCK</span>
            <h2 className="text-lg text-white font-bold" style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}>Admin Access</h2>
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
            className="w-full bg-[#293C5B] border border-[#333] rounded px-3 py-2.5 text-white text-sm outline-none focus:border-[#D32028] mb-3"
            autoFocus
          />
          {error && <p className="text-[#D32028] text-[11px] mb-3">Incorrect password. Try again.</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white hover:border-[#555]">
              Cancel
            </button>
            <button onClick={handleLogin} className="flex-1 py-2 text-[11px] font-bold bg-[#D32028] text-white rounded hover:bg-[#B01A20]">
              Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end" onClick={onClose}>
      <div className="w-[560px] h-full bg-[#0e0e18] border-l border-[#2a2a3a] shadow-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-[#0e0e18] border-b border-[#2a2a3a] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[#D32028]">TUNE</span>
              <h2 className="text-sm text-white font-bold" style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}>
                Admin - Simulation Tuning
              </h2>
            </div>
            <button onClick={onClose} className="text-[#888] hover:text-white text-lg">X</button>
          </div>
          <p className="text-[10px] text-[#666] mt-1">Adjust response rates and timing, and see why Well Logic is taking each action.</p>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <div className="text-[9px] text-[#D32028] uppercase tracking-wider font-bold">Live Logic Feed</div>
                <div className="text-[15px] text-white font-bold mt-1">{logicSummary.modeTitle}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-[#666] uppercase tracking-wider">Running Compressors</div>
                <div className="text-[13px] text-white font-bold">
                  {logicSummary.snapshot.onlineCompressors}/{logicSummary.snapshot.totalCompressors}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#b7b7c9] leading-relaxed">{logicSummary.modeBody}</p>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <LogicStatCard label="Usable Gas" value={formatMcfd(logicSummary.snapshot.effectiveGas)} />
              <LogicStatCard label="Well Demand" value={formatMcfd(logicSummary.snapshot.totalDesired)} />
              <LogicStatCard label="Actual Injection" value={formatMcfd(logicSummary.snapshot.totalActual)} />
              <LogicStatCard label="Online Capacity" value={formatMcfd(logicSummary.snapshot.onlineCapacity)} />
            </div>

            {logicSummary.constraints.length > 0 && (
              <div className="mt-3">
                <div className="text-[9px] text-[#f97316] uppercase tracking-wider font-bold mb-2">Active Constraints</div>
                <div className="space-y-2">
                  {logicSummary.constraints.map((constraint) => (
                    <div key={constraint} className="rounded border border-[#3a2c1d] bg-[#1a130d] px-2.5 py-2 text-[10px] text-[#f6c68e]">
                      {constraint}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {logicSummary.alarms.length > 0 && (
              <div className="mt-3">
                <div className="text-[9px] text-[#f97316] uppercase tracking-wider font-bold mb-2">Active Alarms</div>
                <div className="space-y-2">
                  {logicSummary.alarms.map((alarm) => (
                    <AlarmRow key={alarm.message} alarm={alarm} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-3">
            <div className="text-[9px] text-[#D32028] uppercase tracking-wider font-bold mb-2">Why It Is Red</div>
            {logicSummary.redWellReasons.length === 0 ? (
              <div className="rounded border border-[#1f4d30] bg-[#0d1d14] px-2.5 py-2 text-[10px] text-[#86efac]">
                No wells are red right now. Well Logic currently has the pad inside target conditions.
              </div>
            ) : (
              <div className="space-y-2">
                {logicSummary.redWellReasons.map((item) => (
                  <LogicReasonCard key={item.name} title={item.title} detail={item.detail} stats={item.stats} tone="critical" />
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-3">
            <div className="text-[9px] text-[#D32028] uppercase tracking-wider font-bold mb-2">Compressor Action Detail</div>
            <div className="space-y-2">
              {logicSummary.compressorExplanations.map((item) => (
                <LogicReasonCard
                  key={item.name}
                  title={`${item.name} - ${item.status}`}
                  detail={item.detail}
                  stats={item.stats}
                  tone={item.tone}
                />
              ))}
            </div>
          </div>

          <div className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-3">
            <div className="text-[9px] text-[#D32028] uppercase tracking-wider font-bold mb-2">Speed Presets</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'realtime', label: 'Real-Time', desc: '30-90 sec response' },
                { id: 'demo', label: 'Demo Speed', desc: '10-25 sec response' },
                { id: 'fast', label: 'Fast', desc: '5-10 sec response' },
                { id: 'instant', label: 'Instant', desc: 'Near-instant for testing' },
              ].map(p => (
                <button key={p.id} onClick={() => applyPreset(p.id)}
                  className="py-2 px-3 rounded border border-[#333] bg-[#03172A] hover:border-[#D32028] hover:bg-[#D32028]/5 text-left transition-colors">
                  <div className="text-[11px] text-white font-bold">{p.label}</div>
                  <div className="text-[9px] text-[#666]">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

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

          <button onClick={resetToDefaults}
            className="w-full py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white hover:border-[#D32028] transition-colors">
            Reset All to Defaults
          </button>

          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}

function TuningSlider({ param, value, defaultValue, onChange }) {
  const { label, desc, min, max, step, unit } = param
  const isDefault = Math.abs(value - defaultValue) < step * 0.5

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] text-[#ccc] font-bold">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-white font-bold tabular-nums">{value.toFixed(step < 0.1 ? 3 : step < 1 ? 2 : 0)}</span>
          {unit && <span className="text-[9px] text-[#666]">{unit}</span>}
          {!isDefault && (
            <button onClick={() => onChange(defaultValue)} className="text-[8px] text-[#D32028] hover:text-white ml-1">Reset</button>
          )}
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#D32028]" style={{ height: 4 }}
      />
      <div className="flex justify-between text-[8px] text-[#444] mt-0.5">
        <span>Slower ({min})</span>
        <span>Faster ({max})</span>
      </div>
      {desc && <p className="text-[9px] text-[#555] mt-0.5">{desc}</p>}
    </div>
  )
}

function LogicStatCard({ label, value }) {
  return (
    <div className="rounded border border-[#2a2a3a] bg-[#03172A] px-2.5 py-2">
      <div className="text-[8px] text-[#666] uppercase tracking-wider">{label}</div>
      <div className="text-[12px] text-white font-bold mt-0.5">{value}</div>
    </div>
  )
}

function AlarmRow({ alarm }) {
  const tone =
    alarm.type === 'critical'
      ? 'border-[#5a1d1d] bg-[#1f0c0c] text-[#fca5a5]'
      : alarm.type === 'warning'
        ? 'border-[#4f3512] bg-[#1b1308] text-[#fdba74]'
        : 'border-[#16384f] bg-[#091520] text-[#93c5fd]'

  return (
    <div className={`rounded border px-2.5 py-2 text-[10px] ${tone}`}>
      {alarm.message}
    </div>
  )
}

function LogicReasonCard({ title, detail, stats, tone = 'neutral' }) {
  const toneClass =
    tone === 'critical'
      ? 'border-[#5a1d1d] bg-[#1f0c0c]'
      : tone === 'warning'
        ? 'border-[#4f3512] bg-[#1b1308]'
        : 'border-[#2a2a3a] bg-[#03172A]'

  const badgeClass =
    tone === 'critical'
      ? 'bg-[#D32028]/15 text-[#fca5a5] border-[#D32028]/30'
      : tone === 'warning'
        ? 'bg-[#f97316]/15 text-[#fdba74] border-[#f97316]/30'
        : 'bg-[#1a1a30] text-[#9ca3af] border-[#333]'

  return (
    <div className={`rounded border p-2.5 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-white font-bold">{title}</div>
          <p className="text-[10px] text-[#c9c9d8] leading-relaxed mt-1">{detail}</p>
        </div>
        <div className={`shrink-0 rounded border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${badgeClass}`}>
          Live
        </div>
      </div>
      <div className="text-[9px] text-[#777] mt-2">{stats}</div>
    </div>
  )
}
