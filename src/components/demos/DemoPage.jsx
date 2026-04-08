// Reusable demo page shell
// Layout: pitch (left top) | live diagram (center) | triggers (right) | metrics (bottom)

import SiteOverview from '../SiteOverview'
import { getMetrics } from '../../engine/simulation'

export default function DemoPage({ title, pitch, triggers, metrics, children, sim }) {
  const m = getMetrics(sim.state)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#080810]">
      {/* Top: Title + Pitch */}
      <div className="px-6 py-4 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <h2 className="text-lg text-white font-bold" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {title}
        </h2>
        <p className="text-[13px] text-[#bbb] mt-1 max-w-[700px]">{pitch}</p>
      </div>

      {/* Middle: Diagram + Trigger sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Live diagram */}
        <div className="flex-1 overflow-hidden">
          <SiteOverview state={sim.state} config={sim.state.config} />
        </div>

        {/* Trigger buttons sidebar */}
        <div className="w-[240px] shrink-0 bg-[#0e0e18] border-l border-[#1a1a2a] p-4 overflow-y-auto">
          <div className="text-[9px] text-[#E8200C] uppercase tracking-wider font-bold mb-3"
            style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
            Scenario Controls
          </div>
          <div className="space-y-2">
            {triggers.map((t, i) => (
              <TriggerButton key={i} {...t} />
            ))}
          </div>
          {/* Extra content from specific demos */}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>

      {/* Bottom: Live Metrics */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#0c0c16] border-t border-[#1a1a2a] shrink-0">
        {(metrics || defaultMetrics(m)).map((met, i) => (
          <MetricChip key={i} {...met} />
        ))}
      </div>
    </div>
  )
}

function TriggerButton({ label, description, onClick, active, color = '#E8200C', icon }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
        active
          ? `bg-[${color}]/15 border-[${color}]`
          : 'bg-[#111120] border-[#2a2a3a] hover:border-[#444] hover:bg-[#16162a]'
      }`}
      style={active ? { backgroundColor: `${color}15`, borderColor: color } : undefined}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-sm">{icon}</span>}
        <span className={`text-[12px] font-bold ${active ? 'text-white' : 'text-[#ccc]'}`}>{label}</span>
      </div>
      {description && <p className="text-[10px] text-[#777] mt-0.5">{description}</p>}
    </button>
  )
}

function MetricChip({ label, value, unit, color }) {
  return (
    <div className="bg-[#111120] rounded px-3 py-1.5 min-w-[110px]">
      <div className="text-[8px] text-[#666] uppercase tracking-wider">{label}</div>
      <span className="text-sm font-bold" style={{ color: color || '#fff', fontFamily: "'Arial Black', Arial, sans-serif" }}>
        {value}
      </span>
      {unit && <span className="text-[8px] text-[#666] ml-1">{unit}</span>}
    </div>
  )
}

function defaultMetrics(m) {
  return [
    { label: 'Injection Rate', value: `${m.totalActualMcfd.toFixed(0)}`, unit: 'MCFD' },
    { label: 'Accuracy', value: `${m.injectionAccuracy.toFixed(1)}%`, color: m.injectionAccuracy >= 95 ? '#22c55e' : m.injectionAccuracy >= 80 ? '#eab308' : '#E8200C' },
    { label: 'Production', value: `${m.totalProductionBoe.toFixed(0)}`, unit: 'BOE/day' },
    { label: 'Compressors', value: `${m.compressorsOnline}/${m.compressorsTotal}`, color: m.compressorsOnline === m.compressorsTotal ? '#22c55e' : '#eab308' },
    { label: 'Wells at Target', value: `${m.wellsAtTarget}/${m.wellsTotal}`, color: m.wellsAtTarget === m.wellsTotal ? '#22c55e' : '#E8200C' },
  ]
}
