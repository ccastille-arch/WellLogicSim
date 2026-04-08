import DemoPage from './DemoPage'

export default function WellPriorityDemo({ sim }) {
  const maxGas = sim.state.maxGasCapacity

  const triggers = [
    {
      label: 'Full Gas Supply',
      description: 'All wells receive their target injection rate',
      icon: '🟢',
      onClick: () => sim.setTotalAvailableGas(maxGas),
      active: sim.state.totalAvailableGas >= maxGas * 0.9,
    },
    {
      label: 'Reduce Gas to 60%',
      description: 'Watch lower-priority wells get cut first',
      icon: '🟡',
      onClick: () => sim.setTotalAvailableGas(maxGas * 0.6),
      active: sim.state.totalAvailableGas > maxGas * 0.35 && sim.state.totalAvailableGas < maxGas * 0.65,
    },
    {
      label: 'Reduce Gas to 40%',
      description: 'Only top-priority wells get full gas',
      icon: '🔴',
      onClick: () => sim.setTotalAvailableGas(maxGas * 0.4),
      active: sim.state.totalAvailableGas <= maxGas * 0.45,
    },
    {
      label: 'Restore Full Supply',
      description: 'Return to normal operations',
      icon: '↩️',
      onClick: () => sim.setTotalAvailableGas(maxGas),
    },
  ]

  return (
    <DemoPage
      sim={sim}
      title="Well Prioritization"
      pitch="WellLogic ensures your highest-value wells always get gas first. When supply is limited, the system automatically protects your top producers while proportionally reducing injection to lower-priority wells — all without operator intervention."
      triggers={triggers}
    >
      {/* Priority list */}
      <div className="text-[9px] text-[#888] uppercase tracking-wider font-bold mb-2">Current Priority</div>
      {[...sim.state.wells].sort((a, b) => a.priority - b.priority).map((w, i) => (
        <div key={w.id} className="flex items-center gap-2 py-1 text-[11px]">
          <span className="text-[#666] w-4 text-right font-bold">{i + 1}</span>
          <span className="text-white font-bold">{w.name}</span>
          <div className="flex-1 bg-[#111] rounded h-2 overflow-hidden">
            <div className="h-full transition-all" style={{
              width: `${w.desiredRate > 0 ? (w.actualRate / w.desiredRate) * 100 : 0}%`,
              backgroundColor: w.isAtTarget ? '#22c55e' : '#E8200C',
            }} />
          </div>
          <span className={`text-[10px] ${w.isAtTarget ? 'text-[#22c55e]' : 'text-[#E8200C]'}`}>
            {w.actualRate.toFixed(0)}
          </span>
        </div>
      ))}
    </DemoPage>
  )
}
