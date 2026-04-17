import DemoPage from './DemoPage'

export default function PersonnelLockoutDemo({ sim }) {
  const lockout = (id, locked) => {
    sim.setStateField('compressors', sim.state.compressors.map(c =>
      c.id === id ? {
        ...c,
        personnelLockout: locked,
        status: locked
          ? (c.status === 'running' ? 'locked_out_running' : 'locked_out_stopped')
          : (c.status.includes('running') ? 'running' : 'stopped'),
      } : c
    ))
  }

  const lockedCount = sim.state.compressors.filter(c => c.personnelLockout).length

  const triggers = [
    ...sim.state.compressors.map(c => ({
      label: c.personnelLockout ? `Unlock ${c.name}` : `Lock Out ${c.name}`,
      description: c.personnelLockout ? `Clear lockout on ${c.name}` : `Personnel on-site at ${c.name}`,
      icon: c.personnelLockout ? 'UNL' : 'LOCK',
      onClick: () => lockout(c.id, !c.personnelLockout),
      active: c.personnelLockout,
    })),
    {
      label: 'Lock Out All',
      description: 'Full crew on-site - all compressors locked',
      icon: 'ALL',
      onClick: () => sim.state.compressors.forEach(c => lockout(c.id, true)),
    },
    {
      label: 'Lock Out + Trip C1',
      description: 'Personnel lock out, then compressor trips while locked',
      icon: 'WARN',
      onClick: () => {
        lockout(0, true)
        setTimeout(() => sim.setCompressorStatus(0, 'locked_out_stopped'), 3000)
      },
    },
    {
      label: 'Lock One, Trip Another',
      description: 'C1 locked by crew, C2 trips - worst case combo',
      icon: 'DUAL',
      onClick: () => {
        lockout(0, true)
        sim.setCompressorStatus(1, 'tripped')
      },
    },
    {
      label: 'Clear All Lockouts',
      icon: 'RESET',
      onClick: () => {
        sim.state.compressors.forEach(c => lockout(c.id, false))
        sim.state.compressors.forEach(c => {
          if (c.status !== 'running') sim.setCompressorStatus(c.id, 'running')
        })
      },
    },
  ]

  const metrics = [
    {
      label: 'Locked Out',
      value: `${lockedCount}/${sim.state.compressors.length}`,
      color: lockedCount > 0 ? '#eab308' : '#22c55e',
    },
    {
      label: 'Remote Control',
      value: lockedCount === sim.state.compressors.length ? 'DISABLED' : 'ACTIVE',
      color: lockedCount === sim.state.compressors.length ? '#D32028' : '#22c55e',
    },
    ...sim.state.compressors.map(c => ({
      label: c.name,
      value: c.personnelLockout ? (c.status.includes('running') ? 'LOCKED-RUN' : 'LOCKED-OFF') : c.status === 'running' ? 'ONLINE' : 'OFF',
      color: c.personnelLockout ? '#eab308' : c.status === 'running' ? '#22c55e' : '#888',
    })),
  ]

  return (
    <DemoPage
      sim={sim}
      title="Personnel Lockout Protection"
      pitch="When your people are on-site working on a compressor, Well Logic keeps them safe. The system instantly disables all remote commands to that unit - no accidental starts. Flow contribution is still tracked for accurate pad calculations."
      triggers={triggers}
      metrics={metrics}
    />
  )
}
