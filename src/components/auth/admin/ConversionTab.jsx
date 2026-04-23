import { useState, useMemo } from 'react'

const DEFAULT_INPUTS = {
  compressorCapacity: 1600,
  compressorsOnline: 2,
  baseline: 120,
  setpoints: [1000, 600, 500, 500],
}

function priorityAllocate(setpoints, totalGas) {
  let remaining = totalGas
  return setpoints.map(sp => {
    const allocated = Math.min(sp, remaining)
    remaining = Math.max(0, remaining - allocated)
    return allocated
  })
}

function Row({ label, value, unit, dimmed }) {
  return (
    <div className={`flex items-center justify-between px-3 py-1.5 rounded ${dimmed ? 'opacity-40' : ''}`}>
      <span className="text-[11px] text-[#aaa]">{label}</span>
      <span className="text-[12px] font-bold text-white font-mono">
        {value}<span className="text-[10px] text-[#555] font-normal ml-1">{unit}</span>
      </span>
    </div>
  )
}

function WellResultRow({ name, setpoint, allocated, baseline }) {
  const accuracy = setpoint > 0 ? (allocated / setpoint) * 100 : 0
  const atTarget = accuracy >= 95
  const production = baseline * Math.min(accuracy / 100, 1)

  return (
    <tr className="border-b border-[#1a1a2a]">
      <td className="px-3 py-2 text-[11px] font-bold text-white">{name}</td>
      <td className="px-3 py-2 text-[11px] text-[#888] text-right">{setpoint}</td>
      <td className="px-3 py-2 text-[11px] text-right">
        <span className={allocated > 0 ? 'text-white' : 'text-[#555]'}>{allocated.toFixed(0)}</span>
      </td>
      <td className="px-3 py-2 text-right">
        <span className="text-[11px] font-bold" style={{ color: atTarget ? '#22c55e' : accuracy >= 70 ? '#eab308' : '#E8200C' }}>
          {accuracy.toFixed(1)}%
        </span>
      </td>
      <td className="px-3 py-2 text-center">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
          backgroundColor: atTarget ? '#0d2a0d' : '#2a0d0d',
          color: atTarget ? '#22c55e' : '#E8200C',
        }}>
          {atTarget ? '● ON' : '● OFF'}
        </span>
      </td>
      <td className="px-3 py-2 text-[11px] text-right text-[#aaa]">{production.toFixed(1)}</td>
    </tr>
  )
}

export default function ConversionTab() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS)
  const [formulasOpen, setFormulasOpen] = useState(false)

  const set = (key, val) => setInputs(prev => ({ ...prev, [key]: val }))
  const setWell = (i, val) => setInputs(prev => ({
    ...prev,
    setpoints: prev.setpoints.map((v, idx) => idx === i ? val : v),
  }))

  const totalGas = inputs.compressorCapacity * inputs.compressorsOnline
  const allocations = useMemo(
    () => priorityAllocate(inputs.setpoints, totalGas),
    [inputs.setpoints, totalGas],
  )
  const totalAllocated = allocations.reduce((s, a) => s + a, 0)
  const totalDesired = inputs.setpoints.reduce((s, v) => s + v, 0)
  const totalProduction = allocations.reduce((s, a, i) => {
    const acc = inputs.setpoints[i] > 0 ? a / inputs.setpoints[i] : 0
    return s + inputs.baseline * Math.min(acc, 1)
  }, 0)
  const systemEfficiency = totalGas > 0 ? (totalAllocated / totalGas) * 100 : 0
  const wellsAtTarget = allocations.filter((a, i) => inputs.setpoints[i] > 0 && a / inputs.setpoints[i] >= 0.95).length

  const inputCls = "w-full px-2 py-1 text-[11px] bg-[#050508] border border-[#333] rounded text-white focus:border-[#E8200C] focus:outline-none"

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-1">Simulator Conversion Calculator</h3>
        <p className="text-[11px] text-[#888]">
          Enter your real-world numbers to see how the priority allocation algorithm distributes gas across wells.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Inputs */}
        <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4 space-y-4">
          <h3 className="text-[11px] font-bold text-[#E8200C] uppercase tracking-wider">Inputs</h3>

          <div>
            <label className="block text-[10px] text-[#888] mb-1">Compressor Capacity (MCFD each)</label>
            <input type="number" min="0" max="10000" step="100"
              value={inputs.compressorCapacity}
              onChange={e => set('compressorCapacity', parseFloat(e.target.value) || 0)}
              className={inputCls} />
          </div>

          <div>
            <label className="block text-[10px] text-[#888] mb-1">Compressors Online</label>
            <div className="flex gap-2">
              {[1, 2].map(n => (
                <button key={n} onClick={() => set('compressorsOnline', n)}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded border transition-colors ${
                    inputs.compressorsOnline === n
                      ? 'bg-[#E8200C] text-white border-[#E8200C]'
                      : 'text-[#888] border-[#333] hover:text-white'
                  }`}>
                  {n}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-[#555] mt-1">
              Total capacity: <span className="text-white font-bold">{totalGas.toLocaleString()} MCFD</span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-[#888] mb-1">Baseline Production (BOE/day per well)</label>
            <input type="number" min="0" max="1000" step="10"
              value={inputs.baseline}
              onChange={e => set('baseline', parseFloat(e.target.value) || 0)}
              className={inputCls} />
          </div>

          <div>
            <label className="block text-[10px] text-[#888] mb-2">Well Injection Setpoints (MCFD)</label>
            <div className="space-y-2">
              {inputs.setpoints.map((sp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-[#E8200C] font-bold w-6">W{i + 1}</span>
                  <input type="number" min="0" max="5000" step="50"
                    value={sp}
                    onChange={e => setWell(i, parseFloat(e.target.value) || 0)}
                    className={inputCls} />
                  <span className="text-[9px] text-[#555]">Pri {i + 1}</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-[#555] mt-1">
              Total desired: <span className="text-white">{totalDesired.toLocaleString()} MCFD</span>
              {totalDesired > totalGas && (
                <span className="ml-2 text-[#eab308]">↑ over capacity by {(totalDesired - totalGas).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Summary outputs */}
        <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4 space-y-3">
          <h3 className="text-[11px] font-bold text-[#E8200C] uppercase tracking-wider">System Summary</h3>

          <div className="space-y-1">
            <Row label="Total Gas Available" value={totalGas.toLocaleString()} unit="MCFD" />
            <Row label="Total Allocated" value={totalAllocated.toLocaleString()} unit="MCFD" />
            <Row label="System Efficiency"
              value={`${systemEfficiency.toFixed(1)}%`}
              unit="" />
            <div className="border-t border-[#1a1a2a] my-2" />
            <Row label="Wells at Target" value={`${wellsAtTarget} / ${inputs.setpoints.length}`} unit="" />
            <Row label="Total Production (est)" value={totalProduction.toFixed(1)} unit="BOE/day" />
          </div>

          {/* Status indicator */}
          <div className={`mt-3 p-2 rounded-lg text-center text-[11px] font-bold ${
            wellsAtTarget === inputs.setpoints.length
              ? 'bg-[#0d2a0d] text-[#22c55e]'
              : wellsAtTarget > 0
              ? 'bg-[#1a1a0a] text-[#eab308]'
              : 'bg-[#2a0d0d] text-[#E8200C]'
          }`}>
            {wellsAtTarget === inputs.setpoints.length
              ? 'All wells at target injection'
              : `${inputs.setpoints.length - wellsAtTarget} well${inputs.setpoints.length - wellsAtTarget !== 1 ? 's' : ''} curtailed by priority`}
          </div>
        </div>
      </div>

      {/* Per-well results table */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a2a]">
          <h3 className="text-[11px] font-bold text-white">Per-Well Allocation Results</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a2a] bg-[#090913]">
                <th className="px-3 py-2 text-left text-[9px] text-[#555] uppercase tracking-wider">Well</th>
                <th className="px-3 py-2 text-right text-[9px] text-[#555] uppercase tracking-wider">Setpoint</th>
                <th className="px-3 py-2 text-right text-[9px] text-[#555] uppercase tracking-wider">Allocated</th>
                <th className="px-3 py-2 text-right text-[9px] text-[#555] uppercase tracking-wider">Accuracy</th>
                <th className="px-3 py-2 text-center text-[9px] text-[#555] uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 text-right text-[9px] text-[#555] uppercase tracking-wider">Prod (BOE/d)</th>
              </tr>
            </thead>
            <tbody>
              {inputs.setpoints.map((sp, i) => (
                <WellResultRow
                  key={i}
                  name={`W${i + 1} (P${i + 1})`}
                  setpoint={sp}
                  allocated={allocations[i]}
                  baseline={inputs.baseline}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#090913]">
                <td colSpan={2} className="px-3 py-2 text-[10px] text-[#555]">Totals</td>
                <td className="px-3 py-2 text-right text-[11px] font-bold text-white">{totalAllocated.toFixed(0)}</td>
                <td className="px-3 py-2 text-right text-[11px] font-bold" style={{
                  color: totalDesired > 0 ? (totalAllocated / totalDesired >= 0.95 ? '#22c55e' : '#eab308') : '#fff',
                }}>
                  {totalDesired > 0 ? ((totalAllocated / totalDesired) * 100).toFixed(1) : '—'}%
                </td>
                <td />
                <td className="px-3 py-2 text-right text-[11px] font-bold text-white">{totalProduction.toFixed(1)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Formula reference */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] overflow-hidden">
        <button
          onClick={() => setFormulasOpen(v => !v)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5"
        >
          <span className="text-[11px] font-bold text-white">Formula Reference</span>
          <span className="text-[10px] text-[#555]">{formulasOpen ? '▲ Hide' : '▼ Show'}</span>
        </button>

        {formulasOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-[#1a1a2a]">
            <Formula
              name="Priority Allocation"
              eq="allocated[i] = min(setpoint[i], remainingGas)"
              note="Wells allocate gas in priority order (W1 first). Each takes what it needs; the rest passes down."
            />
            <Formula
              name="Injection Accuracy"
              eq="accuracy = (allocated / setpoint) × 100%"
              note="Measures how close actual injection is to target. ≥95% = at target (green)."
            />
            <Formula
              name="Well Status"
              eq="status = accuracy ≥ 95% ? GREEN : RED"
              note="The 95% threshold matches PLC dead-band logic — within 5% is considered on-target."
            />
            <Formula
              name="Production Estimate"
              eq="production = baseline × min(accuracy / 100, 1)"
              note="Production scales linearly with injection accuracy up to 100%. Baseline is BOE/day at perfect injection."
            />
            <Formula
              name="Choke AO%"
              eq="chokeAO ≈ (allocated / setpoint) × 100"
              note="Choke analog output tracks the allocation fraction. Klondike field data shows 65–68% AO at normal operation."
            />
            <Formula
              name="Static Injection Pressure"
              eq="P_static ≈ 805 + (1 − flowFraction) × 30  [PSI]"
              note="Pressure rises as choke closes (less flow through). Klondike baseline: 779–861 PSI."
            />
            <Formula
              name="Differential Pressure"
              eq="ΔP ≈ 45 × flowFraction²  [PSI]"
              note="Diff pressure across choke scales with flow squared. Typical 41–50 PSI; spikes to 800+ during unload."
            />
            <Formula
              name="System Efficiency"
              eq="efficiency = totalAllocated / totalCapacity × 100%"
              note="How much of available compressor gas is actually being injected."
            />
          </div>
        )}
      </div>
    </div>
  )
}

function Formula({ name, eq, note }) {
  return (
    <div className="pt-3">
      <div className="text-[10px] font-bold text-[#E8200C] uppercase tracking-wider mb-1">{name}</div>
      <div className="font-mono text-[12px] text-[#22c55e] bg-[#050a05] border border-[#1a2a1a] rounded px-3 py-2 mb-1">
        {eq}
      </div>
      <div className="text-[10px] text-[#666]">{note}</div>
    </div>
  )
}
