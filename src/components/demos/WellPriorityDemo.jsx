import DemoPage from './DemoPage'

export default function WellPriorityDemo({ sim }) {
  const maxGas = sim.state.maxGasCapacity
  const wells = sim.state.wells
  const sortedWells = [...wells].sort((a, b) => a.priority - b.priority)

  const triggers = [
    { label: 'Normal Operations', description: 'Full gas, all wells at target', icon: 'ðŸŸ¢',
      onClick: () => { sim.setTotalAvailableGas(maxGas); sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running')) },
      active: sim.state.totalAvailableGas >= maxGas * 0.9 },
    { label: 'Gas Drops to 70%', description: 'Slight constraint â€” lowest priority well starts losing', icon: 'ðŸŸ¡',
      onClick: () => sim.setTotalAvailableGas(maxGas * 0.7) },
    { label: 'Gas Drops to 50%', description: 'Moderate constraint â€” bottom half of wells cut back', icon: 'ðŸŸ ',
      onClick: () => sim.setTotalAvailableGas(maxGas * 0.5) },
    { label: 'Gas Drops to 30%', description: 'Severe â€” only top 1-2 wells get full injection', icon: 'ðŸ”´',
      onClick: () => sim.setTotalAvailableGas(maxGas * 0.3) },
    { label: 'Trip Largest Compressor', description: 'Sudden capacity loss â€” watch priority kick in', icon: 'âš¡',
      onClick: () => sim.setCompressorStatus(0, 'tripped') },
    { label: 'Swap Top 2 Priorities', description: 'Reprioritize â€” gas shifts to new #1 well', icon: 'ðŸ”„',
      onClick: () => {
        const ids = sortedWells.map(w => w.id)
        const tmp = ids[0]; ids[0] = ids[1]; ids[1] = tmp
        sim.setWellPriorities(ids)
      }},
    { label: 'Reverse All Priorities', description: 'Flip priority order â€” bottom becomes top', icon: 'â†•ï¸',
      onClick: () => sim.setWellPriorities(sortedWells.map(w => w.id).reverse()) },
    { label: 'Restore Full Supply', description: 'Return to normal', icon: 'â†©ï¸',
      onClick: () => { sim.setTotalAvailableGas(maxGas); sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running')) }},
  ]

  return (
    <DemoPage sim={sim} title="Well Prioritization"
      pitch="Pad Logic ensures your highest-value wells always get gas first. When supply is limited, the system protects your top producers while proportionally reducing injection to lower-priority wells."
      triggers={triggers}>
      <div className="text-[8px] text-[#888] uppercase tracking-wider font-bold mb-2">Priority Order</div>
      {sortedWells.map((w, i) => (
        <div key={w.id} className="flex items-center gap-2 py-1 text-[10px]">
          <span className="text-[#555] w-3 text-right font-bold">{i + 1}</span>
          <span className="text-white font-bold w-8">{w.name}</span>
          <div className="flex-1 bg-[#111] rounded h-2 overflow-hidden">
            <div className="h-full transition-all duration-500" style={{
              width: `${w.desiredRate > 0 ? (w.actualRate / w.desiredRate) * 100 : 0}%`,
              backgroundColor: w.isAtTarget ? '#22c55e' : '#E8200C',
            }} />
          </div>
          <span className={`text-[9px] w-8 text-right ${w.isAtTarget ? 'text-[#22c55e]' : 'text-[#E8200C]'}`}>
            {w.actualRate.toFixed(0)}
          </span>
        </div>
      ))}
    </DemoPage>
  )
}

