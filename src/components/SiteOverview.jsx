import { useMemo } from 'react'

// Site Overview — live P&ID-style process flow diagram
// Shows full pad topology with animated flows and alarm highlighting
// Layout: Wells (top) → Production Header → HP Scrubber → Oil/Water/Gas lines
//         Gas → Sales + Recirc → Suction Header → Compressors → Discharge Header → Wells

export default function SiteOverview({ state, config }) {
  const { compressors, wells, suctionHeaderPressure, scrubberPressure, salesValvePosition, alarms, wellUnloadActive } = state
  const nc = compressors.length
  const nw = wells.length

  // Dynamic layout calculations
  const layout = useMemo(() => computeLayout(nc, nw), [nc, nw])

  const hasAlarm = alarms && alarms.length > 0
  const scrubberLevel = 35 + Math.sin(state.tickCount * 0.05) * 10 // simulated 25-45%
  const scrubberLevelColor = scrubberLevel > 60 ? '#E8200C' : scrubberLevel > 40 ? '#eab308' : '#22c55e'

  return (
    <div className="flex-1 overflow-hidden bg-[#0d0d12] p-2">
      <svg
        viewBox={`0 0 ${layout.W} ${layout.H}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <defs>
          {/* Grid pattern */}
          <pattern id="ov-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#151520" strokeWidth="0.5" />
          </pattern>
          {/* Flow animation */}
          <marker id="arrow-green" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#22c55e" opacity="0.7" />
          </marker>
          <marker id="arrow-brown" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#8B6914" opacity="0.7" />
          </marker>
          <marker id="arrow-blue" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#3b82f6" opacity="0.7" />
          </marker>
        </defs>
        <rect width={layout.W} height={layout.H} fill="url(#ov-grid)" />

        {/* Title */}
        <text x={layout.W / 2} y={18} textAnchor="middle" fill="#555" fontSize={10} fontWeight="bold" letterSpacing="2">
          SITE OVERVIEW — PAD OPTIMIZATION
        </text>

        {/* ====================== DISCHARGE HEADER (top) ====================== */}
        <HeaderPipe
          x1={layout.dischHdrX1} y={layout.dischHdrY} x2={layout.dischHdrX2}
          label="DISCHARGE HEADER" color="#22c55e" flowRate={0.7}
        />

        {/* ====================== WELLS (top row) ====================== */}
        {wells.map((w, i) => {
          const wx = layout.wellX(i)
          const isAlarmed = !w.isAtTarget && w.desiredRate > 0
          return (
            <g key={`well-${w.id}`}>
              {/* Injection line from discharge header down to well */}
              <FlowPipe
                points={[[wx + 40, layout.dischHdrY], [wx + 40, layout.chokeY - 20]]}
                flowRate={w.actualRate / (w.desiredRate || 1)}
                color="#22c55e"
              />

              {/* Choke valve */}
              <ChokeValve
                x={wx + 40} y={layout.chokeY}
                openPct={w.chokeAO}
                label={`CHK ${i + 1}`}
                alarmed={isAlarmed}
              />

              {/* Flow meter */}
              <FlowMeter
                x={wx + 40} y={layout.flowMeterY}
                value={w.actualRate}
                label={`FM ${i + 1}`}
              />

              {/* Injection line from flow meter to well */}
              <FlowPipe
                points={[[wx + 40, layout.flowMeterY + 12], [wx + 40, layout.wellY]]}
                flowRate={w.actualRate / (w.desiredRate || 1)}
                color="#22c55e"
              />

              {/* Well */}
              <WellSymbol
                x={wx} y={layout.wellY}
                well={w}
                alarmed={isAlarmed}
                priority={w.priority + 1}
              />

              {/* Production line from well down to production header */}
              <FlowPipe
                points={[[wx + 40, layout.wellY + 55], [wx + 40, layout.prodHdrY]]}
                flowRate={w.productionBoe > 0 ? 0.6 : 0}
                color="#8B6914"
              />
            </g>
          )
        })}

        {/* ====================== PRODUCTION HEADER ====================== */}
        <HeaderPipe
          x1={layout.prodHdrX1} y={layout.prodHdrY} x2={layout.prodHdrX2}
          label="PRODUCTION HEADER" color="#8B6914" flowRate={0.6}
        />

        {/* Production header to scrubber */}
        <FlowPipe
          points={[[layout.W / 2, layout.prodHdrY], [layout.W / 2, layout.scrubberY]]}
          flowRate={0.6} color="#8B6914"
        />

        {/* ====================== HP SCRUBBER / SEPARATOR ====================== */}
        <ScrubberSymbol
          x={layout.W / 2 - 50} y={layout.scrubberY}
          pressure={scrubberPressure}
          level={scrubberLevel}
          levelColor={scrubberLevelColor}
          alarmed={wellUnloadActive}
        />

        {/* ====================== OUTPUT LINES FROM SCRUBBER ====================== */}

        {/* Water line — exits left off screen */}
        <FlowPipe
          points={[[layout.W / 2 - 50, layout.scrubberY + 30], [layout.W / 2 - 120, layout.scrubberY + 30], [layout.W / 2 - 120, layout.scrubberY + 60]]}
          flowRate={0.3} color="#3b82f6"
        />
        <text x={layout.W / 2 - 120} y={layout.scrubberY + 72} textAnchor="middle" fill="#3b82f6" fontSize={7} fontWeight="bold">
          PRODUCED WATER
        </text>
        <text x={layout.W / 2 - 120} y={layout.scrubberY + 80} textAnchor="middle" fill="#555" fontSize={6}>→ OFF-SITE</text>

        {/* Oil line — exits left-center off screen */}
        <FlowPipe
          points={[[layout.W / 2 - 50, layout.scrubberY + 42], [layout.W / 2 - 70, layout.scrubberY + 42], [layout.W / 2 - 70, layout.scrubberY + 60]]}
          flowRate={0.4} color="#8B6914"
        />
        <text x={layout.W / 2 - 70} y={layout.scrubberY + 72} textAnchor="middle" fill="#8B6914" fontSize={7} fontWeight="bold">
          OIL
        </text>
        <text x={layout.W / 2 - 70} y={layout.scrubberY + 80} textAnchor="middle" fill="#555" fontSize={6}>→ TANK BATTERY</text>

        {/* Gas line — exits right side to sales + recirc */}
        <FlowPipe
          points={[[layout.W / 2 + 50, layout.scrubberY + 20], [layout.gasJunctionX, layout.scrubberY + 20], [layout.gasJunctionX, layout.gasLineY]]}
          flowRate={0.7} color="#22c55e"
        />
        <text x={layout.gasJunctionX + 4} y={layout.scrubberY + 18} fill="#22c55e" fontSize={7} fontWeight="bold">GAS</text>

        {/* Gas junction splits: Sales line (right) and Recirc/Buyback (down to suction) */}
        {/* Sales line */}
        <FlowPipe
          points={[[layout.gasJunctionX, layout.gasLineY], [layout.salesX, layout.gasLineY]]}
          flowRate={salesValvePosition / 100} color="#22c55e"
        />
        <SalesValve
          x={layout.salesX - 40} y={layout.gasLineY}
          openPct={salesValvePosition}
        />
        <rect x={layout.salesX + 5} y={layout.gasLineY - 14} width={70} height={28} rx={4} fill="#1a2a1a" stroke="#22c55e" strokeWidth={1} />
        <text x={layout.salesX + 40} y={layout.gasLineY - 2} textAnchor="middle" fill="#22c55e" fontSize={8} fontWeight="bold">SALES LINE</text>
        <text x={layout.salesX + 40} y={layout.gasLineY + 9} textAnchor="middle" fill="#888" fontSize={6}>→ PIPELINE</text>

        {/* Recirc / Buyback line — goes down to suction header */}
        <FlowPipe
          points={[[layout.gasJunctionX, layout.gasLineY], [layout.gasJunctionX, layout.gasLineY + 15], [layout.suctionHdrCX, layout.gasLineY + 15], [layout.suctionHdrCX, layout.suctionHdrY]]}
          flowRate={0.6} color="#22c55e"
        />
        <text x={(layout.gasJunctionX + layout.suctionHdrCX) / 2} y={layout.gasLineY + 12} textAnchor="middle" fill="#22c55e" fontSize={7} fontWeight="bold">
          RECIRC / BUYBACK
        </text>

        {/* ====================== SUCTION HEADER ====================== */}
        <HeaderPipe
          x1={layout.suctionHdrX1} y={layout.suctionHdrY} x2={layout.suctionHdrX2}
          label="SUCTION HEADER" color="#f97316" flowRate={0.6}
        />
        {/* Suction header PSI */}
        <text x={layout.suctionHdrX1 - 2} y={layout.suctionHdrY - 4} textAnchor="end" fill="#f97316" fontSize={8} fontWeight="bold">
          {suctionHeaderPressure.toFixed(0)} PSI
        </text>

        {/* ====================== COMPRESSORS ====================== */}
        {compressors.map((c, i) => {
          const cx = layout.compX(i)
          const isRunning = c.status === 'running' || c.status === 'locked_out_running'
          const isAlarmed = c.status === 'tripped' || c.personnelLockout
          const isStopped = c.status === 'stopped' || c.status === 'locked_out_stopped'

          return (
            <g key={`comp-${c.id}`}>
              {/* Suction header to witch's hat */}
              <FlowPipe
                points={[[cx + 35, layout.suctionHdrY], [cx + 35, layout.witchHatY - 8]]}
                flowRate={isRunning ? c.loadPct / 100 : 0}
                color="#f97316"
              />

              {/* Witch's hat (strainer) */}
              <WitchHat x={cx + 35} y={layout.witchHatY} />

              {/* Suction control valve */}
              <ChokeValve
                x={cx + 35} y={layout.suctionValveY}
                openPct={isRunning ? c.loadPct : 0}
                label={`SCV ${i + 1}`}
                alarmed={isAlarmed}
              />

              {/* Pipe from valve to compressor */}
              <FlowPipe
                points={[[cx + 35, layout.suctionValveY + 10], [cx + 35, layout.compY]]}
                flowRate={isRunning ? c.loadPct / 100 : 0}
                color="#f97316"
              />

              {/* Compressor */}
              <CompressorSymbol
                x={cx} y={layout.compY}
                comp={c}
                alarmed={isAlarmed}
                stopped={isStopped}
              />

              {/* Discharge from compressor up to discharge header */}
              <FlowPipe
                points={[[cx + 35, layout.compY - 2], [cx + 35, layout.dischHdrY]]}
                flowRate={isRunning ? c.loadPct / 100 : 0}
                color="#22c55e"
              />
            </g>
          )
        })}

        {/* ====================== LEGEND ====================== */}
        <g transform={`translate(${layout.W - 150}, ${layout.H - 55})`}>
          <rect x={0} y={0} width={140} height={50} rx={4} fill="#111118" stroke="#333" strokeWidth={0.5} />
          <text x={70} y={12} textAnchor="middle" fill="#666" fontSize={7} fontWeight="bold">LEGEND</text>
          <line x1={8} y1={22} x2={30} y2={22} stroke="#22c55e" strokeWidth={2} />
          <text x={35} y={25} fill="#888" fontSize={6}>Gas / Injection</text>
          <line x1={8} y1={32} x2={30} y2={32} stroke="#8B6914" strokeWidth={2} />
          <text x={35} y={35} fill="#888" fontSize={6}>Oil / Production</text>
          <line x1={8} y1={42} x2={30} y2={42} stroke="#E8200C" strokeWidth={2} />
          <text x={35} y={45} fill="#888" fontSize={6}>Alarm / Shutdown</text>
        </g>
      </svg>
    </div>
  )
}

// ============================================================================
// Layout calculator
// ============================================================================
function computeLayout(nc, nw) {
  const W = 1100
  const H = 700
  const margin = 40

  // Vertical positions (top to bottom)
  const dischHdrY = 50
  const chokeY = 85
  const flowMeterY = 115
  const wellY = 145
  const prodHdrY = 220
  const scrubberY = 255
  const gasLineY = 340
  const suctionHdrY = 390
  const witchHatY = 420
  const suctionValveY = 445
  const compY = 490

  // Well horizontal positions
  const wellW = 80
  const wellSpacing = Math.min(110, (W - margin * 2 - wellW) / Math.max(nw - 1, 1))
  const wellStartX = (W - (nw - 1) * wellSpacing - wellW) / 2
  const wellX = (i) => wellStartX + i * wellSpacing

  // Compressor horizontal positions
  const compW = 70
  const compSpacing = Math.min(130, (W - margin * 2 - compW) / Math.max(nc - 1, 1))
  const compStartX = (W - (nc - 1) * compSpacing - compW) / 2
  const compX = (i) => compStartX + i * compSpacing

  // Headers span
  const dischHdrX1 = Math.min(wellX(0) + 40, compX(0) + 35) - 20
  const dischHdrX2 = Math.max(wellX(nw - 1) + 40, compX(nc - 1) + 35) + 20
  const prodHdrX1 = wellX(0) + 20
  const prodHdrX2 = wellX(nw - 1) + 60
  const suctionHdrX1 = compX(0) + 15
  const suctionHdrX2 = compX(nc - 1) + 55
  const suctionHdrCX = (suctionHdrX1 + suctionHdrX2) / 2

  // Gas system positions
  const gasJunctionX = W / 2 + 80
  const salesX = W - 140

  return {
    W, H, margin,
    dischHdrY, chokeY, flowMeterY, wellY, prodHdrY,
    scrubberY, gasLineY, suctionHdrY, witchHatY, suctionValveY, compY,
    wellX, compX,
    dischHdrX1, dischHdrX2, prodHdrX1, prodHdrX2,
    suctionHdrX1, suctionHdrX2, suctionHdrCX,
    gasJunctionX, salesX,
  }
}

// ============================================================================
// Reusable SVG components
// ============================================================================

function HeaderPipe({ x1, y, x2, label, color, flowRate }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={4} opacity={0.5} />
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={2}
        strokeDasharray="6 4" className="flow-line-animated" style={{ '--flow-speed': '2s' }} />
      <text x={x1 - 4} y={y - 6} textAnchor="end" fill={color} fontSize={7} fontWeight="bold" opacity={0.7}>
        {label}
      </text>
    </g>
  )
}

function FlowPipe({ points, flowRate, color }) {
  if (!points || points.length < 2) return null
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const isFlowing = flowRate > 0.01
  const thickness = isFlowing ? 1 + flowRate * 2 : 0.8
  const speed = isFlowing ? Math.max(0.5, 3 - flowRate * 2.5) : 0

  return (
    <path
      d={d} fill="none"
      stroke={isFlowing ? color : '#333'}
      strokeWidth={thickness}
      strokeLinecap="round" strokeLinejoin="round"
      className={isFlowing ? 'flow-line-animated' : 'flow-line-static'}
      style={isFlowing ? { '--flow-speed': `${speed}s` } : undefined}
    />
  )
}

function WellSymbol({ x, y, well, alarmed, priority }) {
  const borderColor = alarmed ? '#E8200C' : '#22c55e'
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Well name + priority above */}
      <text x={40} y={-8} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">{well.name}</text>
      <text x={40} y={-1} textAnchor="middle" fill="#888" fontSize={6}>P{priority}</text>
      {/* Well casing symbol */}
      <rect x={10} y={0} width={60} height={50} rx={3} fill="#1a1a22"
        stroke={borderColor} strokeWidth={alarmed ? 2 : 1} />
      {alarmed && <rect x={10} y={0} width={60} height={50} rx={3} fill="#E8200C" opacity={0.1} />}
      {/* Well icon */}
      <path d="M 30 8 L 30 20 L 25 25 L 35 30 L 25 35 L 35 40 L 30 42 L 30 46" stroke="#888" strokeWidth={1.5} fill="none" />
      <path d="M 50 8 L 50 20 L 45 25 L 55 30 L 45 35 L 55 40 L 50 42 L 50 46" stroke="#888" strokeWidth={1.5} fill="none" />
      {/* Production rate */}
      <text x={40} y={54} textAnchor="middle" fill={borderColor} fontSize={7} fontWeight="bold">
        {well.actualRate.toFixed(0)} MCFD
      </text>
    </g>
  )
}

function ChokeValve({ x, y, openPct, label, alarmed }) {
  const color = alarmed ? '#E8200C' : openPct > 80 ? '#22c55e' : openPct > 30 ? '#eab308' : '#E8200C'
  const s = 6
  return (
    <g transform={`translate(${x}, ${y})`}>
      <polygon points={`${-s},${-s} 0,0 ${-s},${s}`} fill={color} opacity={0.8} />
      <polygon points={`${s},${-s} 0,0 ${s},${s}`} fill={color} opacity={0.8} />
      <line x1={0} y1={-s} x2={0} y2={s} stroke={color} strokeWidth={1.5} />
      <text x={10} y={3} fill="#888" fontSize={6}>{label}</text>
      <text x={10} y={10} fill={color} fontSize={6} fontWeight="bold">{openPct.toFixed(0)}%</text>
    </g>
  )
}

function FlowMeter({ x, y, value, label }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx={0} cy={0} r={8} fill="#1a1a22" stroke="#3b82f6" strokeWidth={1} />
      <text x={0} y={1} textAnchor="middle" fill="#3b82f6" fontSize={5} fontWeight="bold" dominantBaseline="middle">FM</text>
      <text x={12} y={3} fill="#888" fontSize={6}>{value.toFixed(0)}</text>
    </g>
  )
}

function WitchHat({ x, y }) {
  // Strainer / witch's hat symbol — triangle with mesh lines
  return (
    <g transform={`translate(${x}, ${y})`}>
      <polygon points="-6,6 0,-6 6,6" fill="none" stroke="#f97316" strokeWidth={1} />
      <line x1={-3} y1={3} x2={3} y2={3} stroke="#f97316" strokeWidth={0.5} />
      <line x1={-1.5} y1={0} x2={1.5} y2={0} stroke="#f97316" strokeWidth={0.5} />
    </g>
  )
}

function SalesValve({ x, y, openPct }) {
  const color = openPct > 10 ? '#eab308' : '#22c55e'
  return (
    <g transform={`translate(${x}, ${y})`}>
      <polygon points="-5,-5 0,0 -5,5" fill={color} opacity={0.8} />
      <polygon points="5,-5 0,0 5,5" fill={color} opacity={0.8} />
      <line x1={0} y1={-5} x2={0} y2={5} stroke={color} strokeWidth={1.5} />
      <text x={0} y={-8} textAnchor="middle" fill="#888" fontSize={6}>SALES VLV</text>
      <text x={0} y={12} textAnchor="middle" fill={color} fontSize={6} fontWeight="bold">{openPct.toFixed(0)}%</text>
    </g>
  )
}

function ScrubberSymbol({ x, y, pressure, level, levelColor, alarmed }) {
  const w = 100
  const h = 60
  const borderColor = alarmed ? '#E8200C' : '#888'
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Vessel */}
      <rect x={0} y={0} width={w} height={h} rx={6} fill="#1a1a22"
        stroke={borderColor} strokeWidth={alarmed ? 2 : 1.5} />
      {alarmed && <rect x={0} y={0} width={w} height={h} rx={6} fill="#E8200C" opacity={0.15} />}
      {/* Liquid level fill */}
      <rect x={2} y={h - (h * level / 100)} width={w - 4} height={h * level / 100 - 2} rx={4}
        fill={levelColor} opacity={0.25} />
      {/* Label */}
      <text x={w / 2} y={14} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">HP SCRUBBER</text>
      <text x={w / 2} y={24} textAnchor="middle" fill="white" fontSize={7}>SEPARATOR</text>
      {/* Pressure reading */}
      <text x={w / 2} y={38} textAnchor="middle" fill="#f97316" fontSize={9} fontWeight="bold">
        {pressure.toFixed(0)} PSI
      </text>
      {/* Level */}
      <text x={w / 2} y={50} textAnchor="middle" fill={levelColor} fontSize={8} fontWeight="bold">
        LVL {level.toFixed(0)}%
      </text>
    </g>
  )
}

function CompressorSymbol({ x, y, comp, alarmed, stopped }) {
  const w = 70
  const h = 55
  const isRunning = comp.status === 'running' || comp.status === 'locked_out_running'
  const borderColor = alarmed ? '#E8200C' : isRunning ? '#22c55e' : '#666'

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Compressor box */}
      <rect x={0} y={0} width={w} height={h} rx={4} fill="#1a1a22"
        stroke={borderColor} strokeWidth={alarmed ? 2 : 1.5} />
      {alarmed && <rect x={0} y={0} width={w} height={h} rx={4} fill="#E8200C" opacity={0.15} />}
      {/* Status indicator */}
      <circle cx={12} cy={11} r={4} fill={borderColor} />
      {/* Name */}
      <text x={22} y={14} fill="white" fontSize={9} fontWeight="bold">{comp.name}</text>
      {/* Status text */}
      <text x={w - 4} y={14} textAnchor="end" fill={borderColor} fontSize={6} fontWeight="bold">
        {alarmed ? 'ALARM' : isRunning ? 'RUN' : 'STOP'}
      </text>
      {isRunning ? (
        <>
          <text x={5} y={27} fill="#888" fontSize={6}>RPM {comp.rpm.toFixed(0)}</text>
          <text x={5} y={36} fill="#888" fontSize={6}>Load {comp.loadPct.toFixed(0)}%</text>
          <text x={5} y={45} fill="#888" fontSize={6}>Suct {comp.suctionPsi.toFixed(0)} PSI</text>
          {/* Load bar */}
          <rect x={5} y={49} width={w - 10} height={3} rx={1} fill="#111" />
          <rect x={5} y={49} width={Math.max(0, (w - 10) * (comp.loadPct / 100))} height={3} rx={1}
            fill={comp.loadPct > 90 ? '#E8200C' : comp.loadPct > 70 ? '#eab308' : '#22c55e'} />
        </>
      ) : (
        <text x={w / 2} y={38} textAnchor="middle" fill={borderColor} fontSize={9} opacity={0.7}>
          {comp.personnelLockout ? 'LOCKED' : stopped ? 'OFF' : 'FAULT'}
        </text>
      )}
    </g>
  )
}
