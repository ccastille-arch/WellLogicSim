const STATUS_COLORS = {
  running: '#22c55e',
  tripped: '#E8200C',
  offline: '#888888',
}

export default function CompressorNode({ compressor, x, y, width = 100, height = 70 }) {
  const { name, status, rpm, suctionPsi, dischargePsi, loadPct } = compressor
  const statusColor = STATUS_COLORS[status]
  const isRunning = status === 'running'

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Box */}
      <rect
        x={0} y={0}
        width={width} height={height}
        rx={4}
        fill="#2a2a2a"
        stroke={statusColor}
        strokeWidth={isRunning ? 1.5 : 1}
      />
      {/* Status indicator */}
      <circle cx={12} cy={12} r={4} fill={statusColor} />
      {/* Name */}
      <text x={22} y={15} fill="white" fontSize={12} fontWeight="bold" fontFamily="Arial Black, Arial">{name}</text>
      {/* Status label */}
      <text x={width - 6} y={15} fill={statusColor} fontSize={8} fontFamily="Arial" textAnchor="end">
        {status.toUpperCase()}
      </text>

      {isRunning ? (
        <>
          {/* Telemetry */}
          <text x={6} y={32} fill="#aaa" fontSize={8} fontFamily="Arial">RPM</text>
          <text x={width - 6} y={32} fill="white" fontSize={9} fontFamily="Arial" textAnchor="end" fontWeight="bold">
            {rpm.toFixed(0)}
          </text>

          <text x={6} y={43} fill="#aaa" fontSize={8} fontFamily="Arial">Suction</text>
          <text x={width - 6} y={43} fill="white" fontSize={9} fontFamily="Arial" textAnchor="end" fontWeight="bold">
            {suctionPsi.toFixed(0)} PSI
          </text>

          <text x={6} y={54} fill="#aaa" fontSize={8} fontFamily="Arial">Discharge</text>
          <text x={width - 6} y={54} fill="white" fontSize={9} fontFamily="Arial" textAnchor="end" fontWeight="bold">
            {dischargePsi.toFixed(0)} PSI
          </text>

          {/* Load bar */}
          <rect x={6} y={59} width={width - 12} height={5} rx={2} fill="#1a1a1a" />
          <rect x={6} y={59}
            width={Math.max(0, (width - 12) * (loadPct / 100))}
            height={5} rx={2}
            fill={loadPct > 90 ? '#E8200C' : loadPct > 70 ? '#eab308' : '#22c55e'}
          />
          <text x={width / 2} y={66} fill="white" fontSize={7} fontFamily="Arial" textAnchor="middle" dominantBaseline="hanging">
            {loadPct.toFixed(0)}%
          </text>
        </>
      ) : (
        <text x={width / 2} y={45} fill={statusColor} fontSize={10} fontFamily="Arial" textAnchor="middle" opacity={0.7}>
          {status === 'tripped' ? 'FAULT' : 'MAINT'}
        </text>
      )}
    </g>
  )
}
