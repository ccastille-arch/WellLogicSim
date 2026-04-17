import CompressorNode from './CompressorNode'
import WellNode from './WellNode'
import ValveIcon from './ValveIcon'
import EquipmentNode from './EquipmentNode'
import FlowLine from './FlowLine'

// Greenfield layout:
// Gas Source â†’ WellLogic Panel â†’ Compressors â†’ Injection Header â†’ Chokes â†’ Wells â†’ Production Header â†’ Scrubber

export default function GreenfieldDiagram({ state }) {
  const { compressors, wells, totalAvailableGas, maxGasCapacity } = state
  const nc = compressors.length
  const nw = wells.length

  // Layout constants
  const svgW = 1000
  const svgH = 620
  const margin = 30

  // Row Y positions
  const gasSourceY = 20
  const wellLogicY = 70
  const compressorY = 130
  const injHeaderY = 220
  const valveY = 260
  const wellY = 300
  const prodHeaderY = 390
  const scrubberY = 440

  // Compressor horizontal positions
  const compW = 100
  const compSpacing = Math.min(140, (svgW - margin * 2 - compW) / Math.max(nc - 1, 1))
  const compStartX = (svgW - (nc - 1) * compSpacing - compW) / 2

  // Well horizontal positions
  const wellW = 80
  const wellSpacing = Math.min(100, (svgW - margin * 2 - wellW) / Math.max(nw - 1, 1))
  const wellStartX = (svgW - (nw - 1) * wellSpacing - wellW) / 2

  // Injection header spans from first to last compressor
  const injHeaderX1 = compStartX - 10
  const injHeaderX2 = compStartX + (nc - 1) * compSpacing + compW + 10

  // Production header spans from first to last well
  const prodHeaderX1 = wellStartX - 10
  const prodHeaderX2 = wellStartX + (nw - 1) * wellSpacing + wellW + 10

  const gasFlow = maxGasCapacity > 0 ? totalAvailableGas / maxGasCapacity : 0
  const totalDesired = wells.reduce((sum, w) => sum + w.desiredRate, 0)

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* Background grid */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1f1f1f" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={svgW} height={svgH} fill="url(#grid)" />

      {/* === FLOW LINES === */}

      {/* Gas Source â†’ WellLogic Panel */}
      <FlowLine
        points={[[svgW / 2, gasSourceY + 30], [svgW / 2, wellLogicY]]}
        flowRate={gasFlow}
        color="#22c55e"
      />

      {/* WellLogic Panel â†’ each compressor */}
      {compressors.map((c, i) => {
        const cx = compStartX + i * compSpacing + compW / 2
        const flow = c.status === 'running' ? gasFlow : 0
        return (
          <FlowLine
            key={`wl-c${i}`}
            points={[[svgW / 2, wellLogicY + 32], [svgW / 2, wellLogicY + 42], [cx, wellLogicY + 42], [cx, compressorY]]}
            flowRate={flow}
            color="#22c55e"
          />
        )
      })}

      {/* Each compressor â†’ injection header */}
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
      <text
        x={injHeaderX1 - 2} y={injHeaderY + 10}
        fill="#22c55e" fontSize={8} fontFamily="Arial" textAnchor="end" opacity={0.7}
      >
        INJ HDR
      </text>

      {/* Injection Header â†’ valve â†’ each well */}
      {wells.map((w, i) => {
        const wx = wellStartX + i * wellSpacing + wellW / 2
        const flow = totalDesired > 0 ? w.actualRate / (w.desiredRate || 1) : 0
        // Find nearest point on injection header
        const headerX = Math.max(injHeaderX1, Math.min(injHeaderX2, wx))
        return (
          <FlowLine
            key={`ih-w${i}`}
            points={[[headerX, injHeaderY + 6], [wx, injHeaderY + 6], [wx, valveY - 8]]}
            flowRate={Math.min(1, flow)}
            color="#22c55e"
          />
        )
      })}

      {/* Valve â†’ Well */}
      {wells.map((w, i) => {
        const wx = wellStartX + i * wellSpacing + wellW / 2
        const flow = totalDesired > 0 ? w.actualRate / (w.desiredRate || 1) : 0
        return (
          <FlowLine
            key={`v-w${i}`}
            points={[[wx, valveY + 8], [wx, wellY]]}
            flowRate={Math.min(1, flow)}
            color="#22c55e"
          />
        )
      })}

      {/* Each well â†’ production header */}
      {wells.map((w, i) => {
        const wx = wellStartX + i * wellSpacing + wellW / 2
        const flow = w.productionBoe > 0 ? w.productionBoe / (w.baseProduction || 1) : 0
        const headerX = Math.max(prodHeaderX1, Math.min(prodHeaderX2, wx))
        return (
          <FlowLine
            key={`w-ph${i}`}
            points={[[wx, wellY + 60], [wx, prodHeaderY + 6], [headerX, prodHeaderY + 6]]}
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
      <text
        x={prodHeaderX1 - 2} y={prodHeaderY + 10}
        fill="#8B6914" fontSize={8} fontFamily="Arial" textAnchor="end" opacity={0.7}
      >
        PROD HDR
      </text>

      {/* Production Header â†’ Scrubber */}
      <FlowLine
        points={[[svgW / 2, prodHeaderY + 6], [svgW / 2, scrubberY]]}
        flowRate={0.6}
        color="#8B6914"
      />

      {/* === EQUIPMENT NODES === */}

      {/* Gas Source */}
      <EquipmentNode
        x={svgW / 2 - 65} y={gasSourceY}
        width={130} height={30}
        label="Injection Gas Supply"
        color="#22c55e"
      />

      {/* WellLogic Panel */}
      <EquipmentNode
        x={svgW / 2 - 60} y={wellLogicY}
        width={120} height={32}
        label="Well Logic"
        sublabel="Gas Lift Controller"
        color="#D32028"
      />

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

      {/* Valves (electronic chokes) */}
      {wells.map((w, i) => {
        const wx = wellStartX + i * wellSpacing + wellW / 2
        return (
          <ValveIcon
            key={`valve-${w.id}`}
            x={wx}
            y={valveY}
            openPct={w.chokePosition}
            size={10}
          />
        )
      })}

      {/* Wells */}
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

      {/* Scrubber / Separator */}
      <EquipmentNode
        x={svgW / 2 - 55} y={scrubberY}
        width={110} height={30}
        label="Scrubber / Separator"
        color="#8B6914"
      />

      {/* Labels */}
      <text x={margin} y={svgH - 10} fill="#333" fontSize={9} fontFamily="Arial">
        GREENFIELD - Standard Well Logic Deployment
      </text>
    </svg>
  )
}

