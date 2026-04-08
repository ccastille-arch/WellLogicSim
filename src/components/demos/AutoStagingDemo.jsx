import DemoPage from './DemoPage'

export default function AutoStagingDemo({ sim }) {
  const runningCount = sim.state.compressors.filter(c => c.status === 'running').length
  const totalCount = sim.state.compressors.length

  const triggers = [
    {
      label: 'High Demand — All Wells',
      description: 'All wells at full rate — all compressors needed',
      icon: '📈',
      onClick: () => {
        sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
        sim.state.wells.forEach(w => sim.setWellDesiredRate(w.id, 150))
        sim.setTotalAvailableGas(sim.state.maxGasCapacity)
      },
    },
    {
      label: 'Reduce Demand — Half Wells',
      description: 'Shut in half the wells — excess compressor capacity',
      icon: '📉',
      onClick: () => {
        sim.state.wells.forEach((w, i) => {
          sim.setWellDesiredRate(w.id, i < Math.ceil(sim.state.wells.length / 2) ? 150 : 0)
        })
      },
    },
    {
      label: 'Minimum Demand — 1 Well',
      description: 'Only one well producing — compressors stage down',
      icon: '⬇️',
      onClick: () => {
        sim.state.wells.forEach((w, i) => {
          sim.setWellDesiredRate(w.id, i === 0 ? 150 : 0)
        })
      },
    },
    {
      label: 'Ramp Up Demand',
      description: 'Progressively bring wells online',
      icon: '⬆️',
      onClick: () => {
        sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
        sim.state.wells.forEach(w => sim.setWellDesiredRate(w.id, 150))
        sim.setTotalAvailableGas(sim.state.maxGasCapacity)
      },
    },
    {
      label: 'Reset',
      icon: '↩️',
      onClick: () => {
        sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
        sim.state.wells.forEach(w => sim.setWellDesiredRate(w.id, 150))
        sim.setTotalAvailableGas(sim.state.maxGasCapacity)
      },
    },
  ]

  const activeWells = sim.state.wells.filter(w => w.desiredRate > 0).length

  return (
    <DemoPage
      sim={sim}
      title="Automatic Compressor Staging"
      pitch="WellLogic starts and stops compressors automatically based on pad demand. As wells come online or shut in, the system stages compressors up or down — matching capacity to demand without wasting fuel or leaving production on the table."
      triggers={triggers}
    >
      <div className="text-[9px] text-[#888] uppercase tracking-wider font-bold mb-2">Pad Status</div>
      <div className="bg-[#111] rounded p-3 space-y-2">
        <div className="flex justify-between text-[11px]">
          <span className="text-[#888]">Active Wells</span>
          <span className="text-white font-bold">{activeWells} / {sim.state.wells.length}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[#888]">Compressors Running</span>
          <span className="text-white font-bold">{runningCount} / {totalCount}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-[#888]">Staging Lockout</span>
          <span className={`font-bold ${sim.state.stagingLockoutRemaining > 0 ? 'text-[#eab308]' : 'text-[#22c55e]'}`}>
            {sim.state.stagingLockoutRemaining > 0 ? `${sim.state.stagingLockoutRemaining.toFixed(0)}s` : 'CLEAR'}
          </span>
        </div>
      </div>
    </DemoPage>
  )
}
