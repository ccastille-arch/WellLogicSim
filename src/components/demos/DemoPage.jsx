// Reusable demo page shell - full site diagram visible at all times

import SiteOverview from '../SiteOverview'
import { getMetrics } from '../../engine/simulation'

export default function DemoPage({ title, pitch, triggers, metrics, children, sim }) {
  const m = getMetrics(sim.state)

  const resetAll = () => {
    if (!sim?.state) return
    sim.state.compressors?.forEach(c => sim.setCompressorStatus(c.id, 'running'))
    sim.state.wells?.forEach(w => { if (w.desiredRate === 0) sim.setWellDesiredRate(w.id, 150) })
    sim.setTotalAvailableGas(sim.state.maxGasCapacity)
    sim.setStateField('wellUnloadActive', false)
    sim.setStateField('salesValvePosition', 0)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#05233E]">
      {/* Middle: Diagram + trigger sidebar - takes all available space */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Live diagram - full site visible */}
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative">
          <SiteOverview state={sim.state} config={sim.state.config} animateFlow={false} verticalOffset={-85} />
          <button
            onClick={resetAll}
            className="absolute top-3 right-3 z-10 px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-black text-[11px] font-bold rounded-lg shadow-lg shadow-[#22c55e]/20 transition-all active:scale-95"
            style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}
          >
            RESET ALL TO NORMAL
          </button>
        </div>

        {/* Trigger buttons sidebar */}
        <div className="w-[260px] shrink-0 bg-[#0e0e18] border-l border-[#293C5B] flex flex-col overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-[#293C5B] shrink-0">
            <h2 className="text-[13px] text-white font-bold" style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}>
              {title}
            </h2>
            <p className="text-[10px] text-[#999] mt-1 leading-relaxed">{pitch}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 sidebar-scroll">
            <div
              className="text-[8px] text-[#D32028] uppercase tracking-wider font-bold mb-1"
              style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}
            >
              Scenario Controls
            </div>
            {triggers.map((t, i) => (
              <TriggerButton key={i} {...t} />
            ))}
            {children && <div className="mt-3 pt-3 border-t border-[#293C5B]">{children}</div>}
          </div>
        </div>
      </div>

      {/* Bottom: live metrics */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F3C64] border-t border-[#293C5B] shrink-0 overflow-x-auto">
        {(metrics || defaultMetrics(m)).map((met, i) => (
          <MetricChip key={i} {...met} />
        ))}
      </div>
    </div>
  )
}

function TriggerButton({ label, description, onClick, active, icon }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
        active
          ? 'border-[#D32028]'
          : 'bg-[#111120] border-[#2a2a3a] hover:border-[#444] hover:bg-[#16162a]'
      }`}
      style={active ? { backgroundColor: '#D3202815', borderColor: '#D32028' } : undefined}
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span className="min-w-[30px] text-center text-[9px] font-black tracking-[0.12em] text-[#D32028]">
            {icon}
          </span>
        )}
        <span className={`text-[11px] font-bold ${active ? 'text-white' : 'text-[#ccc]'}`}>{label}</span>
      </div>
      {description && <p className="text-[9px] text-[#666] mt-0.5 leading-tight">{description}</p>}
    </button>
  )
}

function MetricChip({ label, value, unit, color }) {
  return (
    <div className="bg-[#111120] rounded px-2.5 py-1 min-w-[100px] shrink-0">
      <div className="text-[7px] text-[#555] uppercase tracking-wider">{label}</div>
      <span className="text-[12px] font-bold" style={{ color: color || '#fff', fontFamily: "'Montserrat', Arial, sans-serif" }}>
        {value}
      </span>
      {unit && <span className="text-[7px] text-[#555] ml-1">{unit}</span>}
    </div>
  )
}

function defaultMetrics(m) {
  return [
    { label: 'Injection Rate', value: `${m.totalActualMcfd.toFixed(0)}`, unit: 'MCFD' },
    { label: 'Accuracy', value: `${m.injectionAccuracy.toFixed(1)}%`, color: m.injectionAccuracy >= 95 ? '#22c55e' : m.injectionAccuracy >= 80 ? '#eab308' : '#D32028' },
    { label: 'Production', value: `${m.totalProductionBoe.toFixed(0)}`, unit: 'BOE/day' },
    { label: 'Compressors', value: `${m.compressorsOnline}/${m.compressorsTotal}`, color: m.compressorsOnline === m.compressorsTotal ? '#22c55e' : '#eab308' },
    { label: 'Wells at Target', value: `${m.wellsAtTarget}/${m.wellsTotal}`, color: m.wellsAtTarget === m.wellsTotal ? '#22c55e' : '#D32028' },
  ]
}
