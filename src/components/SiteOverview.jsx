import { useMemo } from 'react'

// Site Overview — aerial/drone view of a West Texas gas lift injection site
//
// Layout (top to bottom, like looking down from a drone):
//
// TOP-RIGHT:    HP Scrubber + Oil/Water/Gas outputs + Sales Line
// TOP:          Production Header (collects from wells)
// UPPER:        Wells row (W1-W10) with names + priorities
// MIDDLE-UPPER: Choke Valves + Flow Meters (on injection lines to wells)
// MIDDLE:       Discharge Header (feeds injection lines)
// MIDDLE-LOWER: Compressors (C1-C4)
// LOWER:        Witch's Hats + Suction Control Valves
// BOTTOM:       Suction Header (fed by recirc from right side)
//
// RIGHT SIDE:   Gas from scrubber → Sales Line + Recirc/Buyback feeding back to suction header

export default function SiteOverview({ state, animateFlow = true, verticalOffset = 0 }) {
  const { compressors, wells, suctionHeaderPressure, scrubberPressure, salesValvePosition, wellUnloadActive } = state
  const nc = compressors.length
  const nw = wells.length
  const L = useMemo(() => computeLayout(nc, nw), [nc, nw])

  const scrubberLevel = 35 + Math.sin(state.tickCount * 0.05) * 10
  const scrubberLevelColor = scrubberLevel > 60 ? '#D32028' : scrubberLevel > 40 ? '#eab308' : '#22c55e'

  return (
    // overflow-auto rather than overflow-hidden so narrow-viewport
    // presentations (Sales Demo with both sidebars visible) never
    // clip outer SVG labels off the left edge — users can scroll to
    // reach them instead of losing content entirely.
    <div className="flex-1 overflow-auto bg-[#05233E]">
      <svg viewBox={`0 0 ${L.W} ${L.H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet"
        style={{ fontFamily: "Arial, sans-serif" }}>
        <defs>
          <pattern id="ov-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0c0c14" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={L.W} height={L.H} fill="url(#ov-grid)" />
        <g transform={`translate(0 ${verticalOffset})`}>

        {/* ═══════════ RIGHT SIDE: SCRUBBER + SALES + RECIRC ═══════════ */}

        {/* Production header → Scrubber (pipe goes right then up to scrubber) */}
        <AnimPipe points={[
          [L.prodHdrX2, L.prodHdrY],
          [L.scrubLeft, L.prodHdrY],
          [L.scrubLeft, L.scrubCY],
        ]} rate={0.6} color="#8B6914" animate={animateFlow} />

        {/* HP Scrubber */}
        <Scrubber x={L.scrubLeft} y={L.scrubCY - 35} pressure={scrubberPressure} level={scrubberLevel}
          levelColor={scrubberLevelColor} alarmed={wellUnloadActive} />

        {/* Water — exits bottom-left of scrubber */}
        <AnimPipe points={[
          [L.scrubLeft, L.scrubCY + 35],
          [L.scrubLeft, L.scrubCY + 60],
          [L.scrubLeft - 50, L.scrubCY + 60],
        ]} rate={0.3} color="#3b82f6" animate={animateFlow} />
        <text x={L.scrubLeft - 55} y={L.scrubCY + 57} textAnchor="end" fill="#3b82f6" fontSize={8} fontWeight="bold">WATER →</text>
        <text x={L.scrubLeft - 55} y={L.scrubCY + 67} textAnchor="end" fill="#444" fontSize={6}>DISPOSAL</text>

        {/* Oil — exits bottom of scrubber */}
        <AnimPipe points={[
          [L.scrubLeft + 40, L.scrubCY + 35],
          [L.scrubLeft + 40, L.scrubCY + 60],
          [L.scrubLeft - 10, L.scrubCY + 60],
        ]} rate={0.4} color="#8B6914" animate={animateFlow} />
        <text x={L.scrubLeft - 15} y={L.scrubCY + 57} textAnchor="end" fill="#8B6914" fontSize={8} fontWeight="bold">OIL →</text>
        <text x={L.scrubLeft - 15} y={L.scrubCY + 67} textAnchor="end" fill="#444" fontSize={6}>TANK BATTERY</text>

        {/* Gas — exits right side of scrubber, goes down to gas junction */}
        <AnimPipe points={[
          [L.scrubLeft + 120, L.scrubCY],
          [L.gasX, L.scrubCY],
          [L.gasX, L.gasJuncY],
        ]} rate={0.7} color="#22c55e" animate={animateFlow} />
        <text x={L.scrubLeft + 125} y={L.scrubCY - 6} fill="#22c55e" fontSize={8} fontWeight="bold">GAS OUT</text>

        {/* Gas junction: splits to Sales (right) and Recirc (down) */}

        {/* → Sales valve + Sales Line */}
        <AnimPipe points={[[L.gasX, L.gasJuncY], [L.salesVlvX - 15, L.gasJuncY]]} rate={salesValvePosition / 100} color="#22c55e" animate={animateFlow} />
        <Valve x={L.salesVlvX} y={L.gasJuncY} openPct={salesValvePosition} label="SALES VLV" />
        <AnimPipe points={[[L.salesVlvX + 15, L.gasJuncY], [L.salesBoxX, L.gasJuncY]]} rate={salesValvePosition / 100} color="#22c55e" animate={animateFlow} />
        <rect x={L.salesBoxX} y={L.gasJuncY - 18} width={85} height={36} rx={5} fill="#0a1a0a" stroke="#22c55e" strokeWidth={1.5} />
        <text x={L.salesBoxX + 42} y={L.gasJuncY - 2} textAnchor="middle" fill="#22c55e" fontSize={10} fontWeight="bold">SALES LINE</text>
        <text x={L.salesBoxX + 42} y={L.gasJuncY + 12} textAnchor="middle" fill="#555" fontSize={7}>→ PIPELINE</text>

        {/* ↓ Recirc / Buyback — goes DOWN from gas junction, then LEFT to suction header end */}
        <AnimPipe points={[
          [L.gasX, L.gasJuncY],
          [L.gasX, L.recircTurnY],
          [L.suctionHdrX2 + 10, L.recircTurnY],
          [L.suctionHdrX2 + 10, L.suctionHdrY],
        ]} rate={0.6} color="#22c55e" animate={animateFlow} />
        <text x={L.gasX + 5} y={L.gasJuncY + 14} fill="#22c55e" fontSize={7} fontWeight="bold">↓ RECIRC</text>
        <text x={(L.gasX + L.suctionHdrX2) / 2} y={L.recircTurnY - 6} textAnchor="middle" fill="#22c55e" fontSize={9} fontWeight="bold">
          BUYBACK / RECIRC LINE
        </text>

        {/* ═══════════ TOP: PRODUCTION HEADER ═══════════ */}
        <HdrPipe x1={L.prodHdrX1} y={L.prodHdrY} x2={L.prodHdrX2} label="PRODUCTION HEADER" color="#8B6914" animate={animateFlow} />

        {/* ═══════════ WELLS ═══════════ */}
        {wells.map((w, i) => {
          const cx = L.wellCX(i)
          const isAlarmed = !w.isAtTarget && w.desiredRate > 0
          return (
            <g key={`w-${w.id}`}>
              {/* Production line: well UP to production header */}
              <AnimPipe points={[[cx, L.wellY], [cx, L.prodHdrY]]} rate={w.productionBoe > 0 ? 0.6 : 0} color="#8B6914" animate={animateFlow} />
              {/* Well */}
              <WellBox x={cx - 45} y={L.wellY} well={w} alarmed={isAlarmed} pri={w.priority + 1} />
            </g>
          )
        })}

        {/* ═══════════ CHOKES + FLOW METERS ═══════════ */}
        {wells.map((w, i) => {
          const cx = L.wellCX(i)
          const isAlarmed = !w.isAtTarget && w.desiredRate > 0
          const fr = w.actualRate / (w.desiredRate || 1)
          return (
            <g key={`inj-${w.id}`}>
              {/* Injection line from well bottom down to choke */}
              <AnimPipe points={[[cx, L.wellY + 78], [cx, L.chokeY - 12]]} rate={fr} color="#22c55e" animate={animateFlow} />
              <Valve x={cx} y={L.chokeY} openPct={w.chokeAO} label={`CHK ${i + 1}`} alarmed={isAlarmed} />
              <AnimPipe points={[[cx, L.chokeY + 12], [cx, L.fmY - 14]]} rate={fr} color="#22c55e" animate={animateFlow} />
              <FM x={cx} y={L.fmY} value={w.actualRate} />
              <AnimPipe points={[[cx, L.fmY + 14], [cx, L.dischHdrY]]} rate={fr} color="#22c55e" animate={animateFlow} />
            </g>
          )
        })}

        {/* ═══════════ DISCHARGE HEADER ═══════════ */}
        <HdrPipe x1={L.prodHdrX1} y={L.dischHdrY} x2={L.prodHdrX2} label="DISCHARGE HEADER" color="#22c55e" animate={animateFlow} />

        {/* ═══════════ COMPRESSORS ═══════════ */}
        {compressors.map((c, i) => {
          const cx = L.compCX(i)
          const isRunning = c.status === 'running' || c.status === 'locked_out_running'
          const isAlarmed = c.status === 'tripped' || c.personnelLockout

          return (
            <g key={`c-${c.id}`}>
              {/* Compressor discharge UP to discharge header */}
              <AnimPipe points={[[cx, L.compY], [cx, L.dischHdrY]]} rate={isRunning ? c.loadPct / 100 : 0} color="#22c55e" animate={animateFlow} />
              {/* Compressor */}
              <CompBox x={cx - 50} y={L.compY} comp={c} alarmed={isAlarmed} />
              {/* Suction pipe from compressor DOWN to SCV */}
              <AnimPipe points={[[cx, L.compY + 80], [cx, L.scvY - 12]]} rate={isRunning ? c.loadPct / 100 : 0} color="#f97316" animate={animateFlow} />
              {/* Suction Control Valve */}
              <Valve x={cx} y={L.scvY} openPct={isRunning ? c.loadPct : 0} label={`SCV ${i + 1}`} alarmed={isAlarmed} />
              {/* SCV → Witch's Hat */}
              <AnimPipe points={[[cx, L.scvY + 12], [cx, L.witchY - 12]]} rate={isRunning ? c.loadPct / 100 : 0} color="#f97316" animate={animateFlow} />
              {/* Witch's Hat */}
              <WitchHat x={cx} y={L.witchY} />
              {/* Witch's Hat → Suction Header */}
              <AnimPipe points={[[cx, L.witchY + 12], [cx, L.suctionHdrY]]} rate={isRunning ? c.loadPct / 100 : 0} color="#f97316" animate={animateFlow} />
            </g>
          )
        })}

        {/* ═══════════ BOTTOM: SUCTION HEADER ═══════════ */}
        {/* Line draws without its HdrPipe label (passing '' suppresses
             the default "to the left of x1" text that was getting
             clipped off the viewport). The chip below replaces it
             with an in-bounds label + live pressure readout. */}
        <HdrPipe x1={L.suctionHdrX1} y={L.suctionHdrY} x2={L.suctionHdrX2 + 10} label="" color="#f97316" animate={animateFlow} />
        {/* SUCTION HEADER chip — sits ABOVE the pipe so it's always
             within the viewport regardless of screen width. Dark-filled
             so it stays legible over the navy background, orange
             border matches the pipe color. Pressure reading is the
             bright white value viewers read at a glance. */}
        {(() => {
          const chipX = L.suctionHdrX1 + 30
          const chipY = L.suctionHdrY - 26
          const chipW = 240
          const chipH = 24
          return (
            <g>
              <rect
                x={chipX} y={chipY} width={chipW} height={chipH}
                fill="#03172A" stroke="#f97316" strokeWidth={1.5} rx={2}
              />
              <text
                x={chipX + 12}
                y={chipY + chipH / 2 + 4}
                fill="#f97316"
                fontSize={11}
                fontWeight="bold"
                letterSpacing={1.5}
              >
                SUCTION HEADER
              </text>
              <line
                x1={chipX + 140}
                y1={chipY + 5}
                x2={chipX + 140}
                y2={chipY + chipH - 5}
                stroke="#f97316"
                strokeOpacity={0.35}
                strokeWidth={1}
              />
              <text
                x={chipX + chipW - 12}
                y={chipY + chipH / 2 + 4}
                textAnchor="end"
                fill="#FFFFFF"
                fontSize={13}
                fontWeight="bold"
              >
                {suctionHeaderPressure.toFixed(0)} PSI
              </text>
            </g>
          )
        })()}

        {/* Title */}
        <text x={15} y={18} fill="#333" fontSize={10} fontWeight="bold" letterSpacing="3">
          SITE OVERVIEW — PAD OPTIMIZATION
        </text>

        </g>

        {/* Legend */}
        <g transform={`translate(15, ${L.H - 58})`}>
          <rect x={0} y={0} width={160} height={52} rx={4} fill="#03172A" stroke="#293C5B" strokeWidth={0.5} />
          <text x={80} y={13} textAnchor="middle" fill="#444" fontSize={8} fontWeight="bold" letterSpacing="1">LEGEND</text>
          <line x1={10} y1={24} x2={38} y2={24} stroke="#22c55e" strokeWidth={2} className={animateFlow ? 'flow-line-animated' : ''} style={animateFlow ? { '--flow-speed': '2s' } : undefined} strokeDasharray={animateFlow ? '6 4' : undefined} />
          <text x={44} y={27} fill="#777" fontSize={7}>Gas / Injection</text>
          <line x1={10} y1={35} x2={38} y2={35} stroke="#8B6914" strokeWidth={2} className={animateFlow ? 'flow-line-animated' : ''} style={animateFlow ? { '--flow-speed': '2s' } : undefined} strokeDasharray={animateFlow ? '6 4' : undefined} />
          <text x={44} y={38} fill="#777" fontSize={7}>Oil / Production</text>
          <line x1={10} y1={46} x2={38} y2={46} stroke="#f97316" strokeWidth={2} className={animateFlow ? 'flow-line-animated' : ''} style={animateFlow ? { '--flow-speed': '2s' } : undefined} strokeDasharray={animateFlow ? '6 4' : undefined} />
          <text x={44} y={49} fill="#777" fontSize={7}>Suction Gas</text>
        </g>
      </svg>
    </div>
  )
}

// ═══════════ LAYOUT ═══════════
function computeLayout(nc, nw) {
  const W = 1300, H = 950

  // Vertical positions — generous spacing, top to bottom
  const prodHdrY = 65          // Production header near top
  const wellY = 100             // Wells below prod header
  const chokeY = 230            // Chokes below wells
  const fmY = 280               // Flow meters
  const dischHdrY = 340          // Discharge header
  const compY = 400              // Compressors
  const scvY = 520               // Suction control valves
  const witchY = 575             // Witch's hats / strainers
  const suctionHdrY = 635        // Suction header at BOTTOM

  // Scrubber on the RIGHT side, vertically between prod header and wells
  const scrubLeft = W - 310
  const scrubCY = 110

  // Gas/sales/recirc — right side
  const gasX = W - 200
  const gasJuncY = scrubCY + 60
  const salesVlvX = W - 165
  const salesBoxX = W - 100
  const recircTurnY = suctionHdrY - 40

  // Well horizontal spread — left 75% of page (leave right for scrubber/sales)
  const wellAreaW = W - 380
  const wellMargin = 60
  const wellSpacing = nw > 1 ? (wellAreaW - wellMargin * 2) / (nw - 1) : 0
  const wellCX = i => nw === 1 ? wellAreaW / 2 : wellMargin + i * wellSpacing

  // Compressor spread — centered under wells
  const compSpacing = nc > 1 ? (wellAreaW - wellMargin * 2) / (nc - 1) : 0
  const compCX = i => nc === 1 ? wellAreaW / 2 : wellMargin + i * compSpacing

  // Headers span across wells
  const prodHdrX1 = wellCX(0) - 35
  const prodHdrX2 = wellCX(nw - 1) + 35

  // Suction header — wide enough for compressors + recirc entry
  const suctionHdrX1 = compCX(0) - 40
  const suctionHdrX2 = Math.max(compCX(nc - 1) + 40, gasX - 30)

  return {
    W, H,
    prodHdrY, wellY, chokeY, fmY, dischHdrY,
    compY, scvY, witchY, suctionHdrY,
    scrubLeft, scrubCY,
    gasX, gasJuncY, salesVlvX, salesBoxX, recircTurnY,
    wellCX, compCX,
    prodHdrX1, prodHdrX2,
    suctionHdrX1, suctionHdrX2,
  }
}

// ═══════════ SVG COMPONENTS ═══════════

function HdrPipe({ x1, y, x2, label, color, animate = true }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={7} opacity={0.15} />
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={3}
        strokeDasharray={animate ? '8 5' : undefined} className={animate ? 'flow-line-animated' : ''} style={animate ? { '--flow-speed': '2s' } : undefined} />
      <text x={x1 - 8} y={y - 7} textAnchor="end" fill={color} fontSize={9} fontWeight="bold" opacity={0.9}>{label}</text>
    </g>
  )
}

function AnimPipe({ points, rate, color, animate = true }) {
  if (!points || points.length < 2) return null
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const on = rate > 0.01
  const w = on ? 1.5 + rate * 2 : 0.8
  const spd = on ? Math.max(0.5, 3 - rate * 2) : 0
  return <path d={d} fill="none" stroke={on ? color : '#151515'} strokeWidth={w}
    strokeLinecap="round" strokeLinejoin="round"
    className={on ? (animate ? 'flow-line-animated' : '') : 'flow-line-static'}
    style={on && animate ? { '--flow-speed': `${spd}s` } : undefined} />
}

function WellBox({ x, y, well, alarmed, pri }) {
  const bc = alarmed ? '#D32028' : '#22c55e'
  const w = 90, h = 65
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={w / 2} y={-10} textAnchor="middle" fill="#fff" fontSize={13} fontWeight="bold">{well.name}</text>
      <text x={w / 2} y={2} textAnchor="middle" fill="#888" fontSize={8}>Priority {pri}</text>
      <rect x={0} y={8} width={w} height={h} rx={4} fill="#0a0a16" stroke={bc} strokeWidth={alarmed ? 2.5 : 1.5} />
      {alarmed && <rect x={0} y={8} width={w} height={h} rx={4} fill="#D32028" opacity={0.1} />}
      <path d="M 25 18 L 25 27 L 21 32 L 29 37 L 21 42 L 29 47 L 25 50 L 25 58" stroke="#555" strokeWidth={1.5} fill="none" />
      <path d="M 65 18 L 65 27 L 61 32 L 69 37 L 61 42 L 69 47 L 65 50 L 65 58" stroke="#555" strokeWidth={1.5} fill="none" />
      {/* Desired vs Actual — plain English */}
      <text x={w / 2} y={h + 20} textAnchor="middle" fill={bc} fontSize={9} fontWeight="bold">
        {well.actualRate.toFixed(0)} / {well.desiredRate.toFixed(0)} MCFD
      </text>
      <text x={w / 2} y={h + 30} textAnchor="middle" fill="#666" fontSize={7}>getting / needs (gas rate)</text>
      <text x={w / 2} y={h + 42} textAnchor="middle" fill="#888" fontSize={7}>{well.productionBoe.toFixed(0)} barrels/day</text>
    </g>
  )
}

function Valve({ x, y, openPct, label, alarmed }) {
  const c = alarmed ? '#D32028' : openPct > 80 ? '#22c55e' : openPct > 30 ? '#eab308' : '#D32028'
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points="-9,-9 0,0 -9,9" fill={c} opacity={0.8} />
      <polygon points="9,-9 0,0 9,9" fill={c} opacity={0.8} />
      <line x1={0} y1={-9} x2={0} y2={9} stroke={c} strokeWidth={2} />
      <text x={15} y={-3} fill="#aaa" fontSize={7}>{label}</text>
      <text x={15} y={8} fill={c} fontSize={8} fontWeight="bold">{openPct.toFixed(0)}%</text>
    </g>
  )
}

function FM({ x, y, value }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={0} cy={0} r={12} fill="#0a0a16" stroke="#3b82f6" strokeWidth={1.5} />
      <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fill="#3b82f6" fontSize={7} fontWeight="bold">FM</text>
      <text x={18} y={4} fill="#ccc" fontSize={8} fontWeight="bold">{value.toFixed(0)}</text>
    </g>
  )
}

function WitchHat({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points="-10,10 0,-10 10,10" fill="none" stroke="#f97316" strokeWidth={1.5} />
      <line x1={-6} y1={5} x2={6} y2={5} stroke="#f97316" strokeWidth={0.7} />
      <line x1={-3} y1={0} x2={3} y2={0} stroke="#f97316" strokeWidth={0.7} />
      <text x={16} y={4} fill="#888" fontSize={7}>STRAINER</text>
    </g>
  )
}

function Scrubber({ x, y, pressure, level, levelColor, alarmed }) {
  const w = 120, h = 70
  const bc = alarmed ? '#D32028' : '#888'
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={8} fill="#0a0a16" stroke={bc} strokeWidth={alarmed ? 2.5 : 1.5} />
      {alarmed && <rect x={0} y={0} width={w} height={h} rx={8} fill="#D32028" opacity={0.12} />}
      <rect x={3} y={h - (h * level / 100)} width={w - 6} height={h * level / 100 - 3} rx={5} fill={levelColor} opacity={0.2} />
      <text x={w / 2} y={17} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">HP SCRUBBER</text>
      <text x={w / 2} y={30} textAnchor="middle" fill="#ccc" fontSize={8}>SEPARATOR</text>
      <text x={w / 2} y={46} textAnchor="middle" fill="#f97316" fontSize={12} fontWeight="bold">{pressure.toFixed(0)} PSI</text>
      <text x={w / 2} y={62} textAnchor="middle" fill={levelColor} fontSize={10} fontWeight="bold">LVL {level.toFixed(0)}%</text>
    </g>
  )
}

function CompBox({ x, y, comp, alarmed }) {
  const w = 100, h = 78
  const running = comp.status === 'running' || comp.status === 'locked_out_running'
  const bc = alarmed ? '#D32028' : running ? '#22c55e' : '#555'
  const flowMcfd = comp.actualThroughput || 0
  const capacityMcfd = comp.capacityMcfd || 400
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={5} fill="#0a0a16" stroke={bc} strokeWidth={alarmed ? 2.5 : 1.5} />
      {alarmed && <rect x={0} y={0} width={w} height={h} rx={5} fill="#D32028" opacity={0.12} />}
      <circle cx={16} cy={14} r={5} fill={bc} />
      <text x={27} y={17} fill="#fff" fontSize={11} fontWeight="bold">{comp.name}</text>
      <text x={w - 5} y={17} textAnchor="end" fill={bc} fontSize={7} fontWeight="bold">
        {alarmed ? 'ALARM' : running ? 'RUN' : 'STOP'}
      </text>
      {running ? (
        <>
          {/* Flow rate — plain English */}
          <text x={7} y={31} fill="#4fc3f7" fontSize={9} fontWeight="bold">{flowMcfd.toFixed(0)} / {capacityMcfd} MCFD</text>
          <text x={7} y={40} fill="#555" fontSize={6}>flowing / max capacity</text>
          <text x={7} y={51} fill="#999" fontSize={7}>Speed {comp.rpm.toFixed(0)} RPM</text>
          <text x={7} y={61} fill="#999" fontSize={7}>Working {comp.loadPct.toFixed(0)}% hard</text>
          {/* Load bar */}
          <rect x={7} y={67} width={w - 14} height={4} rx={2} fill="#111" />
          <rect x={7} y={67} width={Math.max(0, (w - 14) * (comp.loadPct / 100))} height={4} rx={2}
            fill={comp.loadPct > 90 ? '#D32028' : comp.loadPct > 70 ? '#eab308' : '#22c55e'} />
        </>
      ) : (
        <text x={w / 2} y={50} textAnchor="middle" fill={bc} fontSize={11} opacity={0.7}>
          {comp.personnelLockout ? 'LOCKED OUT' : 'OFFLINE'}
        </text>
      )}
    </g>
  )
}
