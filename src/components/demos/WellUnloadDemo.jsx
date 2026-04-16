import DemoPage from './DemoPage'

export default function WellUnloadDemo({ sim }) {
  const triggerUnload = (severity) => {
    const spike = severity === 'severe' ? 45 : severity === 'moderate' ? 20 : 10
    sim.setStateField('scrubberPressure', sim.state.suctionTarget + spike)
    sim.setStateField('wellUnloadActive', true)
    setTimeout(() => sim.setStateField('wellUnloadActive', false), severity === 'severe' ? 8000 : 5000)
  }

  const triggers = [
    {
      label: 'Minor Well Slug',
      description: 'Small liquid slug hits scrubber - slight pressure bump',
      icon: 'MIN',
      onClick: () => triggerUnload('minor'),
    },
    {
      label: 'Moderate Well Unload',
      description: 'Gas breakthrough - typical unload event',
      icon: 'MOD',
      onClick: () => triggerUnload('moderate'),
      active: sim.state.wellUnloadActive && sim.state.scrubberPressure < sim.state.suctionTarget + 35,
    },
    {
      label: 'Severe Well Unload',
      description: 'Massive gas slug - sales valve fully opens to protect system',
      icon: 'SEV',
      onClick: () => triggerUnload('severe'),
      active: sim.state.wellUnloadActive && sim.state.scrubberPressure >= sim.state.suctionTarget + 35,
    },
    {
      label: 'Repeated Slugging',
      description: 'Multiple unloads every 8 seconds - problematic well',
      icon: 'LOOP',
      onClick: () => {
        let count = 0
        const interval = setInterval(() => {
          triggerUnload(count % 3 === 2 ? 'severe' : 'moderate')
          count++
          if (count >= 5) clearInterval(interval)
        }, 8000)
        triggerUnload('moderate')
      },
    },
    {
      label: 'Sales Line Backed Up',
      description: 'Sales line pressure rises - valve cannot relieve enough',
      icon: 'BACK',
      onClick: () => {
        sim.setStateField('scrubberPressure', sim.state.suctionTarget + 35)
        sim.setStateField('wellUnloadActive', true)
        sim.setStateField('salesValvePosition', 100)
        sim.setStateField('suctionHeaderPressure', sim.state.suctionTarget + sim.state.suctionHighRange + 5)
      },
    },
    {
      label: 'Well Loaded Up (Liquid)',
      description: 'Well stops flowing gas - fills with liquid. Flow drops to zero.',
      icon: 'LOAD',
      onClick: () => {
        const lastWell = [...sim.state.wells].sort((a, b) => b.priority - a.priority)[0]
        if (lastWell) sim.setWellDesiredRate(lastWell.id, 0)
      },
    },
    {
      label: 'Well Kicks Back On',
      description: 'Loaded well unloads and comes back - sudden gas burst',
      icon: 'KICK',
      onClick: () => {
        const offWell = sim.state.wells.find(w => w.desiredRate === 0)
        if (offWell) {
          sim.setWellDesiredRate(offWell.id, 150)
          triggerUnload('severe')
        }
      },
    },
    {
      label: 'Reset to Normal',
      icon: 'RESET',
      onClick: () => {
        sim.setStateField('wellUnloadActive', false)
        sim.setStateField('scrubberPressure', sim.state.suctionTarget + 5)
        sim.setStateField('salesValvePosition', 0)
        sim.state.wells.forEach(w => { if (w.desiredRate === 0) sim.setWellDesiredRate(w.id, 150) })
      },
    },
  ]

  const metrics = [
    {
      label: 'Scrubber PSI',
      value: sim.state.scrubberPressure.toFixed(0),
      unit: 'PSI',
      color: sim.state.wellUnloadActive ? '#E8200C' : '#22c55e',
    },
    {
      label: 'Rate of Change',
      value: `${sim.state.scrubberRateOfChange.toFixed(1)}`,
      unit: 'PSI/s',
      color: Math.abs(sim.state.scrubberRateOfChange) > 3 ? '#E8200C' : '#22c55e',
    },
    {
      label: 'Sales Valve',
      value: `${sim.state.salesValvePosition.toFixed(0)}%`,
      color: sim.state.salesValvePosition > 10 ? '#eab308' : '#22c55e',
    },
    { label: 'Suction Header', value: sim.state.suctionHeaderPressure.toFixed(0), unit: 'PSI' },
    {
      label: 'Unload Status',
      value: sim.state.wellUnloadActive ? 'ACTIVE' : 'CLEAR',
      color: sim.state.wellUnloadActive ? '#E8200C' : '#22c55e',
    },
  ]

  return (
    <DemoPage
      sim={sim}
      title="Well Unload & Slugging Events"
      pitch="Pad Logic detects well unloads and liquid slugs instantly - rapid pressure spikes that can shut down your entire site. The system automatically relieves pressure through the sales valve and keeps compressors running safely."
      triggers={triggers}
      metrics={metrics}
    />
  )
}
