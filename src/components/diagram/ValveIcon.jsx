// Small valve icon — two triangles forming a bowtie shape
export default function ValveIcon({ x, y, openPct = 100, label, size = 12 }) {
  const color = openPct > 80 ? '#22c55e' : openPct > 30 ? '#eab308' : '#D32028'
  const s = size / 2

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Left triangle */}
      <polygon
        points={`${-s},${-s} ${0},${0} ${-s},${s}`}
        fill={color}
        opacity={0.8}
      />
      {/* Right triangle */}
      <polygon
        points={`${s},${-s} ${0},${0} ${s},${s}`}
        fill={color}
        opacity={0.8}
      />
      {/* Center restriction line */}
      <line x1={0} y1={-s} x2={0} y2={s} stroke={color} strokeWidth={1.5} />
      {label && (
        <text x={0} y={s + 10} fill="#888" fontSize={7} fontFamily="Arial" textAnchor="middle">{label}</text>
      )}
    </g>
  )
}
