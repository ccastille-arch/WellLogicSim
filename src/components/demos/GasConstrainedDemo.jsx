import DemoPage from './DemoPage'

export default function GasConstrainedDemo({ sim }) {
  const maxGas = sim.state.maxGasCapacity
  const pct = Math.round((sim.state.totalAvailableGas / maxGas) * 100)

  const triggers = [
    { label: '100% Supply', icon: '🟢', onClick: () => sim.setTotalAvailableGas(maxGas), active: pct >= 95 },
    { label: '80% Supply', icon: '🟡', onClick: () => sim.setTotalAvailableGas(maxGas * 0.8), active: pct >= 75 && pct < 85 },
    { label: '60% Supply', icon: '🟠', onClick: () => sim.setTotalAvailableGas(maxGas * 0.6), active: pct >= 55 && pct < 65 },
    { label: '40% Supply', icon: '🔴', onClick: () => sim.setTotalAvailableGas(maxGas * 0.4), active: pct >= 35 && pct < 45 },
    { label: '30% Supply', icon: '❌', onClick: () => sim.setTotalAvailableGas(maxGas * 0.3), active: pct < 35 },
  ]

  return (
    <DemoPage
      sim={sim}
      title="Gas Constrained Operation"
      pitch="Even when gas supply drops significantly, WellLogic protects your best producers. The system progressively curtails lower-priority wells first, ensuring maximum production from the wells that matter most to your bottom line."
      triggers={triggers}
    >
      {/* Gas supply gauge */}
      <div className="text-[9px] text-[#888] uppercase tracking-wider font-bold mb-2">Gas Supply Level</div>
      <div className="bg-[#111] rounded-lg p-3 mb-3">
        <div className="text-2xl font-bold text-center" style={{
          fontFamily: "'Arial Black', Arial, sans-serif",
          color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#E8200C',
        }}>
          {pct}%
        </div>
        <div className="w-full bg-[#1a1a2a] rounded h-3 mt-2 overflow-hidden">
          <div className="h-full rounded transition-all duration-700" style={{
            width: `${pct}%`,
            backgroundColor: pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#E8200C',
          }} />
        </div>
        <div className="text-[10px] text-[#888] text-center mt-1">
          {sim.state.totalAvailableGas.toFixed(0)} / {maxGas.toFixed(0)} MCFD
        </div>
      </div>
    </DemoPage>
  )
}
