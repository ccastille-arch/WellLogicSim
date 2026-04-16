import DemoPage from './DemoPage'

export default function CompressorTripDemo({ sim }) {
  const comps = sim.state.compressors

  const triggers = [
    ...comps.map(c => ({
      label: `Trip ${c.name}`, description: `Unexpected ${c.name} shutdown â€” engine fault`, icon: 'âš¡',
      onClick: () => sim.setCompressorStatus(c.id, 'tripped'),
      active: c.status === 'tripped',
    })),
    { label: 'Trip All Compressors', description: 'Total loss of compression â€” worst case', icon: 'ðŸ’¥',
      onClick: () => comps.forEach(c => sim.setCompressorStatus(c.id, 'tripped')) },
    { label: 'Planned Shutdown C1', description: 'Operator takes C1 offline for maintenance', icon: 'ðŸ”§',
      onClick: () => sim.setCompressorStatus(0, 'stopped') },
    { label: 'Sequential Trip', description: 'C1 trips, then C2 trips 10s later', icon: 'âš¡âš¡',
      onClick: () => {
        sim.setCompressorStatus(0, 'tripped')
        setTimeout(() => sim.setCompressorStatus(1, 'tripped'), 10000)
      }},
    { label: 'Bring C1 Back Online', description: 'Restart C1 after trip clear', icon: 'ðŸŸ¢',
      onClick: () => sim.setCompressorStatus(0, 'running') },
    { label: 'Restore All', description: 'All compressors running', icon: 'â†©ï¸',
      onClick: () => comps.forEach(c => sim.setCompressorStatus(c.id, 'running')) },
  ]

  return (
    <DemoPage sim={sim} title="Compressor Trip Response"
      pitch="When a compressor goes down unexpectedly, Pad Logic instantly rebalances gas distribution across remaining units â€” no operator intervention needed. Watch all wells initially lose flow, then priority wells recover as the system corrects."
      triggers={triggers}>
      <div className="text-[8px] text-[#888] uppercase tracking-wider font-bold mb-2">Compressor Status</div>
      {comps.map(c => {
        const running = c.status === 'running'
        return (
          <div key={c.id} className="flex items-center gap-2 py-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: running ? '#22c55e' : c.status === 'tripped' ? '#E8200C' : '#888' }} />
            <span className="text-[11px] text-white font-bold flex-1">{c.name}</span>
            <span className={`text-[9px] ${running ? 'text-[#22c55e]' : 'text-[#E8200C]'}`}>
              {running ? `${c.loadPct.toFixed(0)}%` : c.status.toUpperCase()}
            </span>
          </div>
        )
      })}
    </DemoPage>
  )
}

