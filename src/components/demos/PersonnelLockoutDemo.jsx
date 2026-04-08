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

  const triggers = [
    ...sim.state.compressors.map(c => ({
      label: `Lock Out ${c.name}`,
      description: c.personnelLockout ? `${c.name} is locked out` : `Simulate personnel on-site at ${c.name}`,
      icon: c.personnelLockout ? '🔒' : '👷',
      onClick: () => lockout(c.id, !c.personnelLockout),
      active: c.personnelLockout,
    })),
    {
      label: 'Lock Out All',
      description: 'All compressors locked — remote control disabled',
      icon: '🔒',
      onClick: () => sim.state.compressors.forEach(c => lockout(c.id, true)),
    },
    {
      label: 'Clear All Lockouts',
      description: 'Restore remote control authority',
      icon: '↩️',
      onClick: () => sim.state.compressors.forEach(c => lockout(c.id, false)),
    },
  ]

  const lockedCount = sim.state.compressors.filter(c => c.personnelLockout).length

  const metrics = [
    { label: 'Locked Out', value: `${lockedCount}/${sim.state.compressors.length}`,
      color: lockedCount > 0 ? '#eab308' : '#22c55e' },
    { label: 'Remote Control', value: lockedCount === sim.state.compressors.length ? 'DISABLED' : 'ACTIVE',
      color: lockedCount === sim.state.compressors.length ? '#E8200C' : '#22c55e' },
    ...sim.state.compressors.map(c => ({
      label: c.name, value: c.personnelLockout ? 'LOCKED' : c.status === 'running' ? 'ONLINE' : 'OFF',
      color: c.personnelLockout ? '#eab308' : c.status === 'running' ? '#22c55e' : '#888',
    })),
  ]

  return (
    <DemoPage
      sim={sim}
      title="Personnel Lockout Protection"
      pitch="When your people are on-site working on a compressor, WellLogic keeps them safe. The system instantly disables all remote commands to that unit — no surprises, no accidental starts. The compressor's flow contribution is still tracked to maintain accurate pad calculations."
      triggers={triggers}
      metrics={metrics}
    />
  )
}
