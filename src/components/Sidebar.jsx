import { useState, useCallback, useRef } from 'react'
import { GAS_SUPPLY_UI_MAX } from '../engine/simulation'

export default function Sidebar({
  state,
  onCompressorStatus,
  onWellRate,
  onWellPriorities,
  onTotalGas,
  onHuntSequence,
  onReset,
}) {
  const { compressors, wells, totalAvailableGas, maxGasCapacity, huntSequenceEnabled } = state
  const sortedWells = [...wells].sort((a, b) => a.priority - b.priority)

  return (
    <div className="w-[280px] shrink-0 bg-sc-dark border-r border-sc-charcoal-light flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto sidebar-scroll p-3 space-y-4">

        {/* Total Gas Supply */}
        <Section title="Gas Supply">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-sc-gray">Total Available</span>
            <span className="text-xs font-bold text-white">{totalAvailableGas.toFixed(0)} MCFD</span>
          </div>
          <input
            type="range"
            min={0}
            max={GAS_SUPPLY_UI_MAX}
            step={10}
            value={totalAvailableGas}
            onChange={e => onTotalGas(Number(e.target.value))}
            className="w-full accent-sc-red"
          />
          <div className="flex justify-between text-[10px] text-sc-gray">
            <span>0</span>
            <span>{GAS_SUPPLY_UI_MAX.toLocaleString()} MCFD</span>
          </div>
        </Section>

        {/* Compressor Controls */}
        <Section title="Compressors">
          {compressors.map(c => (
            <CompressorRow
              key={c.id}
              compressor={c}
              onStatusChange={onCompressorStatus}
            />
          ))}
        </Section>

        {/* Well Priority */}
        <Section title="Well Priority">
          <p className="text-[10px] text-sc-gray mb-2">Drag to reorder. Top = highest priority.</p>
          <PriorityList wells={sortedWells} onReorder={onWellPriorities} />
        </Section>

        {/* Well Injection Rates */}
        <Section title="Injection Rates">
          {sortedWells.map(w => (
            <WellRateSlider key={w.id} well={w} onChange={onWellRate} />
          ))}
        </Section>

        {/* Hunt Sequence */}
        <Section title="Hunt Sequence">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className={`relative w-9 h-5 rounded-full transition-colors ${
                huntSequenceEnabled ? 'bg-sc-red' : 'bg-sc-charcoal-light'
              }`}
              onClick={() => onHuntSequence(!huntSequenceEnabled)}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  huntSequenceEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="text-xs text-sc-light">
              {huntSequenceEnabled ? 'Active' : 'Disabled'}
            </span>
          </label>
          {huntSequenceEnabled && (
            <p className="text-[10px] text-sc-gray mt-1">
              Wells are searching for production optimum (±10% rate oscillation).
            </p>
          )}
        </Section>
      </div>

      {/* Reset */}
      <div className="p-3 border-t border-sc-charcoal-light">
        <button
          onClick={onReset}
          className="w-full py-2 text-xs font-bold uppercase tracking-wider text-sc-gray border border-sc-charcoal-light rounded hover:border-sc-red hover:text-white transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3
        className="text-[10px] font-bold uppercase tracking-wider text-sc-red mb-2"
        style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

function CompressorRow({ compressor, onStatusChange }) {
  const { id, name, status, loadPct } = compressor
  const statusColors = {
    running: 'bg-sc-green',
    tripped: 'bg-sc-red',
    offline: 'bg-sc-gray',
  }

  return (
    <div className="flex items-center gap-2 mb-1.5 py-1 px-2 bg-sc-charcoal rounded">
      <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      <span className="text-xs font-bold text-white flex-1">{name}</span>
      <span className="text-[10px] text-sc-gray w-10 text-right">
        {status === 'running' ? `${loadPct.toFixed(0)}%` : '—'}
      </span>
      <select
        value={status}
        onChange={e => onStatusChange(id, e.target.value)}
        className="text-[10px] bg-sc-dark text-sc-light border border-sc-charcoal-light rounded px-1 py-0.5"
      >
        <option value="running">Running</option>
        <option value="tripped">Tripped</option>
        <option value="offline">Offline</option>
      </select>
    </div>
  )
}

function PriorityList({ wells, onReorder }) {
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  const handleDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    setOverIdx(idx)
  }

  const handleDrop = (e, dropIdx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === dropIdx) return
    const ids = wells.map(w => w.id)
    const [moved] = ids.splice(dragIdx, 1)
    ids.splice(dropIdx, 0, moved)
    onReorder(ids)
    setDragIdx(null)
    setOverIdx(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setOverIdx(null)
  }

  return (
    <div className="space-y-0.5">
      {wells.map((w, idx) => (
        <div
          key={w.id}
          draggable
          onDragStart={e => handleDragStart(e, idx)}
          onDragOver={e => handleDragOver(e, idx)}
          onDrop={e => handleDrop(e, idx)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-2 py-1 px-2 rounded cursor-grab active:cursor-grabbing text-xs transition-colors ${
            dragIdx === idx ? 'opacity-50' : ''
          } ${overIdx === idx && dragIdx !== idx ? 'border-t-2 border-sc-red' : 'border-t-2 border-transparent'} bg-sc-charcoal hover:bg-sc-charcoal-light`}
        >
          <span className="text-sc-gray font-bold w-4 text-center text-[10px]">{idx + 1}</span>
          <span className="text-[10px] text-sc-gray">⠿</span>
          <span className="font-bold text-white">{w.name}</span>
          <span className={`ml-auto text-[10px] ${w.isAtTarget ? 'text-sc-green' : 'text-sc-yellow'}`}>
            {w.actualRate.toFixed(0)} MCFD
          </span>
        </div>
      ))}
    </div>
  )
}

function WellRateSlider({ well, onChange }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] font-bold text-white">{well.name}</span>
        <span className="text-[10px] text-sc-gray">{well.desiredRate} MCFD</span>
      </div>
      <input
        type="range"
        min={0}
        max={1600}
        step={10}
        value={well.desiredRate}
        onChange={e => onChange(well.id, Number(e.target.value))}
        className="w-full accent-sc-red"
        style={{ height: 4 }}
      />
    </div>
  )
}
