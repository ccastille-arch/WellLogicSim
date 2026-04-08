import { useMemo } from 'react'

// Site Overview — live P&ID process flow diagram
// CIRCULAR FLOW — spread across full page, easy to read
//
// TOP ROW:      Wells (production goes UP off top)... actually production goes to prod header
// ROW 2:        Production Header
// ROW 3:        HP Scrubber/Separator with outputs (water, oil, gas)
// ROW 4:        Gas line → Sales (right edge) + Recirc/Buyback (far right, loops down)
// ROW 5:        Suction Header (recirc ties into right end)
// ROW 6:        Witch's Hats
// ROW 7:        Suction Control Valves
// ROW 8:        Compressors
// ROW 9:        Discharge Header
// ROW 10:       Choke Valves + Flow Meters
// BOTTOM ROW:   Injection lines going UP to wells (visual loop back to top)

export default function SiteOverview({ state, config }) {
  const { compressors, wells, suctionHeaderPressure, scrubberPressure, salesValvePosition, alarms, wellUnloadActive } = state
  const nc = compressors.length
  const nw = wells.length
  const L = useMemo(() => computeLayout(nc, nw), [nc, nw])

  const scrubberLevel = 35 + Math.sin(state.tickCount * 0.05) * 10
  const scrubberLevelColor = scrubberLevel > 60 ? '#E8200C' : scrubberLevel > 40 ? '#eab308' : '#22c55e'

  return (
    <div className="flex-1 overflow-hidden bg-[#080810]">
      <svg viewBox={`0 0 ${L.W} ${L.H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet"
        style={{ fontFamily: "Arial, sans-serif" }}>
        <defs>
          <pattern id="ov-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0e0e18" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={L.W} height={L.H} fill="url(#ov-grid)" />

        {/* Title */}
        <text x={L.W / 2} y={20} textAnchor="middle" fill="#333" fontSize={11} fontWeight="bold" letterSpacing="4">
          SITE OVERVIEW — PAD OPTIMIZATION
        </text>

        {/* ═══════════════════════ WELLS (top) ═══════════════════════ */}
        {wells.map((w, i) => {
          const cx = L.wellCX(i)
          const isAlarmed = !w.isAtTarget && w.desiredRate > 0
          return (
            <g key={`w-${w.id}`}>
              {/* Well box */}
              <WellBox x={cx - 45} y={L.wellY} well={w} alarmed={isAlarmed} pri={w.priority + 1} />
              {/* Production line: well bottom → production header */}
              <AnimPipe points={[[cx, L.wellY + 75], [cx, L.prodHdrY]]} rate={w.productionBoe > 0 ? 0.6 : 0} color="#8B6914" />
            </g>
          )
        })}

        {/* ═══════════════════════ PRODUCTION HEADER ═══════════════════════ */}
        <HdrPipe x1={L.hdrX1} y={L.prodHdrY} x2={L.hdrX2} label="PRODUCTION HEADER" color="#8B6914" />

        {/* Prod header down to scrubber */}
        <AnimPipe points={[[L.scrubCX, L.prodHdrY], [L.scrubCX, L.scrubY]]} rate={0.6} color="#8B6914" />

        {/* ═══════════════════════ HP SCRUBBER / SEPARATOR ═══════════════════════ */}
        <Scrubber x={L.scrubCX - 60} y={L.scrubY} pressure={scrubberPressure} level={scrubberLevel}
          levelColor={scrubberLevelColor} alarmed={wellUnloadActive} />

        {/* ─── Scrubber outputs ─── */}
        {/* Water — exits far left */}
        <AnimPipe points={[[L.scrubCX - 60, L.scrubY + 28], [L.scrubCX - 130, L.scrubY + 28], [L.scrubCX - 130, L.scrubY + 55]]} rate={0.3} color="#3b82f6" />
        <text x={L.scrubCX - 130} y={L.scrubY + 67} textAnchor="middle" fill="#3b82f6" fontSize={8} fontWeight="bold">PRODUCED WATER</text>
        <text x={L.scrubCX - 130} y={L.scrubY + 77} textAnchor="middle" fill="#444" fontSize={6}>→ DISPOSAL</text>

        {/* Oil — exits left of scrubber */}
        <AnimPipe points={[[L.scrubCX - 60, L.scrubY + 40], [L.scrubCX - 80, L.scrubY + 40], [L.scrubCX - 80, L.scrubY + 55]]} rate={0.4} color="#8B6914" />
        <text x={L.scrubCX - 80} y={L.scrubY + 67} textAnchor="middle" fill="#8B6914" fontSize={8} fontWeight="bold">OIL</text>
        <text x={L.scrubCX - 80} y={L.scrubY + 77} textAnchor="middle" fill="#444" fontSize={6}>→ TANK BATTERY</text>

        {/* Gas — exits right side of scrubber, runs to far right */}
        <AnimPipe points={[
          [L.scrubCX + 60, L.scrubY + 25],
          [L.gasLineX, L.scrubY + 25],
          [L.gasLineX, L.gasLineY],
        ]} rate={0.7} color="#22c55e" />
        <text x={L.scrubCX + 65} y={L.scrubY + 20} fill="#22c55e" fontSize={8} fontWeight="bold">GAS OUT</text>

        {/* ═══════════════════════ GAS LINE → SALES + RECIRC ═══════════════════════ */}

        {/* Gas line runs horizontally right */}
        <AnimPipe points={[[L.gasLineX, L.gasLineY], [L.salesVlvX - 15, L.gasLineY]]} rate={salesValvePosition / 100} color="#22c55e" />

        {/* Sales valve */}
        <Valve x={L.salesVlvX} y={L.gasLineY} openPct={salesValvePosition} label="SALES VLV" />

        {/* Sales valve → Sales Line box */}
        <AnimPipe points={[[L.salesVlvX + 15, L.gasLineY], [L.salesBoxX, L.gasLineY]]} rate={salesValvePosition / 100} color="#22c55e" />
        <rect x={L.salesBoxX} y={L.gasLineY - 16} width={80} height={32} rx={5} fill="#0a1a0a" stroke="#22c55e" strokeWidth={1.5} />
        <text x={L.salesBoxX + 40} y={L.gasLineY - 2} textAnchor="middle" fill="#22c55e" fontSize={9} fontWeight="bold">SALES LINE</text>
        <text x={L.salesBoxX + 40} y={L.gasLineY + 10} textAnchor="middle" fill="#555" fontSize={6}>→ PIPELINE</text>

        {/* Recirc/Buyback — branches DOWN from gas line, runs left to suction header end */}
        <AnimPipe points={[
          [L.gasLineX, L.gasLineY],
          [L.gasLineX, L.recircY],
          [L.suctionHdrX2 + 5, L.recircY],
          [L.suctionHdrX2 + 5, L.suctionHdrY],
        ]} rate={0.6} color="#22c55e" />
        <text x={L.gasLineX} y={L.gasLineY + 12} fill="#22c55e" fontSize={7} fontWeight="bold" textAnchor="start">↓ RECIRC</text>
        <text x={(L.gasLineX + L.suctionHdrX2) / 2} y={L.recircY - 5} textAnchor="middle" fill="#22c55e" fontSize={8} fontWeight="bold">
          BUYBACK / RECIRC LINE
        </text>

        {/* ═══════════════════════ SUCTION HEADER ═══════════════════════ */}
        <HdrPipe x1={L.suctionHdrX1} y={L.suctionHdrY} x2={L.suctionHdrX2 + 5} label="SUCTION HEADER" color="#f97316" />
        <text x={L.suctionHdrX1 - 4} y={L.suctionHdrY + 14} textAnchor="end" fill="#f97316" fontSize={10} fontWeight="bold">
          {suctionHeaderPressure.toFixed(0)} PSI
        </text>

        {/* ═══════════════════════ COMPRESSOR SECTION ═══════════════════════ */}
        {compressors.map((c, i) => {
          const cx = L.compCX(i)
          const isRunning = c.status === 'running' || c.status === 'locked_out_running'
          const isAlarmed = c.status === 'tripped' || c.personnelLockout

          return (
            <g key={`c-${c.id}`}>
              {/* Suction header → Witch's hat */}
              <AnimPipe points={[[cx, L.suctionHdrY], [cx, L.witchY - 10]]} rate={isRunning ? c.loadPct / 100 : 0} color="#f97316" />

              {/* Witch's hat */}
              <WitchHat x={cx} y={L.witchY} />

              {/* Witch's hat → SCV */}
              <AnimPipe points={[[cx, L.witchY + 10], [cx, L.scvY - 10]]} rate={isRunning ? c.loadPct / 100 : 0} color="#f97316" />

              {/* Suction Control Valve */}
              <Valve x={cx} y={L.scvY} openPct={isRunning ? c.loadPct : 0} label={`SCV ${i + 1}`} alarmed={isAlarmed} />

              {/* SCV → Compressor */}
              <AnimPipe points={[[cx, L.scvY + 10], [cx, L.compY]]} rate={isRunning ? c.loadPct / 100 : 0} color="#f97316" />

              {/* Compressor */}
              <CompBox x={cx - 45} y={L.compY} comp={c} alarmed={isAlarmed} />

              {/* Compressor discharge → Discharge Header */}
              <AnimPipe points={[[cx, L.compY + 65], [cx, L.dischHdrY]]} rate={isRunning ? c.loadPct / 100 : 0} color="#22c55e" />
            </g>
          )
        })}

        {/* ═══════════════════════ DISCHARGE HEADER ═══════════════════════ */}
        <HdrPipe x1={L.hdrX1} y={L.dischHdrY} x2={L.hdrX2} label="DISCHARGE HEADER" color="#22c55e" />

        {/* ═══════════════════════ CHOKES + FLOW METERS (below discharge) ═══════════════════════ */}
        {wells.map((w, i) => {
          const cx = L.wellCX(i)
          const isAlarmed = !w.isAtTarget && w.desiredRate > 0
          const flowNorm = w.actualRate / (w.desiredRate || 1)

          return (
            <g key={`inj-${w.id}`}>
              {/* Discharge header → Choke */}
              <AnimPipe points={[[cx, L.dischHdrY], [cx, L.chokeY - 10]]} rate={flowNorm} color="#22c55e" />

              {/* Choke valve */}
              <Valve x={cx} y={L.chokeY} openPct={w.chokeAO} label={`CHK ${i + 1}`} alarmed={isAlarmed} />

              {/* Choke → Flow meter */}
              <AnimPipe points={[[cx, L.chokeY + 10], [cx, L.fmY - 12]]} rate={flowNorm} color="#22c55e" />

              {/* Flow meter */}
              <FM x={cx} y={L.fmY} value={w.actualRate} />

              {/* Flow meter → injection line going UP back to well */}
              <AnimPipe points={[[cx, L.fmY + 12], [cx, L.injReturnY]]} rate={flowNorm} color="#22c55e" />

              {/* Dashed return indicator showing injection goes back up to well */}
              <line x1={cx} y1={L.injReturnY} x2={cx} y2={L.injReturnY + 12}
                stroke="#22c55e" strokeWidth={1} strokeDasharray="3 4" opacity={0.4} />
              <text x={cx} y={L.injReturnY + 22} textAnchor="middle" fill="#22c55e" fontSize={6} opacity={0.5}>
                ↑ TO {w.name}
              </text>
            </g>
          )
        })}

        {/* ═══════════════════════ LEGEND ═══════════════════════ */}
        <g transform={`translate(15, ${L.H - 55})`}>
          <rect x={0} y={0} width={150} height={50} rx={4} fill="#0a0a14" stroke="#1a1a2a" strokeWidth={0.5} />
          <text x={75} y={12} textAnchor="middle" fill="#444" fontSize={7} fontWeight="bold" letterSpacing="1">LEGEND</text>
          <line x1={10} y1={22} x2={35} y2={22} stroke="#22c55e" strokeWidth={2} className="flow-line-animated" style={{ '--flow-speed': '2s' }} strokeDasharray="6 4" />
          <text x={40} y={25} fill="#777" fontSize={7}>Gas / Injection</text>
          <line x1={10} y1={33} x2={35} y2={33} stroke="#8B6914" strokeWidth={2} className="flow-line-animated" style={{ '--flow-speed': '2s' }} strokeDasharray="6 4" />
          <text x={40} y={36} fill="#777" fontSize={7}>Oil / Production</text>
          <line x1={10} y1={44} x2={35} y2={44} stroke="#f97316" strokeWidth={2} className="flow-line-animated" style={{ '--flow-speed': '2s' }} strokeDasharray="6 4" />
          <text x={40} y={47} fill="#777" fontSize={7}>Suction Gas</text>
        </g>
      </svg>
    </div>
  )
}

// ═══════════════════════ LAYOUT ═══════════════════════
function computeLayout(nc, nw) {
  const W = 1200, H = 900

  // Generous vertical spacing — use the full page
  const wellY = 35
  const prodHdrY = 130
  const scrubY = 165
  // Gas/sales/recirc zone
  const gasLineY = 280
  const recircY = 330
  // Suction system
  const suctionHdrY = 380
  const witchY = 430
  const scvY = 475
  // Compressors
  const compY = 520
  // Discharge header
  const dischHdrY = 620
  // Chokes and flow meters (injection side)
  const chokeY = 670
  const fmY = 720
  const injReturnY = 770

  // Well horizontal spread — use full width
  const wellMargin = 80
  const wellSpacing = nw > 1 ? (W - wellMargin * 2) / (nw - 1) : 0
  const wellCX = i => nw === 1 ? W / 2 : wellMargin + i * wellSpacing

  // Compressor horizontal spread — centered, generous spacing
  const compMargin = 150
  const compSpacing = nc > 1 ? (W - compMargin * 2) / (nc - 1) : 0
  const compCX = i => nc === 1 ? W / 2 : compMargin + i * compSpacing

  // Headers span full width of wells
  const hdrX1 = wellCX(0) - 40
  const hdrX2 = wellCX(nw - 1) + 40

  // Suction header centered on compressors
  const suctionHdrX1 = compCX(0) - 40
  const suctionHdrX2 = compCX(nc - 1) + 40

  // Scrubber centered
  const scrubCX = W / 2

  // Gas line and sales — far right
  const gasLineX = W - 300
  const salesVlvX = W - 170
  const salesBoxX = W - 120

  return {
    W, H,
    wellY, prodHdrY, scrubY, gasLineY, recircY,
    suctionHdrY, witchY, scvY, compY,
    dischHdrY, chokeY, fmY, injReturnY,
    wellCX, compCX,
    hdrX1, hdrX2,
    suctionHdrX1, suctionHdrX2,
    scrubCX, gasLineX, salesVlvX, salesBoxX,
  }
}

// ═══════════════════════ SVG COMPONENTS ═══════════════════════

function HdrPipe({ x1, y, x2, label, color }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={6} opacity={0.2} />
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={3}
        strokeDasharray="8 5" className="flow-line-animated" style={{ '--flow-speed': '2s' }} />
      <text x={x1 - 6} y={y - 6} textAnchor="end" fill={color} fontSize={8} fontWeight="bold" opacity={0.9}>{label}</text>
    </g>
  )
}

function AnimPipe({ points, rate, color }) {
  if (!points || points.length < 2) return null
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const on = rate > 0.01
  const w = on ? 1.5 + rate * 2 : 0.8
  const spd = on ? Math.max(0.5, 3 - rate * 2) : 0
  return <path d={d} fill="none" stroke={on ? color : '#1a1a1a'} strokeWidth={w}
    strokeLinecap="round" strokeLinejoin="round"
    className={on ? 'flow-line-animated' : 'flow-line-static'}
    style={on ? { '--flow-speed': `${spd}s` } : undefined} />
}

function WellBox({ x, y, well, alarmed, pri }) {
  const bc = alarmed ? '#E8200C' : '#22c55e'
  const w = 90, h = 65
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Name + priority */}
      <text x={w / 2} y={-8} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">{well.name}</text>
      <text x={w / 2} y={3} textAnchor="middle" fill="#888" fontSize={8}>Priority {pri}</text>
      {/* Well casing */}
      <rect x={0} y={10} width={w} height={h} rx={4} fill="#0a0a16" stroke={bc} strokeWidth={alarmed ? 2.5 : 1.5} />
      {alarmed && <rect x={0} y={10} width={w} height={h} rx={4} fill="#E8200C" opacity={0.1} />}
      {/* Wellbore lines */}
      <path d="M 25 20 L 25 28 L 21 33 L 29 38 L 21 43 L 29 48 L 25 52 L 25 60" stroke="#555" strokeWidth={1.5} fill="none" />
      <path d="M 65 20 L 65 28 L 61 33 L 69 38 L 61 43 L 69 48 L 65 52 L 65 60" stroke="#555" strokeWidth={1.5} fill="none" />
      {/* Readings */}
      <text x={w / 2} y={h + 22} textAnchor="middle" fill={bc} fontSize={9} fontWeight="bold">{well.actualRate.toFixed(0)} MCFD</text>
      <text x={w / 2} y={h + 33} textAnchor="middle" fill="#666" fontSize={7}>{well.productionBoe.toFixed(0)} BOE/d</text>
    </g>
  )
}

function Valve({ x, y, openPct, label, alarmed }) {
  const c = alarmed ? '#E8200C' : openPct > 80 ? '#22c55e' : openPct > 30 ? '#eab308' : '#E8200C'
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points="-8,-8 0,0 -8,8" fill={c} opacity={0.8} />
      <polygon points="8,-8 0,0 8,8" fill={c} opacity={0.8} />
      <line x1={0} y1={-8} x2={0} y2={8} stroke={c} strokeWidth={2} />
      <text x={14} y={-2} fill="#aaa" fontSize={7}>{label}</text>
      <text x={14} y={8} fill={c} fontSize={7} fontWeight="bold">{openPct.toFixed(0)}%</text>
    </g>
  )
}

function FM({ x, y, value }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={0} cy={0} r={11} fill="#0a0a16" stroke="#3b82f6" strokeWidth={1.5} />
      <text x={0} y={-1} textAnchor="middle" dominantBaseline="middle" fill="#3b82f6" fontSize={6} fontWeight="bold">FM</text>
      <text x={16} y={3} fill="#ccc" fontSize={7} fontWeight="bold">{value.toFixed(0)}</text>
    </g>
  )
}

function WitchHat({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points="-9,9 0,-9 9,9" fill="none" stroke="#f97316" strokeWidth={1.5} />
      <line x1={-5} y1={4} x2={5} y2={4} stroke="#f97316" strokeWidth={0.7} />
      <line x1={-3} y1={0} x2={3} y2={0} stroke="#f97316" strokeWidth={0.7} />
      <text x={14} y={3} fill="#888" fontSize={6}>STRAINER</text>
    </g>
  )
}

function Scrubber({ x, y, pressure, level, levelColor, alarmed }) {
  const w = 120, h = 65
  const bc = alarmed ? '#E8200C' : '#888'
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={8} fill="#0a0a16" stroke={bc} strokeWidth={alarmed ? 2.5 : 1.5} />
      {alarmed && <rect x={0} y={0} width={w} height={h} rx={8} fill="#E8200C" opacity={0.12} />}
      {/* Liquid level */}
      <rect x={3} y={h - (h * level / 100)} width={w - 6} height={h * level / 100 - 3} rx={5} fill={levelColor} opacity={0.2} />
      <text x={w / 2} y={16} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">HP SCRUBBER</text>
      <text x={w / 2} y={28} textAnchor="middle" fill="#ccc" fontSize={8}>SEPARATOR</text>
      <text x={w / 2} y={42} textAnchor="middle" fill="#f97316" fontSize={11} fontWeight="bold">{pressure.toFixed(0)} PSI</text>
      <text x={w / 2} y={56} textAnchor="middle" fill={levelColor} fontSize={9} fontWeight="bold">LVL {level.toFixed(0)}%</text>
    </g>
  )
}

function CompBox({ x, y, comp, alarmed }) {
  const w = 90, h = 60
  const running = comp.status === 'running' || comp.status === 'locked_out_running'
  const bc = alarmed ? '#E8200C' : running ? '#22c55e' : '#555'
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={5} fill="#0a0a16" stroke={bc} strokeWidth={alarmed ? 2.5 : 1.5} />
      {alarmed && <rect x={0} y={0} width={w} height={h} rx={5} fill="#E8200C" opacity={0.12} />}
      <circle cx={14} cy={14} r={5} fill={bc} />
      <text x={26} y={17} fill="#fff" fontSize={11} fontWeight="bold">{comp.name}</text>
      <text x={w - 5} y={17} textAnchor="end" fill={bc} fontSize={7} fontWeight="bold">
        {alarmed ? 'ALARM' : running ? 'RUN' : 'STOP'}
      </text>
      {running ? (
        <>
          <text x={6} y={31} fill="#999" fontSize={7}>RPM {comp.rpm.toFixed(0)}</text>
          <text x={6} y={41} fill="#999" fontSize={7}>Load {comp.loadPct.toFixed(0)}%</text>
          <text x={6} y={51} fill="#999" fontSize={7}>Suct {comp.suctionPsi.toFixed(0)} PSI</text>
          <rect x={6} y={54} width={w - 12} height={4} rx={2} fill="#111" />
          <rect x={6} y={54} width={Math.max(0, (w - 12) * (comp.loadPct / 100))} height={4} rx={2}
            fill={comp.loadPct > 90 ? '#E8200C' : comp.loadPct > 70 ? '#eab308' : '#22c55e'} />
        </>
      ) : (
        <text x={w / 2} y={42} textAnchor="middle" fill={bc} fontSize={10} opacity={0.7}>
          {comp.personnelLockout ? 'LOCKED OUT' : 'OFFLINE'}
        </text>
      )}
    </g>
  )
}
