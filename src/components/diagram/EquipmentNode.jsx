// Generic labeled equipment box (scrubber, header, gas source, tank, etc.)
export default function EquipmentNode({ x, y, width = 110, height = 36, label, sublabel, color = '#3b82f6', icon }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={0} y={0}
        width={width} height={height}
        rx={4}
        fill="#2a2a2a"
        stroke={color}
        strokeWidth={1}
        strokeDasharray={icon === 'dashed' ? '4 2' : 'none'}
      />
      <text
        x={width / 2} y={sublabel ? height / 2 - 2 : height / 2 + 1}
        fill="white" fontSize={9} fontWeight="bold" fontFamily="Arial Black, Arial"
        textAnchor="middle" dominantBaseline="middle"
      >
        {label}
      </text>
      {sublabel && (
        <text
          x={width / 2} y={height / 2 + 10}
          fill="#888" fontSize={7} fontFamily="Arial"
          textAnchor="middle" dominantBaseline="middle"
        >
          {sublabel}
        </text>
      )}
    </g>
  )
}
