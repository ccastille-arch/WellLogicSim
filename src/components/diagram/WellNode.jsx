export default function WellNode({ well, x, y, width = 80, height = 60 }) {
  const { name, actualRate, desiredRate, productionBoe, isAtTarget, isHunting, chokePosition } = well
  const accuracy = desiredRate > 0 ? (actualRate / desiredRate) : 1
  const borderColor = isAtTarget ? '#22c55e' : accuracy > 0.5 ? '#eab308' : '#E8200C'

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Well box */}
      <rect
        x={0} y={0}
        width={width} height={height}
        rx={4}
        fill="#2a2a2a"
        stroke={borderColor}
        strokeWidth={1.5}
      />
      {/* Name + hunting indicator */}
      <text x={6} y={14} fill="white" fontSize={11} fontWeight="bold" fontFamily="Arial Black, Arial">
        {name}
      </text>
      {isHunting && (
        <text x={width - 6} y={14} fill="#f97316" fontSize={8} fontFamily="Arial" textAnchor="end" className="hunt-indicator">
          HUNT
        </text>
      )}

      {/* Injection rate */}
      <text x={6} y={28} fill="#aaa" fontSize={8} fontFamily="Arial">Injection</text>
      <text x={width - 6} y={28} fill="white" fontSize={9} fontFamily="Arial" textAnchor="end" fontWeight="bold">
        {actualRate.toFixed(0)} MCFD
      </text>

      {/* Production */}
      <text x={6} y={40} fill="#aaa" fontSize={8} fontFamily="Arial">Production</text>
      <text x={width - 6} y={40} fill="white" fontSize={9} fontFamily="Arial" textAnchor="end" fontWeight="bold">
        {productionBoe.toFixed(0)} BOE/d
      </text>

      {/* Choke bar */}
      <rect x={6} y={47} width={width - 12} height={4} rx={2} fill="#1a1a1a" />
      <rect x={6} y={47}
        width={Math.max(0, (width - 12) * (chokePosition / 100))}
        height={4} rx={2}
        fill={borderColor}
      />
      <text x={width / 2} y={57} fill="#888" fontSize={7} fontFamily="Arial" textAnchor="middle">
        {chokePosition.toFixed(0)}% open
      </text>
    </g>
  )
}
