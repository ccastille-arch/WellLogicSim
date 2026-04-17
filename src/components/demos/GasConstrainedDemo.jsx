import DemoPage from './DemoPage'

export default function GasConstrainedDemo({ sim }) {
  const maxGas = sim.state.maxGasCapacity
  const pct = Math.round((sim.state.totalAvailableGas / maxGas) * 100)

  const triggers = [
    { label: '100% Supply', description: 'Full gas available - normal ops', icon: '100', onClick: () => sim.setTotalAvailableGas(maxGas), active: pct >= 95 },
    { label: '80% - Slight Decline', description: 'Gas source slightly declining', icon: '80', onClick: () => sim.setTotalAvailableGas(maxGas * 0.8) },
    { label: '60% - Well Decline', description: 'Formation gas declining - common in Permian', icon: '60', onClick: () => sim.setTotalAvailableGas(maxGas * 0.6) },
    { label: '40% - Severe Constraint', description: 'Major gas loss - pipeline restriction or well issue', icon: '40', onClick: () => sim.setTotalAvailableGas(maxGas * 0.4) },
    { label: '20% - Emergency', description: 'Near total gas loss - only top well gets injection', icon: '20', onClick: () => sim.setTotalAvailableGas(maxGas * 0.2) },
    {
      label: 'Gradual Decline',
      description: 'Gas drops 10% every 5 seconds - realistic depletion',
      icon: 'DOWN',
      onClick: () => {
        let current = sim.state.totalAvailableGas
        const interval = setInterval(() => {
          current = Math.max(maxGas * 0.2, current - maxGas * 0.1)
          sim.setTotalAvailableGas(current)
          if (current <= maxGas * 0.2) clearInterval(interval)
        }, 5000)
      },
    },
    {
      label: 'Gradual Recovery',
      description: 'Gas recovers 10% every 5 seconds',
      icon: 'UP',
      onClick: () => {
        let current = sim.state.totalAvailableGas
        const interval = setInterval(() => {
          current = Math.min(maxGas, current + maxGas * 0.1)
          sim.setTotalAvailableGas(current)
          if (current >= maxGas) clearInterval(interval)
        }, 5000)
      },
    },
    { label: 'Restore Full Supply', icon: 'RESET', onClick: () => sim.setTotalAvailableGas(maxGas) },
  ]

  return (
    <DemoPage
      sim={sim}
      title="Gas Constrained Operation"
      pitch="Even when gas supply drops significantly, Pad Logic protects your best producers. The system progressively curtails lower-priority wells first, ensuring maximum production from the wells that matter most to your bottom line."
      triggers={triggers}
    >
      <div className="text-[8px] text-[#888] uppercase tracking-wider font-bold mb-2">Gas Supply</div>
      <div className="bg-[#111] rounded p-3">
        <div
          className="text-2xl font-bold text-center"
          style={{
            fontFamily: "'Montserrat', Arial, sans-serif",
            color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#D32028',
          }}
        >
          {pct}%
        </div>
        <div className="w-full bg-[#293C5B] rounded h-3 mt-2 overflow-hidden">
          <div
            className="h-full rounded transition-all duration-700"
            style={{
              width: `${pct}%`,
              backgroundColor: pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#D32028',
            }}
          />
        </div>
        <div className="text-[9px] text-[#888] text-center mt-1">
          {sim.state.totalAvailableGas.toFixed(0)} / {maxGas.toFixed(0)} MCFD
        </div>
      </div>
    </DemoPage>
  )
}
