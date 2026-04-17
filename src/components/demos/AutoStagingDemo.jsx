import DemoPage from './DemoPage'

export default function AutoStagingDemo({ sim }) {
  const runningCount = sim.state.compressors.filter(c => c.status === 'running').length
  const activeWells = sim.state.wells.filter(w => w.desiredRate > 0).length

  const triggers = [
    {
      label: 'Full Pad - All Wells Online',
      description: 'Maximum demand - all compressors needed',
      icon: 'MAX',
      onClick: () => {
        sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
        sim.state.wells.forEach(w => sim.setWellDesiredRate(w.id, 150))
        sim.setTotalAvailableGas(sim.state.maxGasCapacity)
      },
    },
    {
      label: 'Shut In Half the Wells',
      description: 'Operator shuts in low producers - excess capacity',
      icon: 'HALF',
      onClick: () => {
        sim.state.wells.forEach((w, i) => sim.setWellDesiredRate(w.id, i < Math.ceil(sim.state.wells.length / 2) ? 150 : 0))
      },
    },
    {
      label: 'Single Well Only',
      description: 'Workover on pad - only one well producing',
      icon: 'ONE',
      onClick: () => {
        sim.state.wells.forEach((w, i) => sim.setWellDesiredRate(w.id, i === 0 ? 150 : 0))
      },
    },
    {
      label: 'Ramp Up Pad Gradually',
      description: 'New pad coming online - wells added one by one every 8 seconds',
      icon: 'RAMP',
      onClick: () => {
        sim.state.wells.forEach(w => sim.setWellDesiredRate(w.id, 0))
        sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
        sim.setTotalAvailableGas(sim.state.maxGasCapacity)
        sim.state.wells.forEach((w, i) => {
          setTimeout(() => sim.setWellDesiredRate(w.id, 150), i * 8000)
        })
      },
    },
    {
      label: 'Night Mode - Reduce Rates',
      description: 'Operator lowers all well rates for overnight',
      icon: 'NITE',
      onClick: () => sim.state.wells.forEach(w => sim.setWellDesiredRate(w.id, 80)),
    },
    {
      label: 'Morning Ramp - Full Rates',
      description: 'Morning crew brings rates back up',
      icon: 'AM',
      onClick: () => sim.state.wells.forEach(w => sim.setWellDesiredRate(w.id, 150)),
    },
    {
      label: 'Stop All Compressors',
      description: 'Full pad shutdown - everything stops',
      icon: 'STOP',
      onClick: () => sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'stopped')),
    },
    {
      label: 'Restart Pad',
      description: 'Bring compressors back online',
      icon: 'RUN',
      onClick: () => sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running')),
    },
    {
      label: 'Reset All',
      icon: 'RESET',
      onClick: () => {
        sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
        sim.state.wells.forEach(w => sim.setWellDesiredRate(w.id, 150))
        sim.setTotalAvailableGas(sim.state.maxGasCapacity)
      },
    },
  ]

  return (
    <DemoPage
      sim={sim}
      title="Automatic Compressor Staging"
      pitch="Well Logic starts and stops compressors automatically based on pad demand. As wells come online or shut in, the system stages compressors up or down - matching capacity to demand without wasting fuel or leaving production on the table."
      triggers={triggers}
    >
      <div className="text-[8px] text-[#888] uppercase tracking-wider font-bold mb-2">Pad Status</div>
      <div className="bg-[#111] rounded p-2.5 space-y-1.5 text-[10px]">
        <div className="flex justify-between"><span className="text-[#888]">Active Wells</span><span className="text-white font-bold">{activeWells} / {sim.state.wells.length}</span></div>
        <div className="flex justify-between"><span className="text-[#888]">Compressors Running</span><span className="text-white font-bold">{runningCount} / {sim.state.compressors.length}</span></div>
        <div className="flex justify-between"><span className="text-[#888]">Staging Lockout</span>
          <span className={`font-bold ${sim.state.stagingLockoutRemaining > 0 ? 'text-[#eab308]' : 'text-[#22c55e]'}`}>
            {sim.state.stagingLockoutRemaining > 0 ? `${sim.state.stagingLockoutRemaining.toFixed(0)}s` : 'CLEAR'}
          </span></div>
      </div>
    </DemoPage>
  )
}
