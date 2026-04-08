// Animated SVG flow line.
// flowRate: 0-1 normalized flow. Controls thickness and animation speed.
// color: stroke color (green for gas, brown for oil)

export default function FlowLine({ points, flowRate = 0, color = '#22c55e', maxWidth = 4 }) {
  if (!points || points.length < 2) return null

  const d = points.length === 2
    ? `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`
    : points.reduce((acc, pt, i) => {
        if (i === 0) return `M ${pt[0]} ${pt[1]}`
        return `${acc} L ${pt[0]} ${pt[1]}`
      }, '')

  const isFlowing = flowRate > 0.01
  const thickness = isFlowing ? 1.5 + flowRate * (maxWidth - 1.5) : 1
  const speed = isFlowing ? Math.max(0.3, 2.5 - flowRate * 2) : 0

  return (
    <path
      d={d}
      fill="none"
      stroke={isFlowing ? color : '#444'}
      strokeWidth={thickness}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={isFlowing ? 'flow-line-animated' : 'flow-line-static'}
      style={isFlowing ? { '--flow-speed': `${speed}s` } : undefined}
    />
  )
}
