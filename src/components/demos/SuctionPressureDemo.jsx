import DemoPage from './DemoPage'

export default function SuctionPressureDemo({ sim }) {
  const target = sim.state.suctionTarget
  const upper = target + sim.state.suctionHighRange

  const triggers = [
    {
      label: 'Normal Operation',
      description: `Suction at target (~${target} PSI)`,
      icon: '🟢',
      onClick: () => {
        sim.setTotalAvailableGas(sim.state.maxGasCapacity)
        sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
      },
    },
    {
      label: 'Simulate High Pressure',
      description: `Push suction above upper range (${upper} PSI)`,
      icon: '🔴',
      onClick: () => {
        sim.setStateField('suctionHeaderPressure', upper + 10)
        sim.setStateField('scrubberPressure', upper + 15)
      },
    },
    {
      label: 'Simulate Low Pressure',
      description: 'Reduce supply — compressors slow down to protect suction',
      icon: '🟡',
      onClick: () => {
        sim.setTotalAvailableGas(sim.state.maxGasCapacity * 0.3)
      },
    },
    {
      label: 'Trip One Compressor',
      description: 'Watch remaining units adjust speed',
      icon: '⚡',
      onClick: () => {
        const running = sim.state.compressors.find(c => c.status === 'running')
        if (running) sim.setCompressorStatus(running.id, 'tripped')
      },
    },
    {
      label: 'Reset All',
      icon: '↩️',
      onClick: () => {
        sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
        sim.setTotalAvailableGas(sim.state.maxGasCapacity)
      },
    },
  ]

  const metrics = [
    { label: 'Suction Header', value: sim.state.suctionHeaderPressure.toFixed(0), unit: 'PSI',
      color: sim.state.suctionHeaderPressure > upper ? '#E8200C' :
        sim.state.suctionHeaderPressure < sim.state.suctionLowRange ? '#eab308' : '#22c55e' },
    { label: 'Target', value: `${target}`, unit: 'PSI' },
    { label: 'Upper Limit', value: `${upper}`, unit: 'PSI' },
    ...sim.state.compressors.map(c => ({
      label: `${c.name} RPM`, value: c.rpm.toFixed(0),
      color: c.status === 'running' ? '#22c55e' : '#E8200C',
    })),
  ]

  return (
    <DemoPage
      sim={sim}
      title="Suction Pressure Management"
      pitch="WellLogic maintains stable suction pressure — the foundation of reliable compression. The system continuously adjusts compressor speeds and staging to keep suction within the operating window, preventing both high-pressure events and low-suction shutdowns."
      triggers={triggers}
      metrics={metrics}
    />
  )
}
