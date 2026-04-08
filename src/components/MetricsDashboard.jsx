export default function MetricsDashboard({ metrics, running, onToggleRunning }) {
  const {
    totalActualMcfd,
    totalDesiredMcfd,
    injectionAccuracy,
    totalProductionBoe,
    compressorsOnline,
    compressorsTotal,
    wellsAtTarget,
    wellsTotal,
  } = metrics

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-sc-dark border-b border-sc-charcoal-light shrink-0 overflow-x-auto" data-tutorial="metrics-bar">
      <MetricCard
        label="Injection Rate"
        value={`${totalActualMcfd.toFixed(0)}`}
        unit="MCFD"
        sub={`of ${totalDesiredMcfd.toFixed(0)} desired`}
      />
      <MetricCard
        label="Injection Accuracy"
        value={`${injectionAccuracy.toFixed(1)}`}
        unit="%"
        color={injectionAccuracy >= 95 ? '#22c55e' : injectionAccuracy >= 80 ? '#eab308' : '#E8200C'}
      />
      <MetricCard
        label="Site Production"
        value={`${totalProductionBoe.toFixed(0)}`}
        unit="BOE/day"
      />
      <MetricCard
        label="Compressors"
        value={`${compressorsOnline}/${compressorsTotal}`}
        unit="online"
        color={compressorsOnline === compressorsTotal ? '#22c55e' : '#eab308'}
      />
      <MetricCard
        label="Wells at Target"
        value={`${wellsAtTarget}/${wellsTotal}`}
        unit=""
        color={wellsAtTarget === wellsTotal ? '#22c55e' : wellsAtTarget >= wellsTotal * 0.5 ? '#eab308' : '#E8200C'}
      />
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onToggleRunning}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors ${
            running
              ? 'border-sc-green/50 text-sc-green hover:bg-sc-green/10'
              : 'border-sc-yellow/50 text-sc-yellow hover:bg-sc-yellow/10'
          }`}
        >
          {running ? '● LIVE' : '■ PAUSED'}
        </button>
      </div>
    </div>
  )
}

function MetricCard({ label, value, unit, sub, color }) {
  return (
    <div className="bg-sc-charcoal rounded px-3 py-1.5 min-w-[120px] shrink-0">
      <div className="text-[10px] text-sc-gray uppercase tracking-wider font-bold mb-0.5">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold" style={{ color: color || '#ffffff', fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {value}
        </span>
        {unit && <span className="text-[10px] text-sc-gray">{unit}</span>}
      </div>
      {sub && <div className="text-[10px] text-sc-gray">{sub}</div>}
    </div>
  )
}
