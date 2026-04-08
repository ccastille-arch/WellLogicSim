import DemoPage from './DemoPage'

export default function CompressorTripDemo({ sim }) {
  const triggers = [
    ...sim.state.compressors.map(c => ({
      label: `Trip ${c.name}`,
      description: `Simulate unexpected ${c.name} shutdown`,
      icon: '⚡',
      onClick: () => sim.setCompressorStatus(c.id, 'tripped'),
      active: c.status === 'tripped',
    })),
    {
      label: 'Restore All Compressors',
      description: 'Bring all units back online',
      icon: '↩️',
      onClick: () => {
        sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
      },
    },
  ]

  return (
    <DemoPage
      sim={sim}
      title="Compressor Trip Response"
      pitch="When a compressor goes down unexpectedly, WellLogic instantly rebalances gas distribution across remaining units — no operator intervention needed. Your highest-priority wells stay protected while the system adapts in seconds."
      triggers={triggers}
    >
      <div className="text-[9px] text-[#888] uppercase tracking-wider font-bold mb-2">Compressor Status</div>
      {sim.state.compressors.map(c => {
        const running = c.status === 'running'
        return (
          <div key={c.id} className="flex items-center gap-2 py-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: running ? '#22c55e' : '#E8200C' }} />
            <span className="text-[11px] text-white font-bold">{c.name}</span>
            <span className={`text-[10px] ml-auto ${running ? 'text-[#22c55e]' : 'text-[#E8200C]'}`}>
              {running ? `${c.loadPct.toFixed(0)}% LOAD` : 'TRIPPED'}
            </span>
          </div>
        )
      })}
    </DemoPage>
  )
}
