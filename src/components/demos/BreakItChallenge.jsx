import { useState, useEffect, useRef } from 'react'
import SiteOverview from '../SiteOverview'
import { getMetrics, GAS_SUPPLY_UI_MAX } from '../../engine/simulation'

// "BREAK IT" CHALLENGE
// Give the customer every slider and button. Dare them to crash the system.
// Pad Logic handles it all. The lightbulb moment: "I literally cannot break this thing."

export default function BreakItChallenge({ sim }) {
  const m = getMetrics(sim.state)
  const [worstAccuracy, setWorstAccuracy] = useState(100)
  const [recoveryCount, setRecoveryCount] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const prevAccuracy = useRef(100)

  // Track stats
  useEffect(() => {
    const acc = m.injectionAccuracy
    if (acc < worstAccuracy) setWorstAccuracy(acc)
    // Count recoveries (went below 80 then back above 90)
    if (prevAccuracy.current < 80 && acc > 90) setRecoveryCount(c => c + 1)
    prevAccuracy.current = acc
  }, [sim.state.tickCount])

  const trackEvent = () => setEventCount(c => c + 1)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#05233E]">
      {/* Header */}
      <div className="px-5 py-3 bg-[#0F3C64] border-b border-[#293C5B] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg text-white font-bold flex items-center gap-2" style={{ fontFamily: "'Montserrat'" }}>
              <span className="text-2xl">BC</span> Break It Challenge
            </h2>
            <p className="text-[11px] text-[#888] mt-0.5">
              Go ahead - try to crash the system. Every slider and button is yours. Pad Logic handles it all.
            </p>
          </div>
          <div className="flex gap-3">
            <ScoreCard label="Events Thrown" value={eventCount} color="#f97316" />
            <ScoreCard label="Auto-Recoveries" value={recoveryCount} color="#22c55e" />
            <ScoreCard label="Worst Accuracy" value={`${worstAccuracy.toFixed(0)}%`} color={worstAccuracy > 80 ? '#22c55e' : '#D32028'} />
            <ScoreCard label="Current" value={`${m.injectionAccuracy.toFixed(0)}%`}
              color={m.injectionAccuracy > 95 ? '#22c55e' : m.injectionAccuracy > 70 ? '#eab308' : '#D32028'} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Live diagram */}
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative">
          <SiteOverview state={sim.state} config={sim.state.config} animateFlow={false} />
          {/* RESET ALL button - top right */}
          <button onClick={() => {
            sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
            sim.state.wells.forEach(w => { if (w.desiredRate === 0) sim.setWellDesiredRate(w.id, 150) })
            sim.setTotalAvailableGas(sim.state.maxGasCapacity)
            sim.setStateField('wellUnloadActive', false)
            sim.setStateField('salesValvePosition', 0)
          }}
            className="absolute top-3 right-3 z-10 px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-black text-[11px] font-bold rounded-lg shadow-lg shadow-[#22c55e]/20 transition-all active:scale-95"
            style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}>
            RESET ALL TO NORMAL
          </button>
        </div>

        {/* CHAOS CONTROL PANEL */}
        <div className="w-[310px] shrink-0 bg-[#03172A] border-l border-[#293C5B] overflow-y-auto sidebar-scroll">
          <div className="p-3 space-y-3">

            {/* Quick chaos buttons */}
            <PanelSection title="Quick Chaos" color="#D32028">
              <div className="grid grid-cols-2 gap-1.5">
                <ChaosBtn label="Trip Random Comp" icon="TRIP" onClick={() => {
                  trackEvent()
                  const running = sim.state.compressors.filter(c => c.status === 'running')
                  if (running.length) sim.setCompressorStatus(running[Math.floor(Math.random() * running.length)].id, 'tripped')
                }} />
                <ChaosBtn label="Trip ALL Comps" icon="ALL" color="#D32028" onClick={() => {
                  trackEvent()
                  sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'tripped'))
                }} />
                <ChaosBtn label="Well Unload" icon="UNLD" onClick={() => {
                  trackEvent()
                  sim.setStateField('scrubberPressure', sim.state.suctionTarget + 40)
                  sim.setStateField('wellUnloadActive', true)
                  setTimeout(() => sim.setStateField('wellUnloadActive', false), 6000)
                }} />
                <ChaosBtn label="Kill Gas Supply" icon="ZERO" onClick={() => {
                  trackEvent()
                  sim.setTotalAvailableGas(0)
                }} />
                <ChaosBtn label="Slam Sales Line" icon="LINE" onClick={() => {
                  trackEvent()
                  sim.setStateField('salesValvePosition', 100)
                  sim.setStateField('suctionHeaderPressure', sim.state.suctionTarget + 30)
                }} />
                <ChaosBtn label="Load Up a Well" icon="LOAD" onClick={() => {
                  trackEvent()
                  const wells = sim.state.wells.filter(w => w.desiredRate > 0)
                  if (wells.length) sim.setWellDesiredRate(wells[Math.floor(Math.random() * wells.length)].id, 0)
                }} />
                <ChaosBtn label="THE BAD DAY" icon="BAD" color="#D32028" onClick={() => {
                  trackEvent(); trackEvent(); trackEvent()
                  sim.setCompressorStatus(0, 'tripped')
                  setTimeout(() => sim.setTotalAvailableGas(sim.state.maxGasCapacity * 0.4), 2000)
                  setTimeout(() => { sim.setStateField('scrubberPressure', sim.state.suctionTarget + 40); sim.setStateField('wellUnloadActive', true) }, 4000)
                  setTimeout(() => { if (sim.state.compressors.length > 1) sim.setCompressorStatus(1, 'tripped') }, 7000)
                }} />
                <ChaosBtn label="RESET ALL" icon="" color="#22c55e" onClick={() => {
                  sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
                  sim.state.wells.forEach(w => { if (w.desiredRate === 0) sim.setWellDesiredRate(w.id, 150) })
                  sim.setTotalAvailableGas(sim.state.maxGasCapacity)
                  sim.setStateField('wellUnloadActive', false)
                  sim.setStateField('salesValvePosition', 0)
                }} />
              </div>
            </PanelSection>

            {/* Gas Supply */}
            <PanelSection title="Gas Supply" color="#22c55e">
              <SliderControl label="Total Available Gas" value={sim.state.totalAvailableGas} min={0} max={GAS_SUPPLY_UI_MAX}
                unit="MCFD" onChange={v => { sim.setTotalAvailableGas(v); trackEvent() }}
                color={sim.state.totalAvailableGas > sim.state.maxGasCapacity * 0.7 ? '#22c55e' : sim.state.totalAvailableGas > sim.state.maxGasCapacity * 0.4 ? '#eab308' : '#D32028'} />
            </PanelSection>

            {/* Compressors */}
            <PanelSection title="Compressors" color="#22c55e">
              {sim.state.compressors.map(c => (
                <div key={c.id} className="flex items-center gap-2 py-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.status === 'running' ? '#22c55e' : '#D32028' }} />
                  <span className="text-[11px] text-white font-bold flex-1">{c.name}</span>
                  <span className="text-[9px] text-[#888] w-16 text-right">{c.actualThroughput.toFixed(0)} MCFD</span>
                  <select value={c.status} onChange={e => { sim.setCompressorStatus(c.id, e.target.value); trackEvent() }}
                    className="text-[9px] bg-[#111] text-white border border-[#333] rounded px-1 py-0.5 w-16">
                    <option value="running">Run</option>
                    <option value="tripped">Trip</option>
                    <option value="stopped">Stop</option>
                  </select>
                </div>
              ))}
            </PanelSection>

            {/* Individual Well Rates */}
            <PanelSection title="Well Injection Rates" color="#f97316">
              {sim.state.wells.map(w => (
                <SliderControl key={w.id} label={`${w.name} Desired`} value={w.desiredRate} min={0} max={400} step={10}
                  unit="MCFD" onChange={v => { sim.setWellDesiredRate(w.id, v); trackEvent() }}
                  subtext={`Actual: ${w.actualRate.toFixed(0)} MCFD`}
                  color={w.isAtTarget ? '#22c55e' : '#D32028'} />
              ))}
            </PanelSection>

            {/* Pressure System */}
            <PanelSection title="Pressure System" color="#4fc3f7">
              <SliderControl label="Suction Header Target" value={sim.state.suctionTarget} min={20} max={200}
                unit="PSI" onChange={v => sim.setStateField('suctionTarget', v)} />
              <SliderControl label="Suction High Range" value={sim.state.suctionHighRange} min={0} max={100}
                unit="PSI" onChange={v => sim.setStateField('suctionHighRange', v)} />
              <SliderControl label="Suction Low Range" value={sim.state.suctionLowRange} min={10} max={150}
                unit="PSI" onChange={v => sim.setStateField('suctionLowRange', v)} />
              <SliderControl label="Stagger Offset" value={sim.state.staggerOffset} min={0} max={20} step={0.5}
                unit="PSI" onChange={v => sim.setStateField('staggerOffset', v)} />
              <ReadOnly label="Suction Header PSI" value={sim.state.suctionHeaderPressure.toFixed(1)} unit="PSI"
                color={sim.state.suctionHeaderPressure > sim.state.suctionTarget + sim.state.suctionHighRange ? '#D32028' : '#22c55e'} />
              <ReadOnly label="Scrubber PSI" value={sim.state.scrubberPressure.toFixed(1)} unit="PSI"
                color={sim.state.wellUnloadActive ? '#D32028' : '#22c55e'} />
            </PanelSection>

            {/* Temperature */}
            <PanelSection title="Temperature" color="#eab308">
              <SliderControl label="Max Temp at Plate" value={sim.state.maxTempAtPlate} min={100} max={250}
                unit="deg F" onChange={v => sim.setStateField('maxTempAtPlate', v)} />
              <ReadOnly label="Flow Meter Temp" value={sim.state.flowMeterTemp.toFixed(0)} unit="deg F"
                color={sim.state.flowMeterTemp > sim.state.maxTempAtPlate ? '#D32028' : '#22c55e'} />
            </PanelSection>

            {/* Sales Valve */}
            <PanelSection title="Sales / Recirc" color="#22c55e">
              <SliderControl label="Force Sales Valve Position" value={sim.state.salesValvePosition} min={0} max={100}
                unit="%" onChange={v => { sim.setStateField('salesValvePosition', v); trackEvent() }}
                color={sim.state.salesValvePosition > 50 ? '#eab308' : '#22c55e'} />
            </PanelSection>

            {/* Staging */}
            <PanelSection title="Staging Timers" color="#888">
              <SliderControl label="Stability Timer" value={sim.state.stabilityTimer} min={10} max={300}
                unit="sec" onChange={v => sim.setStateField('stabilityTimer', v)} />
              <SliderControl label="Lockout Timer" value={sim.state.stagingLockoutTimer} min={60} max={900}
                unit="sec" onChange={v => sim.setStateField('stagingLockoutTimer', v)} />
              <ReadOnly label="Lockout Remaining" value={sim.state.stagingLockoutRemaining.toFixed(0)} unit="sec"
                color={sim.state.stagingLockoutRemaining > 0 ? '#eab308' : '#22c55e'} />
            </PanelSection>

            {/* Well Priorities */}
            <PanelSection title="Well Priorities" color="#f97316">
              <p className="text-[9px] text-[#666] mb-1">Drag to reorder. Top = highest priority.</p>
              <PriorityList wells={sim.state.wells} onReorder={sim.setWellPriorities} onEvent={trackEvent} />
            </PanelSection>

            <div className="h-6" />
          </div>
        </div>
      </div>

      {/* Bottom metrics */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0F3C64] border-t border-[#293C5B] shrink-0">
        <Metric label="Injection" value={`${m.totalActualMcfd.toFixed(0)} / ${m.totalDesiredMcfd.toFixed(0)}`} unit="MCFD" />
        <Metric label="Accuracy" value={`${m.injectionAccuracy.toFixed(1)}%`}
          color={m.injectionAccuracy >= 95 ? '#22c55e' : m.injectionAccuracy >= 70 ? '#eab308' : '#D32028'} />
        <Metric label="Production" value={m.totalProductionBoe.toFixed(0)} unit="BOE/d" />
        <Metric label="Compressors" value={`${m.compressorsOnline}/${m.compressorsTotal}`}
          color={m.compressorsOnline === m.compressorsTotal ? '#22c55e' : '#D32028'} />
        <Metric label="Wells OK" value={`${m.wellsAtTarget}/${m.wellsTotal}`}
          color={m.wellsAtTarget === m.wellsTotal ? '#22c55e' : '#D32028'} />
        <div className="ml-auto text-[10px] text-[#555]">
          Break it and watch Pad Logic handle it
        </div>
      </div>
    </div>
  )
}

// Sub-components

function ScoreCard({ label, value, color }) {
  return (
    <div className="bg-[#111120] rounded px-3 py-1.5 text-center min-w-[80px]">
      <div className="text-[7px] text-[#555] uppercase">{label}</div>
      <div className="text-[16px] font-bold" style={{ fontFamily: "'Montserrat'", color }}>{value}</div>
    </div>
  )
}

function PanelSection({ title, color, children }) {
  return (
    <div className="bg-[#111120] rounded-lg border border-[#293C5B] p-2.5">
      <div className="text-[8px] uppercase tracking-wider font-bold mb-2" style={{ color }}>{title}</div>
      {children}
    </div>
  )
}

function ChaosBtn({ label, icon, onClick, color = '#f97316' }) {
  return (
    <button onClick={onClick}
      className="py-2 px-2 rounded border text-[10px] font-bold text-left transition-all hover:scale-[1.02] active:scale-95"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}10`, color }}>
      {icon && <span className="mr-1">{icon}</span>}{label}
    </button>
  )
}

function SliderControl({ label, value, min, max, step = 1, unit, onChange, color, subtext }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] text-[#aaa]">{label}</span>
        <span className="text-[10px] font-bold" style={{ color: color || '#fff' }}>
          {typeof value === 'number' ? (step < 1 ? value.toFixed(1) : value.toFixed(0)) : value} {unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#D32028]" style={{ height: 3 }} />
      {subtext && <div className="text-[8px] text-[#555] mt-0.5">{subtext}</div>}
    </div>
  )
}

function ReadOnly({ label, value, unit, color }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[9px] text-[#888]">{label}</span>
      <span className="text-[10px] font-bold" style={{ color: color || '#fff' }}>{value} {unit}</span>
    </div>
  )
}

function Metric({ label, value, unit, color }) {
  return (
    <div className="bg-[#111120] rounded px-2.5 py-1 min-w-[90px] shrink-0">
      <div className="text-[7px] text-[#555] uppercase">{label}</div>
      <span className="text-[11px] font-bold" style={{ color: color || '#fff', fontFamily: "'Montserrat'" }}>{value}</span>
      {unit && <span className="text-[7px] text-[#555] ml-1">{unit}</span>}
    </div>
  )
}

function PriorityList({ wells, onReorder, onEvent }) {
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const sorted = [...wells].sort((a, b) => a.priority - b.priority)

  const handleDrop = (e, dropIdx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === dropIdx) return
    const ids = sorted.map(w => w.id)
    const [moved] = ids.splice(dragIdx, 1)
    ids.splice(dropIdx, 0, moved)
    onReorder(ids)
    onEvent()
    setDragIdx(null); setOverIdx(null)
  }

  return (
    <div className="space-y-0.5">
      {sorted.map((w, idx) => (
        <div key={w.id} draggable
          onDragStart={e => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move' }}
          onDragOver={e => { e.preventDefault(); setOverIdx(idx) }}
          onDrop={e => handleDrop(e, idx)}
          onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
          className={`flex items-center gap-2 py-1 px-2 rounded text-[10px] cursor-grab active:cursor-grabbing
            ${dragIdx === idx ? 'opacity-50' : ''} ${overIdx === idx && dragIdx !== idx ? 'border-t border-[#D32028]' : ''}
            bg-[#03172A] hover:bg-[#293C5B]`}>
          <span className="text-[#555] w-3 text-right font-bold">{idx + 1}</span>
          <span className="text-[#555]">::</span>
          <span className="text-white font-bold">{w.name}</span>
          <div className="flex-1 bg-[#111] rounded h-1.5 overflow-hidden">
            <div className="h-full transition-all" style={{
              width: `${w.desiredRate > 0 ? (w.actualRate / w.desiredRate) * 100 : 0}%`,
              backgroundColor: w.isAtTarget ? '#22c55e' : '#D32028',
            }} />
          </div>
          <span className={`text-[9px] ${w.isAtTarget ? 'text-[#22c55e]' : 'text-[#D32028]'}`}>{w.actualRate.toFixed(0)}</span>
        </div>
      ))}
    </div>
  )
}

