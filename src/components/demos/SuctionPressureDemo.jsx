import DemoPage from './DemoPage'

export default function SuctionPressureDemo({ sim }) {
  const target = sim.state.suctionTarget
  const upper = target + sim.state.suctionHighRange

  const triggers = [
    { label: 'Normal Operation', description: `Suction stable at target (~${target} PSI)`, icon: '🟢',
      onClick: () => {
        sim.setTotalAvailableGas(sim.state.maxGasCapacity)
        sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
      }},
    { label: 'High Suction Pressure', description: 'Too much gas in header — compressors need to speed up', icon: '📈',
      onClick: () => {
        sim.setStateField('suctionHeaderPressure', upper + 10)
        sim.setStateField('scrubberPressure', upper + 15)
      }},
    { label: 'Low Suction Pressure', description: 'Gas supply drying up — compressors slow to prevent trip', icon: '📉',
      onClick: () => sim.setTotalAvailableGas(sim.state.maxGasCapacity * 0.25) },
    { label: 'Sales Line Backpressure', description: 'Sales line pressure rises — gas backs up into suction', icon: '🚫',
      onClick: () => {
        sim.setStateField('suctionHeaderPressure', upper + 15)
        sim.setStateField('salesValvePosition', 100)
      }},
    { label: 'Compressor Stagger Demo', description: 'Trip C1 to see stagger offsets in action — C2 reacts at different pressure', icon: '📐',
      onClick: () => sim.setCompressorStatus(0, 'tripped') },
    { label: 'Suction Header Pre-Pack', description: 'Deliberately build header pressure before anticipated supply shortage', icon: '📦',
      onClick: () => sim.setStateField('suctionHeaderPressure', target + sim.state.suctionHighRange * 0.8) },
    { label: 'Ambient Temperature Spike', description: 'Hot day — gas temperature rises, density drops, suction pressure affected', icon: '🌡️',
      onClick: () => sim.setStateField('flowMeterTemp', sim.state.maxTempAtPlate + 10) },
    { label: 'Restore Normal', icon: '↩️',
      onClick: () => {
        sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
        sim.setTotalAvailableGas(sim.state.maxGasCapacity)
        sim.setStateField('salesValvePosition', 0)
      }},
  ]

  const metrics = [
    { label: 'Suction Header', value: sim.state.suctionHeaderPressure.toFixed(0), unit: 'PSI',
      color: sim.state.suctionHeaderPressure > upper ? '#E8200C' :
        sim.state.suctionHeaderPressure < sim.state.suctionLowRange ? '#eab308' : '#22c55e' },
    { label: 'Target', value: `${target}`, unit: 'PSI' },
    { label: 'Upper Limit', value: `${upper}`, unit: 'PSI' },
    { label: 'Gas Temp', value: sim.state.flowMeterTemp.toFixed(0), unit: '°F',
      color: sim.state.flowMeterTemp > sim.state.maxTempAtPlate ? '#E8200C' : '#22c55e' },
    ...sim.state.compressors.map(c => ({
      label: `${c.name} RPM`, value: c.rpm.toFixed(0),
      color: c.status === 'running' ? '#22c55e' : '#E8200C',
    })),
  ]

  return (
    <DemoPage sim={sim} title="Suction Pressure Management"
      pitch="WellLogic maintains stable suction pressure — the foundation of reliable compression. The system continuously adjusts compressor speeds and staging to keep suction within the operating window, preventing both high-pressure events and low-suction shutdowns."
      triggers={triggers} metrics={metrics} />
  )
}
