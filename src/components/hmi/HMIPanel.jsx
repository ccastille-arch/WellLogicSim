import { useState } from 'react'

// Main HMI Dashboard — matches actual WellLogic DE-4000 panel
// White/light cards on dark background, matching real SCADA HMI

export default function HMIPanel({
  state,
  onCompressorStatus,
  onWellRate,
  onWellPriorities,
  onTotalGas,
  onHuntSequence,
  onReset,
  onChokeManualSP,
  onChokeMode,
  onCompressorMode,
}) {
  const { wells, compressors, flowRateMode, alarms } = state
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = 5

  return (
    <div className="flex-1 flex flex-col bg-[#2c2c30] overflow-hidden">
      {/* Page indicator — matches actual panel "1 / 5" with circles and arrows */}
      <PageNav currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {/* Main content area */}
      <div className="flex-1 overflow-auto px-5 py-3">
        {currentPage === 0 && (
          <DashboardPage
            wells={wells}
            compressors={compressors}
            flowRateMode={flowRateMode}
            state={state}
            onChokeManualSP={onChokeManualSP}
            onChokeMode={onChokeMode}
          />
        )}
        {currentPage === 1 && (
          <PriorityPage wells={wells} onWellPriorities={onWellPriorities} onWellRate={onWellRate} />
        )}
        {currentPage === 2 && (
          <SuctionPage state={state} onTotalGas={onTotalGas} />
        )}
        {currentPage === 3 && (
          <HuntSequencePage wells={wells} huntEnabled={state.huntSequenceEnabled} onHuntSequence={onHuntSequence} />
        )}
        {currentPage === 4 && (
          <AlarmsPage alarms={alarms} state={state} />
        )}
      </div>
    </div>
  )
}

function PageNav({ currentPage, totalPages, onPageChange }) {
  return (
    <div className="flex items-center justify-center gap-3 py-2.5 shrink-0" data-tutorial="page-nav">
      <button
        onClick={() => onPageChange(Math.max(0, currentPage - 1))}
        className="text-white text-xl px-3 hover:text-[#ccc] leading-none"
      >←</button>
      <span className="text-white text-sm font-bold tracking-wide">{currentPage + 1} / {totalPages}</span>
      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`w-5 h-5 rounded-full border-2 transition-colors ${
            i === currentPage
              ? 'bg-white border-white'
              : 'border-[#777] bg-transparent hover:border-[#aaa]'
          }`}
        />
      ))}
      <button
        onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
        className="text-white text-xl px-3 hover:text-[#ccc] leading-none"
      >→</button>
    </div>
  )
}

// ============================================================================
// Page 1: Dashboard — matches actual DE-4000 panel exactly
// ============================================================================
function DashboardPage({ wells, compressors, flowRateMode, state, onChokeManualSP, onChokeMode }) {
  // Only show first 4 wells on main dashboard page (matching actual panel which shows 4 wells)
  // If more wells, they appear on subsequent pages
  const displayWells = wells.slice(0, Math.min(wells.length, 10))

  return (
    <div className="space-y-2.5">
      {/* Wellhead Choke Controllers — one row per well, white cards on dark bg */}
      {displayWells.map(w => (
        <WellChokeRow key={w.id} well={w} onManualSP={onChokeManualSP} onMode={onChokeMode} />
      ))}

      {/* Compressor Run Status + Estop indicators — gray cards in a row */}
      <div className="flex flex-wrap gap-2.5 mt-3 items-stretch" data-tutorial="compressor-status">
        {compressors.map(c => (
          <CompressorStatusCard key={c.id} compressor={c} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2.5 items-stretch" data-tutorial="estop-indicators">
        <StatusIndicatorCard label="Customer Remote" sublabel="Estop" active={true} />
        <StatusIndicatorCard label="Local Estop" sublabel="" active={true} />
      </div>

      {/* Flow value display — white box matching actual panel bottom area */}
      <div className="flex justify-center mt-2" data-tutorial="flow-rate-mode">
        <div className="bg-white rounded-lg border border-[#aaa] px-8 py-3 min-w-[250px] text-center">
          <div className="text-[10px] text-[#555] font-bold mb-0.5">FlowRate_Local_Remote</div>
          <div
            className="text-2xl font-bold rounded-md py-1.5 px-6 mt-1"
            style={{
              fontFamily: "'Arial Black', Arial, sans-serif",
              background: flowRateMode === 'local'
                ? 'linear-gradient(to bottom, #b3e5fc, #4fc3f7)'
                : 'linear-gradient(to bottom, #c8e6c9, #66bb6a)',
              color: flowRateMode === 'local' ? '#0d47a1' : '#1b5e20',
            }}
          >
            {flowRateMode === 'local' ? 'Local' : 'Remote'}
          </div>
        </div>
      </div>
    </div>
  )
}

// Individual well choke controller row — matches actual panel layout:
// [↓ VALUE ↑] [MODE] [WellHead Control #X AO VALUE]
// Expanded: shows injection pressure, diff pressure, temp from Klondike-calibrated engine
function WellChokeRow({ well, onManualSP, onMode }) {
  const { id, chokeManualSP, chokeMode, chokeAO, injectionPressure, diffPressure, injectionTemp, actualRate, desiredRate } = well
  const [expanded, setExpanded] = useState(false)

  const accuracy = desiredRate > 0 ? (actualRate / desiredRate) * 100 : 100
  const accuracyColor = accuracy >= 95 ? '#22c55e' : accuracy >= 80 ? '#eab308' : '#E8200C'

  return (
    <div data-tutorial={`choke-row-${id}`}>
      <div className="flex gap-2.5 items-stretch" style={{ minHeight: 56 }}>
        {/* Manual SP card — WHITE background, black text, ↓ VALUE ↑ */}
        <div className="flex-1 bg-white rounded-lg border border-[#999] flex items-center min-w-0" data-tutorial={`choke-manual-${id}`}>
          <button
            onClick={() => onManualSP?.(id, Math.max(0, chokeManualSP - 1))}
            className="text-black text-xl px-3 py-2 hover:bg-[#eee] rounded-l-lg h-full flex items-center"
          >↓</button>
          <div className="flex-1 text-center">
            <div className="text-[8px] text-[#666] leading-tight truncate px-1">
              WellHead Choke Ctrl {id + 1}_Manual...
            </div>
            <div className="text-3xl font-bold text-black leading-none" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
              {Math.round(chokeManualSP)}
            </div>
          </div>
          <button
            onClick={() => onManualSP?.(id, Math.min(100, chokeManualSP + 1))}
            className="text-black text-xl px-3 py-2 hover:bg-[#eee] rounded-r-lg h-full flex items-center"
          >↑</button>
        </div>

        {/* Mode card — WHITE background, shows Auto or Manual */}
        <div
          data-tutorial={`choke-mode-${id}`}
          className="w-[180px] bg-white rounded-lg border border-[#999] flex flex-col items-center justify-center cursor-pointer hover:bg-[#f5f5f5]"
          onClick={() => onMode?.(id, chokeMode === 'auto' ? 'manual' : 'auto')}
        >
          <div className="text-[8px] text-[#666] leading-tight">
            WellHead Choke Ctrl {id + 1}_Mode
          </div>
          <div className="text-2xl font-bold text-black" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
            {chokeMode === 'auto' ? 'Auto' : 'Manual'}
          </div>
        </div>

        {/* AO (Analog Output) card — GRAY background, right-aligned value */}
        <div className="w-[170px] bg-[#c8c8c8] rounded-lg border border-[#999] px-3 flex flex-col justify-center" data-tutorial={`choke-ao-${id}`}>
          <div className="text-[8px] text-[#444] leading-tight">
            WellHead Control #{id + 1} AO
          </div>
          <div className="text-3xl font-bold text-black text-right leading-none" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
            {Math.round(chokeAO)}
          </div>
        </div>

        {/* Expand toggle — shows wellhead parameters */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-8 bg-[#2a2a30] rounded-lg border border-[#555] flex items-center justify-center text-[#888] hover:text-white text-xs"
          title="Toggle wellhead parameters"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded wellhead parameters row — Klondike-calibrated live values */}
      {expanded && (
        <div className="flex gap-2 mt-1 pl-1">
          <WellheadParam label="Inj Flow" value={actualRate?.toFixed(0)} unit="MCFD" color={accuracyColor} />
          <WellheadParam label="Static Press" value={injectionPressure?.toFixed(0)} unit="PSI" color="#eab308" />
          <WellheadParam label="Diff Press" value={diffPressure?.toFixed(1)} unit="PSI"
            color={diffPressure > 200 ? '#E8200C' : '#4fc3f7'} />
          <WellheadParam label="Inj Temp" value={injectionTemp?.toFixed(1)} unit="°F"
            color={injectionTemp > 150 ? '#E8200C' : '#a78bfa'} />
          <WellheadParam label="Accuracy" value={accuracy?.toFixed(1)} unit="%" color={accuracyColor} />
        </div>
      )}
    </div>
  )
}

function WellheadParam({ label, value, unit, color }) {
  return (
    <div className="flex-1 bg-[#1a1a22] rounded border border-[#2a2a3a] px-2 py-1">
      <div className="text-[8px] text-[#666] uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-[13px] font-bold" style={{ color, fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {value ?? '—'}
        </span>
        <span className="text-[8px] text-[#555]">{unit}</span>
      </div>
    </div>
  )
}

// Compressor run status — gray card with green indicator circle
function CompressorStatusCard({ compressor }) {
  const { name, status } = compressor
  const isRunning = status === 'running' || status === 'locked_out_running'

  return (
    <div className="bg-[#c8c8c8] rounded-lg border border-[#999] px-3 py-2 flex items-center gap-3 min-w-[150px]">
      <div className="flex-1">
        <div className="text-[9px] text-[#444] font-bold leading-tight">Run Status</div>
        <div className="text-[10px] text-[#333]">{name.replace('C', 'Compressor #')}</div>
      </div>
      <div
        className="w-5 h-5 rounded-full shrink-0"
        style={{
          backgroundColor: isRunning ? '#22c55e' : '#888',
          boxShadow: isRunning ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
        }}
      />
    </div>
  )
}

// Generic status indicator card (for Customer Remote Estop, Local Estop)
function StatusIndicatorCard({ label, sublabel, active }) {
  return (
    <div className="bg-[#c8c8c8] rounded-lg border border-[#999] px-3 py-2 flex items-center gap-3 min-w-[150px]">
      <div className="flex-1">
        <div className="text-[9px] text-[#444] font-bold leading-tight">{label}</div>
        {sublabel && <div className="text-[10px] text-[#333]">{sublabel}</div>}
      </div>
      <div
        className="w-5 h-5 rounded-full shrink-0"
        style={{
          backgroundColor: active ? '#22c55e' : '#E8200C',
          boxShadow: active ? '0 0 8px rgba(34,197,94,0.6)' : '0 0 8px rgba(232,32,12,0.6)',
        }}
      />
    </div>
  )
}

// ============================================================================
// Page 2: Priority & Injection Rates
// ============================================================================
function PriorityPage({ wells, onWellPriorities, onWellRate }) {
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const sortedWells = [...wells].sort((a, b) => a.priority - b.priority)

  const handleDrop = (e, dropIdx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === dropIdx) return
    const ids = sortedWells.map(w => w.id)
    const [moved] = ids.splice(dragIdx, 1)
    ids.splice(dropIdx, 0, moved)
    onWellPriorities(ids)
    setDragIdx(null)
    setOverIdx(null)
  }

  return (
    <div className="max-w-[700px]">
      <h3 className="text-xs font-bold text-[#E8200C] uppercase tracking-wider mb-3" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
        Well Priority & Injection Rates
      </h3>
      <p className="text-[10px] text-[#888] mb-3">Drag to reorder priority. Top = highest priority. Adjust injection rate per well.</p>
      <div className="space-y-1">
        {sortedWells.map((w, idx) => (
          <div
            key={w.id}
            draggable
            onDragStart={e => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move' }}
            onDragOver={e => { e.preventDefault(); setOverIdx(idx) }}
            onDrop={e => handleDrop(e, idx)}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
            className={`flex items-center gap-3 py-2 px-3 rounded bg-[#2a2a2e] border border-[#444] cursor-grab active:cursor-grabbing ${
              dragIdx === idx ? 'opacity-50' : ''
            } ${overIdx === idx && dragIdx !== idx ? 'border-t-2 border-t-[#E8200C]' : ''}`}
          >
            <span className="text-[#888] font-bold w-5 text-center text-sm">{idx + 1}</span>
            <span className="text-[10px] text-[#666]">⠿</span>
            <span className="text-sm font-bold text-white w-10">{w.name}</span>
            <input
              type="range" min={0} max={400} step={10}
              value={w.desiredRate}
              onChange={e => onWellRate(w.id, Number(e.target.value))}
              className="flex-1 accent-[#E8200C]"
              onClick={e => e.stopPropagation()}
            />
            <span className="text-[11px] text-white font-bold w-16 text-right">{w.desiredRate} MCFD</span>
            <span className={`text-[10px] w-16 text-right ${w.isAtTarget ? 'text-[#22c55e]' : 'text-[#eab308]'}`}>
              → {w.actualRate.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Page 3: Suction Header & Gas Supply
// ============================================================================
function SuctionPage({ state, onTotalGas }) {
  return (
    <div className="max-w-[600px] space-y-4">
      <h3 className="text-xs font-bold text-[#E8200C] uppercase tracking-wider mb-3" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
        Suction Header & Gas Supply
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <HMIValueDisplay label="Suction Header" value={state.suctionHeaderPressure.toFixed(1)} unit="PSI"
          color={state.suctionHeaderPressure > state.suctionTarget + state.suctionHighRange ? '#E8200C' : '#22c55e'} />
        <HMIValueDisplay label="Target Pressure" value={state.suctionTarget.toFixed(0)} unit="PSI" />
        <HMIValueDisplay label="Scrubber Pressure" value={state.scrubberPressure.toFixed(1)} unit="PSI" />
        <HMIValueDisplay label="Upper Limit" value={(state.suctionTarget + state.suctionHighRange).toFixed(0)} unit="PSI" />
        <HMIValueDisplay label="Lower Range" value={state.suctionLowRange.toFixed(0)} unit="PSI" />
        <HMIValueDisplay label="Sales Valve" value={state.salesValvePosition.toFixed(1)} unit="%"
          color={state.salesValvePosition > 10 ? '#eab308' : '#22c55e'} />
      </div>
      <div className="bg-[#2a2a2e] rounded border border-[#444] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-[#888]">Total Available Gas</span>
          <span className="text-sm font-bold text-white">{state.totalAvailableGas.toFixed(0)} MCFD</span>
        </div>
        <input type="range" min={0} max={state.maxGasCapacity} step={10}
          value={state.totalAvailableGas} onChange={e => onTotalGas(Number(e.target.value))} className="w-full accent-[#E8200C]" />
      </div>
      <div className="bg-[#2a2a2e] rounded border border-[#444] p-3">
        <div className="text-[10px] text-[#888] uppercase tracking-wider mb-2">Compressor Stagger Offsets</div>
        {state.compressors.map(c => (
          <div key={c.id} className="flex items-center justify-between text-[11px] py-0.5">
            <span className="text-[#aaa]">{c.name} Speed Auto Suction SP</span>
            <span className="text-white font-bold">{c.speedAutoSuctionSP.toFixed(0)} PSI</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HMIValueDisplay({ label, value, unit, color }) {
  return (
    <div className="bg-[#2a2a2e] rounded border border-[#444] p-2.5">
      <div className="text-[9px] text-[#888] uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-lg font-bold" style={{ color: color || '#fff', fontFamily: "'Arial Black', Arial, sans-serif" }}>{value}</span>
        <span className="text-[9px] text-[#888]">{unit}</span>
      </div>
    </div>
  )
}

// ============================================================================
// Page 4: Hunt Sequence
// ============================================================================
function HuntSequencePage({ wells, huntEnabled, onHuntSequence }) {
  return (
    <div className="max-w-[600px]">
      <h3 className="text-xs font-bold text-[#E8200C] uppercase tracking-wider mb-3" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
        Hunt Sequence
      </h3>
      <div className="flex items-center gap-3 mb-4 bg-[#2a2a2e] rounded border border-[#444] p-3">
        <div className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${huntEnabled ? 'bg-[#E8200C]' : 'bg-[#555]'}`}
          onClick={() => onHuntSequence(!huntEnabled)}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${huntEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
        </div>
        <span className="text-sm text-white">{huntEnabled ? 'Hunt Sequence Active' : 'Hunt Sequence Disabled'}</span>
      </div>
      {huntEnabled && (
        <div className="space-y-1">
          {wells.map(w => (
            <div key={w.id} className="flex items-center gap-3 bg-[#2a2a2e] rounded p-2 border border-[#444]">
              <span className="text-sm font-bold text-white w-10">{w.name}</span>
              <div className="flex-1 bg-[#1a1a1a] rounded h-3 overflow-hidden">
                <div className="h-full bg-[#f97316] transition-all" style={{ width: `${w.chokeAO}%` }} />
              </div>
              <span className={`text-[10px] w-20 text-right ${w.isHunting ? 'text-[#f97316] hunt-indicator' : 'text-[#888]'}`}>
                {w.isHunting ? 'HUNTING' : 'STEADY'}
              </span>
              <span className="text-[11px] text-white font-bold w-16 text-right">{w.actualRate.toFixed(0)} MCFD</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Page 5: Alarms
// ============================================================================
function AlarmsPage({ alarms, state }) {
  const allAlarms = [
    ...(alarms || []),
    ...(state.wellUnloadActive ? [{ type: 'warning', message: 'Well Unload Event Detected — Scrubber Pressure Spike' }] : []),
  ]
  return (
    <div className="max-w-[600px]">
      <h3 className="text-xs font-bold text-[#E8200C] uppercase tracking-wider mb-3" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
        Active Alarms
      </h3>
      {allAlarms.length === 0 ? (
        <div className="bg-[#2a2a2e] rounded border border-[#444] p-4 text-center">
          <span className="text-[#22c55e] text-sm">No Active Alarms</span>
        </div>
      ) : (
        <div className="space-y-1">
          {allAlarms.map((a, i) => (
            <div key={i} className={`flex items-center gap-2 rounded p-2.5 border ${
              a.type === 'critical' ? 'bg-[#E8200C]/20 border-[#E8200C]' :
              a.type === 'warning' ? 'bg-[#eab308]/10 border-[#eab308]' :
              'bg-[#3b82f6]/10 border-[#3b82f6]'
            }`}>
              <span className={`text-xs font-bold uppercase ${
                a.type === 'critical' ? 'text-[#E8200C]' : a.type === 'warning' ? 'text-[#eab308]' : 'text-[#3b82f6]'
              }`}>{a.type}</span>
              <span className="text-[11px] text-white">{a.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
