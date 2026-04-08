import DemoPage from './DemoPage'

export default function WellUnloadDemo({ sim }) {
  const triggerUnload = (severity) => {
    // Force a scrubber pressure spike by manipulating state
    sim.setStateField('scrubberPressure', sim.state.suctionTarget + (severity === 'severe' ? 40 : 20))
    sim.setStateField('wellUnloadActive', true)
    // Auto-clear after a few seconds
    setTimeout(() => sim.setStateField('wellUnloadActive', false), 5000)
  }

  const triggers = [
    {
      label: 'Trigger Well Unload',
      description: 'Moderate pressure spike at scrubber',
      icon: '⚡',
      onClick: () => triggerUnload('moderate'),
      active: sim.state.wellUnloadActive && sim.state.scrubberPressure < sim.state.suctionTarget + 35,
    },
    {
      label: 'Trigger Severe Unload',
      description: 'Large pressure spike — sales valve responds',
      icon: '💥',
      onClick: () => triggerUnload('severe'),
      active: sim.state.wellUnloadActive && sim.state.scrubberPressure >= sim.state.suctionTarget + 35,
    },
    {
      label: 'Reset to Normal',
      description: 'Clear unload condition',
      icon: '↩️',
      onClick: () => {
        sim.setStateField('wellUnloadActive', false)
        sim.setStateField('scrubberPressure', sim.state.suctionTarget + 5)
      },
    },
  ]

  const metrics = [
    { label: 'Scrubber PSI', value: sim.state.scrubberPressure.toFixed(0), unit: 'PSI',
      color: sim.state.wellUnloadActive ? '#E8200C' : '#22c55e' },
    { label: 'Sales Valve', value: `${sim.state.salesValvePosition.toFixed(0)}%`,
      color: sim.state.salesValvePosition > 10 ? '#eab308' : '#22c55e' },
    { label: 'Suction Header', value: sim.state.suctionHeaderPressure.toFixed(0), unit: 'PSI' },
    { label: 'Unload Status', value: sim.state.wellUnloadActive ? 'ACTIVE' : 'NONE',
      color: sim.state.wellUnloadActive ? '#E8200C' : '#22c55e' },
  ]

  return (
    <DemoPage
      sim={sim}
      title="Well Unload Detection"
      pitch="WellLogic detects well unload events instantly — rapid pressure spikes that can shut down your entire site. The system automatically opens the sales valve to relieve pressure and keeps your compressors running safely."
      triggers={triggers}
      metrics={metrics}
    />
  )
}
