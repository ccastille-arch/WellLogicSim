import CompressorNode from './CompressorNode'
import WellNode from './WellNode'
import ValveIcon from './ValveIcon'
import EquipmentNode from './EquipmentNode'
import FlowLine from './FlowLine'

// Brownfield layout:
// Wells â†’ Prod Header â†’ Scrubber â†’ (Oil Tank + Gas) â†’ Suction Controllers â†’ Compressors â†’ Inj Header â†’ Wells
// Also: excess gas â†’ Sales Line

export default function BrownfieldDiagram({ state }) {
  const { compressors, wells, totalAvailableGas, maxGasCapacity } = state
  const nc = compressors.length
  const nw = wells.length

  const svgW = 1000
  const svgH = 620
  const margin = 30

  // Vertical positions â€” left to right flow with recycle
  const wellY = 40
  const prodHeaderY = 120
  const scrubberY = 170
  const gasPathY = 240
  const suctionValveY = 290
  const compressorY = 320
  const injHeaderY = 420
  const wellBottomY = 460

  // Wells horizontal positions (at top AND bottom)
  const wellW = 80
  const wellSpacing = Math.min(100, (svgW - margin * 2 - wellW) / Math.max(nw - 1, 1))
  const wellStartX = (svgW - (nw - 1) * wellSpacing - wellW) / 2

  // Compressors horizontal positions
  const compW = 100
  const compSpacing = Math.min(140, (svgW - margin * 2 - compW) / Math.max(nc - 1, 1))
  const compStartX = (svgW - (nc - 1) * compSpacing - compW) / 2

  // Headers
  const prodHeaderX1 = wellStartX - 10
  const prodHeaderX2 = wellStartX + (nw - 1) * wellSpacing + wellW + 10
  const injHeaderX1 = Math.min(compStartX, wellStartX) - 10
  const injHeaderX2 = Math.max(compStartX + (nc - 1) * compSpacing + compW, wellStartX + (nw - 1) * wellSpacing + wellW) + 10

  const totalDesired = wells.reduce((sum, w) => sum + w.desiredRate, 0)
  const gasFlow = maxGasCapacity > 0 ? totalAvailableGas / maxGasCapacity : 0

  // Oil tank and sales line positions
  const scrubberCX = svgW / 2
  const oilTankX = svgW / 2 + 120
  const salesLineX = svgW / 2 + 120
  const wellLogicX = svgW / 2 - 150

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="grid-bf" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f1f1f" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={svgW} height={svgH} fill="url(#grid-bf)" />

      {/* === FLOW LINES === */}

      {/* Wells (top) â†’ Production Header */}
      {wells.map((w, i) => {
        const wx = wellStartX + i * wellSpacing + wellW / 2
        const flow = w.productionBoe > 0 ? w.productionBoe / (w.baseProduction || 1) : 0
        return (
          <FlowLine
            key={`w-ph${i}`}
            points={[[wx, wellY + 60], [wx, prodHeaderY + 6]]}
            flowRate={Math.min(1, flow)}
            color="#8B6914"
          />
        )
      })}

      {/* Production Header line */}
      <line
        x1={prodHeaderX1} y1={prodHeaderY + 6}
        x2={prodHeaderX2} y2={prodHeaderY + 6}
        stroke="#8B6914" strokeWidth={3} opacity={0.6}
      />
      <text x={prodHeaderX1 - 2} y={prodHeaderY + 10} fill="#8B6914" fontSize={8} fontFamily="Arial" textAnchor="end" opacity={0.7}>
        PROD HDR
      </text>

      {/* Production Header â†’ Scrubber */}
      <FlowLine
        points={[[scrubberCX, prodHeaderY + 6], [scrubberCX, scrubberY]]}
        flowRate={0.6}
        color="#8B6914"
      />

      {/* Scrubber â†’ Oil Tank */}
      <FlowLine
        points={[[scrubberCX + 55, scrubberY + 15], [oilTankX, scrubberY + 15], [oilTankX, scrubberY + 30]]}
        flowRate={0.5}
        color="#8B6914"
      />

      {/* Scrubber â†’ Gas path (down to suction controllers) */}
      <FlowLine
        points={[[scrubberCX, scrubberY + 30], [scrubberCX, gasPathY + 6]]}
        flowRate={gasFlow}
        color="#22c55e"
      />

      {/* Gas split line */}
      <line
        x1={Math.min(compStartX, scrubberCX - 30)} y1={gasPathY + 6}
        x2={salesLineX + 50} y2={gasPathY + 6}
        stroke="#22c55e" strokeWidth={2} opacity={0.4}
      />
      <text x={Math.min(compStartX, scrubberCX - 30) - 2} y={gasPathY + 10} fill="#22c55e" fontSize={8} fontFamily="Arial" textAnchor="end" opacity={0.7}>
        GAS
      </text>

      {/* Gas â†’ Sales Line */}
      <FlowLine
        points={[[salesLineX, gasPathY + 6], [salesLineX, gasPathY - 20]]}
        flowRate={0.3}
        color="#22c55e"
      />

      {/* Gas â†’ each compressor via suction controllers */}
      {compressors.map((c, i) => {
        const cx = compStartX + i * compSpacing + compW / 2
        const flow = c.status === 'running' ? c.loadPct / 100 : 0
        return (
          <FlowLine
            key={`gas-sc${i}`}
            points={[[cx, gasPathY + 6], [cx, suctionValveY - 8]]}
            flowRate={flow}
            color="#22c55e"
          />
        )
      })}

      {/* Suction controller â†’ compressor */}
      {compressors.map((c, i) => {
        const cx = compStartX + i * compSpacing + compW / 2
        const flow = c.status === 'running' ? c.loadPct / 100 : 0
        return (
          <FlowLine
            key={`sc-c${i}`}
            points={[[cx, suctionValveY + 8], [cx, compressorY]]}
            flowRate={flow}
            color="#22c55e"
          />
        )
      })}

      {/* Compressor â†’ injection header */}
      {compressors.map((c, i) => {
        const cx = compStartX + i * compSpacing + compW / 2
        const flow = c.status === 'running' ? c.loadPct / 100 : 0
        return (
          <FlowLine
            key={`c-ih${i}`}
            points={[[cx, compressorY + 70], [cx, injHeaderY + 6]]}
            flowRate={flow}
            color="#22c55e"
          />
        )
      })}

      {/* Injection Header line */}
      <line
        x1={injHeaderX1} y1={injHeaderY + 6}
        x2={injHeaderX2} y2={injHeaderY + 6}
        stroke="#22c55e" strokeWidth={3} opacity={0.6}
      />
      <text x={injHeaderX1 - 2} y={injHeaderY + 10} fill="#22c55e" fontSize={8} fontFamily="Arial" textAnchor="end" opacity={0.7}>
        INJ HDR
      </text>

      {/* Injection Header â†’ Wells (bottom connection â€” injection into well) */}
      {wells.map((w, i) => {
        const wx = wellStartX + i * wellSpacing + wellW / 2
        const flow = totalDesired > 0 ? w.actualRate / (w.desiredRate || 1) : 0
        const headerX = Math.max(injHeaderX1, Math.min(injHeaderX2, wx))
        return (
          <FlowLine
            key={`ih-wb${i}`}
            points={[[headerX, injHeaderY + 6], [wx, injHeaderY + 6], [wx, wellBottomY]]}
            flowRate={Math.min(1, flow)}
            color="#22c55e"
          />
        )
      })}

      {/* Well bottom â†’ well top recycle indicators (dashed vertical) */}
      {wells.map((w, i) => {
        const wx = wellStartX + i * wellSpacing + wellW / 2 + 20
        return (
          <line
            key={`recycle-${i}`}
            x1={wx} y1={wellBottomY + 20}
            x2={wx} y2={wellBottomY + 30}
            stroke="#22c55e" strokeWidth={1} opacity={0.3} strokeDasharray="2 3"
          />
        )
      })}

      {/* === EQUIPMENT NODES === */}

      {/* Wells (top â€” production) */}
      {wells.map((w, i) => (
        <WellNode
          key={w.id}
          well={w}
          x={wellStartX + i * wellSpacing}
          y={wellY}
          width={wellW}
          height={60}
        />
      ))}

      {/* Scrubber */}
      <EquipmentNode
        x={scrubberCX - 55} y={scrubberY}
        width={110} height={30}
        label="Scrubber / Separator"
        color="#8B6914"
      />

      {/* Oil Tank */}
      <EquipmentNode
        x={oilTankX - 40} y={scrubberY + 30}
        width={80} height={26}
        label="Oil Storage"
        color="#8B6914"
        icon="dashed"
      />

      {/* Sales Line */}
      <EquipmentNode
        x={salesLineX - 40} y={gasPathY - 46}
        width={80} height={26}
        label="Sales Line"
        color="#22c55e"
        icon="dashed"
      />

      {/* WellLogic Panel */}
      <EquipmentNode
        x={wellLogicX} y={suctionValveY - 8}
        width={110} height={32}
        label="Pad Logic"
        sublabel="Suction Controller Mgmt"
        color="#E8200C"
      />

      {/* Suction Controller valves */}
      {compressors.map((c, i) => {
        const cx = compStartX + i * compSpacing + compW / 2
        const openPct = c.status === 'running' ? c.loadPct : 0
        return (
          <ValveIcon
            key={`sc-${c.id}`}
            x={cx}
            y={suctionValveY}
            openPct={openPct}
            label={`SC${i + 1}`}
            size={10}
          />
        )
      })}

      {/* Compressors */}
      {compressors.map((c, i) => (
        <CompressorNode
          key={c.id}
          compressor={c}
          x={compStartX + i * compSpacing}
          y={compressorY}
          width={compW}
          height={70}
        />
      ))}

      {/* Well injection points at bottom */}
      {wells.map((w, i) => {
        const wx = wellStartX + i * wellSpacing
        return (
          <g key={`wb-${w.id}`}>
            <rect x={wx} y={wellBottomY} width={wellW} height={20} rx={3} fill="#2a2a2a" stroke="#333" strokeWidth={0.5} />
            <text x={wx + wellW / 2} y={wellBottomY + 13} fill="#888" fontSize={8} fontFamily="Arial" textAnchor="middle">
              {w.name} inj.
            </text>
          </g>
        )
      })}

      {/* Label */}
      <text x={margin} y={svgH - 10} fill="#333" fontSize={9} fontFamily="Arial">
        BROWNFIELD - Recycled Gas with Suction Controller Prioritization
      </text>
    </svg>
  )
}

