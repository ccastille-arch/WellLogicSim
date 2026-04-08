import { useMemo } from 'react'

// Site Overview — live P&ID process flow diagram
// CIRCULAR FLOW: Wells produce up → Production Header → HP Scrubber → Gas splits (Sales + Recirc)
//                Recirc → Suction Header → Compressors (center) → Discharge Header → back to Wells
//
// Layout top-to-bottom:
//   1. Production Header + HP Scrubber + Oil/Water/Gas outputs (TOP)
//   2. Wells row (upper-middle) — production goes UP, injection comes from BELOW
//   3. Choke valves + Flow meters (below wells)
//   4. Discharge Header (below chokes)
//   5. Compressors (CENTER)
//   6. Suction Control Valves + Witch's Hats (above compressors)
//   7. Suction Header (fed from recirc/buyback from gas line)

export default function SiteOverview({ state, config }) {
  const { compressors, wells, suctionHeaderPressure, scrubberPressure, salesValvePosition, alarms, wellUnloadActive } = state
  const nc = compressors.length
  const nw = wells.length
  const L = useMemo(() => computeLayout(nc, nw), [nc, nw])

  const scrubberLevel = 35 + Math.sin(state.tickCount * 0.05) * 10
  const scrubberLevelColor = scrubberLevel > 60 ? '#E8200C' : scrubberLevel > 40 ? '#eab308' : '#22c55e'

  return (
    <div className="flex-1 overflow-hidden bg-[#0a0a10] p-2">
      <svg viewBox={`0 0 ${L.W} ${L.H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet"
        style={{ fontFamily: "Arial, sans-serif" }}>
        <defs>
          <pattern id="ov-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#12121a" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={L.W} height={L.H} fill="url(#ov-grid)" />

        {/* ====== TOP SECTION: Scrubber & Outputs ====== */}

        {/* Production Header */}
        <HdrPipe x1={L.prodHdrX1} y={L.prodHdrY} x2={L.prodHdrX2} label="PRODUCTION HEADER" color="#8B6914" />

        {/* Prod Header → Scrubber */}
        <AnimPipe points={[[L.scrubX + 50, L.prodHdrY], [L.scrubX + 50, L.scrubY]]} rate={0.6} color="#8B6914" />

        {/* HP Scrubber */}
        <Scrubber x={L.scrubX} y={L.scrubY} pressure={scrubberPressure} level={scrubberLevel}
          levelColor={scrubberLevelColor} alarmed={wellUnloadActive} />

        {/* Scrubber outputs: Water (left), Oil (center-left), Gas (right) */}
        <AnimPipe points={[[L.scrubX, L.scrubY + 25], [L.scrubX - 60, L.scrubY + 25], [L.scrubX - 60, L.scrubY + 50]]} rate={0.3} color="#3b82f6" />
        <text x={L.scrubX - 60} y={L.scrubY + 62} textAnchor="middle" fill="#3b82f6" fontSize={7} fontWeight="bold">WATER</text>
        <text x={L.scrubX - 60} y={L.scrubY + 70} textAnchor="middle" fill="#444" fontSize={5}>→ OFF-SITE</text>

        <AnimPipe points={[[L.scrubX, L.scrubY + 35], [L.scrubX - 30, L.scrubY + 35], [L.scrubX - 30, L.scrubY + 50]]} rate={0.4} color="#8B6914" />
        <text x={L.scrubX - 30} y={L.scrubY + 62} textAnchor="middle" fill="#8B6914" fontSize={7} fontWeight="bold">OIL</text>
        <text x={L.scrubX - 30} y={L.scrubY + 70} textAnchor="middle" fill="#444" fontSize={5}>→ TANK</text>

        {/* Gas line exits right */}
        <AnimPipe points={[[L.scrubX + 100, L.scrubY + 20], [L.gasJuncX, L.scrubY + 20]]} rate={0.7} color="#22c55e" />
        <text x={L.scrubX + 105} y={L.scrubY + 16} fill="#22c55e" fontSize={7} fontWeight="bold">GAS</text>

        {/* Gas junction → Sales Line (continues right) */}
        <AnimPipe points={[[L.gasJuncX, L.scrubY + 20], [L.salesX - 20, L.scrubY + 20]]} rate={salesValvePosition / 100} color="#22c55e" />
        <Valve x={L.salesX - 20} y={L.scrubY + 20} openPct={salesValvePosition} label="SALES VLV" />
        <rect x={L.salesX + 2} y={L.scrubY + 6} width={65} height={28} rx={4} fill="#0a1a0a" stroke="#22c55e" strokeWidth={1} />
        <text x={L.salesX + 34} y={L.scrubY + 18} textAnchor="middle" fill="#22c55e" fontSize={8} fontWeight="bold">SALES LINE</text>
        <text x={L.salesX + 34} y={L.scrubY + 28} textAnchor="middle" fill="#666" fontSize={6}>→ PIPELINE</text>

        {/* Gas junction → Recirc/Buyback line (goes DOWN to suction header) */}
        <AnimPipe points={[
          [L.gasJuncX, L.scrubY + 20],
          [L.gasJuncX, L.recircTurnY],
          [L.suctionHdrCX, L.recircTurnY],
          [L.suctionHdrCX, L.suctionHdrY],
        ]} rate={0.6} color="#22c55e" />
        <text x={(L.gasJuncX + L.suctionHdrCX) / 2} y={L.recircTurnY - 4} textAnchor="middle" fill="#22c55e" fontSize={7} fontWeight="bold">
          RECIRC / BUYBACK
        </text>

        {/* ====== WELLS ROW ====== */}
        {wells.map((w, i) => {
          const wx = L.wellX(i)
          const cx = wx + 40
          const isAlarmed = !w.isAtTarget && w.desiredRate > 0

          return (
            <g key={`w-${w.id}`}>
              {/* Production: well UP to production header */}
              <AnimPipe points={[[cx, L.wellY], [cx, L.prodHdrY]]} rate={w.productionBoe > 0 ? 0.6 : 0} color="#8B6914" />

              {/* Well */}
              <Well x={wx} y={L.wellY} well={w} alarmed={isAlarmed} pri={w.priority + 1} />

              {/* Injection: choke + flow meter BELOW well, feeding up into well */}
              <AnimPipe points={[[cx, L.wellY + 55], [cx, L.chokeY - 8]]} rate={w.actualRate / (w.desiredRate || 1)} color="#22c55e" />

              {/* Choke valve */}
              <Valve x={cx} y={L.chokeY} openPct={w.chokeAO} label={`CHK${i+1}`} alarmed={isAlarmed} />

              {/* Flow meter */}
              <FM x={cx} y={L.fmY} value={w.actualRate} />

              {/* From discharge header up through flow meter */}
              <AnimPipe points={[[cx, L.dischHdrY], [cx, L.fmY + 10]]} rate={w.actualRate / (w.desiredRate || 1)} color="#22c55e" />
              <AnimPipe points={[[cx, L.fmY - 10], [cx, L.chokeY + 8]]} rate={w.actualRate / (w.desiredRate || 1)} color="#22c55e" />
            </g>
          )
        })}

        {/* ====== DISCHARGE HEADER ====== */}
        <HdrPipe x1={L.dischHdrX1} y={L.dischHdrY} x2={L.dischHdrX2} label="DISCHARGE HEADER" color="#22c55e" />

        {/* ====== COMPRESSORS (center of the loop) ====== */}
        {compressors.map((c, i) => {
          const cx = L.compX(i)
          const mid = cx + 35
          const isRunning = c.status === 'running' || c.status === 'locked_out_running'
          const isAlarmed = c.status === 'tripped' || c.personnelLockout

          return (
            <g key={`c-${c.id}`}>
              {/* Compressor → discharge header (UP) */}
              <AnimPipe points={[[mid, L.compY], [mid, L.dischHdrY]]} rate={isRunning ? c.loadPct / 100 : 0} color="#22c55e" />

              {/* Suction header → witch's hat → SCV → compressor (DOWN) */}
              <AnimPipe points={[[mid, L.suctionHdrY], [mid, L.witchY - 8]]} rate={isRunning ? c.loadPct / 100 : 0} color="#f97316" />
              <WitchHat x={mid} y={L.witchY} />
              <AnimPipe points={[[mid, L.witchY + 8], [mid, L.scvY - 8]]} rate={isRunning ? c.loadPct / 100 : 0} color="#f97316" />
              <Valve x={mid} y={L.scvY} openPct={isRunning ? c.loadPct : 0} label={`SCV${i+1}`} alarmed={isAlarmed} />
              <AnimPipe points={[[mid, L.scvY + 8], [mid, L.compY + 55]]} rate={isRunning ? c.loadPct / 100 : 0} color="#f97316" />

              {/* Compressor box */}
              <Comp x={cx} y={L.compY} comp={c} alarmed={isAlarmed} />
            </g>
          )
        })}

        {/* ====== SUCTION HEADER ====== */}
        <HdrPipe x1={L.suctionHdrX1} y={L.suctionHdrY} x2={L.suctionHdrX2} label="SUCTION HEADER" color="#f97316" />
        <text x={L.suctionHdrX1 - 2} y={L.suctionHdrY + 12} textAnchor="end" fill="#f97316" fontSize={9} fontWeight="bold">
          {suctionHeaderPressure.toFixed(0)} PSI
        </text>

        {/* Title */}
        <text x={L.W / 2} y={14} textAnchor="middle" fill="#444" fontSize={10} fontWeight="bold" letterSpacing="3">
          SITE OVERVIEW — PAD OPTIMIZATION
        </text>

        {/* Legend */}
        <g transform={`translate(${L.W - 145}, ${L.H - 50})`}>
          <rect x={0} y={0} width={135} height={45} rx={4} fill="#0a0a14" stroke="#222" strokeWidth={0.5} />
          <text x={67} y={11} textAnchor="middle" fill="#555" fontSize={7} fontWeight="bold">LEGEND</text>
          <line x1={8} y1={20} x2={28} y2={20} stroke="#22c55e" strokeWidth={2} />
          <text x={33} y={23} fill="#777" fontSize={6}>Gas / Injection</text>
          <line x1={8} y1={29} x2={28} y2={29} stroke="#8B6914" strokeWidth={2} />
          <text x={33} y={32} fill="#777" fontSize={6}>Oil / Production</text>
          <line x1={8} y1={38} x2={28} y2={38} stroke="#E8200C" strokeWidth={2} />
          <text x={33} y={41} fill="#777" fontSize={6}>Alarm / Fault</text>
        </g>
      </svg>
    </div>
  )
}

// ======== Layout ========
function computeLayout(nc, nw) {
  const W = 1100, H = 700, M = 50

  // Vertical positions — top to bottom
  const prodHdrY = 35       // Production header (very top)
  const scrubY = 55         // Scrubber right of center
  const wellY = 120         // Wells
  const chokeY = 195        // Choke valves below wells
  const fmY = 225           // Flow meters
  const dischHdrY = 260     // Discharge header
  // -- gap --
  const compY = 310         // Compressors (center of loop)
  // -- suction system below compressors --
  const suctionHdrY = 420   // Suction header
  const witchY = 450        // Witch's hats
  const scvY = 475          // Suction control valves

  // Recirc turn Y
  const recircTurnY = suctionHdrY - 20

  // Well positions
  const wellW = 80
  const wellSpacing = Math.min(110, (W - M * 2 - wellW) / Math.max(nw - 1, 1))
  const wellStartX = (W - (nw - 1) * wellSpacing - wellW) / 2
  const wellX = i => wellStartX + i * wellSpacing

  // Compressor positions
  const compW = 70
  const compSpacing = Math.min(140, (W - M * 2 - compW) / Math.max(nc - 1, 1))
  const compStartX = (W - (nc - 1) * compSpacing - compW) / 2
  const compX = i => compStartX + i * compSpacing

  // Header extents
  const allWellCenters = Array.from({ length: nw }, (_, i) => wellX(i) + 40)
  const allCompCenters = Array.from({ length: nc }, (_, i) => compX(i) + 35)
  const allCenters = [...allWellCenters, ...allCompCenters]
  const minC = Math.min(...allCenters) - 30
  const maxC = Math.max(...allCenters) + 30

  const prodHdrX1 = minC
  const prodHdrX2 = maxC
  const dischHdrX1 = minC
  const dischHdrX2 = maxC
  const suctionHdrX1 = Math.min(...allCompCenters) - 30
  const suctionHdrX2 = Math.max(...allCompCenters) + 30
  const suctionHdrCX = (suctionHdrX1 + suctionHdrX2) / 2

  // Scrubber position — right of center
  const scrubX = W / 2 - 50
  // Gas junction and sales
  const gasJuncX = W / 2 + 100
  const salesX = W - 130

  return {
    W, H, M,
    prodHdrY, scrubY, wellY, chokeY, fmY, dischHdrY,
    compY, suctionHdrY, witchY, scvY, recircTurnY,
    wellX, compX,
    prodHdrX1, prodHdrX2, dischHdrX1, dischHdrX2,
    suctionHdrX1, suctionHdrX2, suctionHdrCX,
    scrubX, gasJuncX, salesX,
  }
}

// ======== SVG Primitives ========

function HdrPipe({ x1, y, x2, label, color }) {
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={5} opacity={0.3} />
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={2.5}
        strokeDasharray="6 4" className="flow-line-animated" style={{ '--flow-speed': '2s' }} />
      <text x={x1 - 4} y={y - 5} textAnchor="end" fill={color} fontSize={7} fontWeight="bold" opacity={0.8}>{label}</text>
    </g>
  )
}

function AnimPipe({ points, rate, color }) {
  if (!points || points.length < 2) return null
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const on = rate > 0.01
  const w = on ? 1 + rate * 2 : 0.7
  const spd = on ? Math.max(0.4, 3 - rate * 2.5) : 0
  return <path d={d} fill="none" stroke={on ? color : '#222'} strokeWidth={w}
    strokeLinecap="round" strokeLinejoin="round"
    className={on ? 'flow-line-animated' : 'flow-line-static'}
    style={on ? { '--flow-speed': `${spd}s` } : undefined} />
}

function Well({ x, y, well, alarmed, pri }) {
  const bc = alarmed ? '#E8200C' : '#22c55e'
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={40} y={-6} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">{well.name}</text>
      <text x={40} y={3} textAnchor="middle" fill="#777" fontSize={7}>Priority {pri}</text>
      <rect x={5} y={8} width={70} height={42} rx={3} fill="#0d0d18" stroke={bc} strokeWidth={alarmed ? 2 : 1} />
      {alarmed && <rect x={5} y={8} width={70} height={42} rx={3} fill="#E8200C" opacity={0.12} />}
      {/* Wellbore squiggles */}
      <path d="M 25 15 L 25 22 L 22 26 L 28 30 L 22 34 L 28 38 L 25 40 L 25 46" stroke="#555" strokeWidth={1.2} fill="none" />
      <path d="M 55 15 L 55 22 L 52 26 L 58 30 L 52 34 L 58 38 L 55 40 L 55 46" stroke="#555" strokeWidth={1.2} fill="none" />
      <text x={40} y={58} textAnchor="middle" fill={bc} fontSize={7} fontWeight="bold">{well.actualRate.toFixed(0)} MCFD</text>
      <text x={40} y={66} textAnchor="middle" fill="#666" fontSize={6}>{well.productionBoe.toFixed(0)} BOE/d</text>
    </g>
  )
}

function Valve({ x, y, openPct, label, alarmed }) {
  const c = alarmed ? '#E8200C' : openPct > 80 ? '#22c55e' : openPct > 30 ? '#eab308' : '#E8200C'
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points="-6,-6 0,0 -6,6" fill={c} opacity={0.8} />
      <polygon points="6,-6 0,0 6,6" fill={c} opacity={0.8} />
      <line x1={0} y1={-6} x2={0} y2={6} stroke={c} strokeWidth={1.5} />
      <text x={10} y={-1} fill="#888" fontSize={6}>{label}</text>
      <text x={10} y={7} fill={c} fontSize={6} fontWeight="bold">{openPct.toFixed(0)}%</text>
    </g>
  )
}

function FM({ x, y, value }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={0} cy={0} r={9} fill="#0d0d18" stroke="#3b82f6" strokeWidth={1} />
      <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fill="#3b82f6" fontSize={5} fontWeight="bold">FM</text>
      <text x={13} y={3} fill="#aaa" fontSize={6} fontWeight="bold">{value.toFixed(0)}</text>
    </g>
  )
}

function WitchHat({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon points="-7,7 0,-7 7,7" fill="none" stroke="#f97316" strokeWidth={1} />
      <line x1={-4} y1={3} x2={4} y2={3} stroke="#f97316" strokeWidth={0.5} />
      <line x1={-2} y1={0} x2={2} y2={0} stroke="#f97316" strokeWidth={0.5} />
    </g>
  )
}

function Scrubber({ x, y, pressure, level, levelColor, alarmed }) {
  const w = 100, h = 55
  const bc = alarmed ? '#E8200C' : '#777'
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={6} fill="#0d0d18" stroke={bc} strokeWidth={alarmed ? 2 : 1.5} />
      {alarmed && <rect x={0} y={0} width={w} height={h} rx={6} fill="#E8200C" opacity={0.12} />}
      <rect x={2} y={h - (h * level / 100)} width={w - 4} height={h * level / 100 - 2} rx={4} fill={levelColor} opacity={0.2} />
      <text x={w/2} y={14} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="bold">HP SCRUBBER</text>
      <text x={w/2} y={24} textAnchor="middle" fill="#ccc" fontSize={7} fontWeight="bold">SEPARATOR</text>
      <text x={w/2} y={36} textAnchor="middle" fill="#f97316" fontSize={10} fontWeight="bold">{pressure.toFixed(0)} PSI</text>
      <text x={w/2} y={48} textAnchor="middle" fill={levelColor} fontSize={8} fontWeight="bold">LVL {level.toFixed(0)}%</text>
    </g>
  )
}

function Comp({ x, y, comp, alarmed }) {
  const w = 70, h = 55
  const running = comp.status === 'running' || comp.status === 'locked_out_running'
  const bc = alarmed ? '#E8200C' : running ? '#22c55e' : '#555'
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={0} y={0} width={w} height={h} rx={4} fill="#0d0d18" stroke={bc} strokeWidth={alarmed ? 2 : 1.5} />
      {alarmed && <rect x={0} y={0} width={w} height={h} rx={4} fill="#E8200C" opacity={0.12} />}
      <circle cx={12} cy={12} r={4} fill={bc} />
      <text x={22} y={15} fill="#fff" fontSize={10} fontWeight="bold">{comp.name}</text>
      <text x={w - 4} y={15} textAnchor="end" fill={bc} fontSize={6} fontWeight="bold">
        {alarmed ? 'ALARM' : running ? 'RUN' : 'STOP'}
      </text>
      {running ? (
        <>
          <text x={5} y={28} fill="#888" fontSize={6}>RPM {comp.rpm.toFixed(0)}</text>
          <text x={5} y={37} fill="#888" fontSize={6}>Load {comp.loadPct.toFixed(0)}%</text>
          <text x={5} y={46} fill="#888" fontSize={6}>Suct {comp.suctionPsi.toFixed(0)} PSI</text>
          <rect x={5} y={49} width={w-10} height={3} rx={1} fill="#111" />
          <rect x={5} y={49} width={Math.max(0,(w-10)*(comp.loadPct/100))} height={3} rx={1}
            fill={comp.loadPct > 90 ? '#E8200C' : comp.loadPct > 70 ? '#eab308' : '#22c55e'} />
        </>
      ) : (
        <text x={w/2} y={38} textAnchor="middle" fill={bc} fontSize={9} opacity={0.7}>
          {comp.personnelLockout ? 'LOCKED' : 'OFF'}
        </text>
      )}
    </g>
  )
}
