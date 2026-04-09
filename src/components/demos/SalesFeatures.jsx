// Sales Features — enable/disable overlays for the demo mode
// 1. Revenue Impact Ticker
// 2. Before/After Split Screen
// 3. Bad Day Chaos Button
// 4. Customer Data Input
// 5. Annual ROI Calculator
// 6. Response Time Timer
// 7. 2AM Saturday Scenario

import { useState, useEffect, useRef } from 'react'

// ═══════════════════════════════════════════════════════════
// 1. REVENUE IMPACT TICKER
// ═══════════════════════════════════════════════════════════
export function RevenueTicker({ sim, customerData }) {
  const [cumulativeSaved, setCumulativeSaved] = useState(0)
  const prevAccuracy = useRef(100)

  const boePrice = customerData?.boePrice || 75 // $/BOE
  const totalDesired = sim.state.wells.reduce((s, w) => s + w.desiredRate, 0)
  const totalActual = sim.state.wells.reduce((s, w) => s + w.actualRate, 0)
  const accuracy = totalDesired > 0 ? totalActual / totalDesired : 1
  const maxDailyProduction = sim.state.wells.reduce((s, w) => s + w.baseProduction, 0)

  // Lost production in BOE/day
  const lostBoePerDay = maxDailyProduction * (1 - Math.min(1, accuracy))
  const lostPerHour = (lostBoePerDay / 24) * boePrice
  const totalProductionValue = (maxDailyProduction * boePrice) / 24 // $/hr at full production

  // "Saved" = what WellLogic recovered vs zero-intervention (manual stays broken)
  // If accuracy dropped then recovered, the delta is savings
  useEffect(() => {
    const recovery = Math.max(0, accuracy - (prevAccuracy.current < accuracy ? prevAccuracy.current : accuracy))
    const savedThisTick = (recovery * maxDailyProduction * boePrice) / 24 / 2 // per tick
    setCumulativeSaved(prev => prev + savedThisTick + (accuracy > 0.95 ? 0 : (accuracy * maxDailyProduction * boePrice) / 24 / 200))
    prevAccuracy.current = accuracy
  }, [sim.state.tickCount])

  return (
    <div className="bg-[#0a1a0a] border border-[#22c55e]/30 rounded-lg p-3">
      <div className="text-[8px] text-[#22c55e] uppercase tracking-wider font-bold mb-2">💰 Revenue Impact — Live</div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-[8px] text-[#888]">Production Value</div>
          <div className="text-[14px] text-[#22c55e] font-bold" style={{ fontFamily: "'Arial Black'" }}>
            ${totalProductionValue.toFixed(0)}<span className="text-[9px] text-[#888]">/hr</span>
          </div>
        </div>
        <div>
          <div className="text-[8px] text-[#888]">Lost Revenue</div>
          <div className="text-[14px] font-bold" style={{ fontFamily: "'Arial Black'", color: lostPerHour > 50 ? '#E8200C' : '#22c55e' }}>
            ${lostPerHour.toFixed(0)}<span className="text-[9px] text-[#888]">/hr</span>
          </div>
        </div>
        <div>
          <div className="text-[8px] text-[#888]">Session Savings</div>
          <div className="text-[14px] text-[#4fc3f7] font-bold" style={{ fontFamily: "'Arial Black'" }}>
            ${cumulativeSaved.toFixed(0)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 2. BEFORE / AFTER SPLIT SCREEN
// ═══════════════════════════════════════════════════════════
export function BeforeAfterOverlay({ sim }) {
  const [manualState, setManualState] = useState({ lostTime: 0, production: 0, recovered: false })
  const intervalRef = useRef(null)

  const accuracy = sim.metrics?.injectionAccuracy ?? 100
  const isDisturbance = accuracy < 90

  useEffect(() => {
    if (isDisturbance && !intervalRef.current) {
      setManualState({ lostTime: 0, production: 0, recovered: false })
      intervalRef.current = setInterval(() => {
        setManualState(prev => ({
          lostTime: prev.lostTime + 1,
          production: Math.max(0, 100 - prev.lostTime * 2), // manual: production stays down
          recovered: prev.lostTime > 120, // pumper arrives after 2 min (simulated as 120s)
        }))
      }, 1000)
    }
    if (!isDisturbance && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isDisturbance])

  if (!isDisturbance && manualState.lostTime === 0) return null

  const manualProdPct = manualState.recovered ? Math.min(100, manualState.production + 50) : Math.max(15, 100 - manualState.lostTime * 1.5)
  const wellLogicProdPct = accuracy

  return (
    <div className="bg-[#111] border border-[#333] rounded-lg p-3 mt-2">
      <div className="text-[8px] text-[#f97316] uppercase tracking-wider font-bold mb-2">⚡ Before / After Comparison</div>
      <div className="grid grid-cols-2 gap-3">
        {/* WITHOUT WellLogic */}
        <div className="bg-[#1a0a0a] rounded p-2 border border-[#E8200C]/20">
          <div className="text-[9px] text-[#E8200C] font-bold mb-1">❌ WITHOUT WellLogic</div>
          <div className="text-[9px] text-[#888] mb-1">Manual — waiting for pumper</div>
          <div className="w-full bg-[#200] rounded h-4 overflow-hidden mb-1">
            <div className="h-full bg-[#E8200C] transition-all duration-1000" style={{ width: `${manualProdPct}%` }} />
          </div>
          <div className="text-[10px] text-[#E8200C] font-bold">{manualProdPct.toFixed(0)}% production</div>
          {!manualState.recovered && <div className="text-[9px] text-[#888] mt-1">⏱ Pumper ETA: {Math.max(0, 120 - manualState.lostTime)}s</div>}
          {manualState.recovered && <div className="text-[9px] text-[#eab308] mt-1">Pumper arrived — manual correction</div>}
        </div>
        {/* WITH WellLogic */}
        <div className="bg-[#0a1a0a] rounded p-2 border border-[#22c55e]/20">
          <div className="text-[9px] text-[#22c55e] font-bold mb-1">✅ WITH WellLogic</div>
          <div className="text-[9px] text-[#888] mb-1">Auto-rebalancing in progress</div>
          <div className="w-full bg-[#020] rounded h-4 overflow-hidden mb-1">
            <div className="h-full bg-[#22c55e] transition-all duration-1000" style={{ width: `${wellLogicProdPct}%` }} />
          </div>
          <div className="text-[10px] text-[#22c55e] font-bold">{wellLogicProdPct.toFixed(0)}% production</div>
          <div className="text-[9px] text-[#888] mt-1">⚡ Auto-response: immediate</div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 3. BAD DAY CHAOS BUTTON
// ═══════════════════════════════════════════════════════════
export function BadDayButton({ sim }) {
  const [chaosActive, setChaosActive] = useState(false)

  const triggerChaos = () => {
    setChaosActive(true)
    // Stagger events like real life
    // T+0: Compressor trips
    sim.setCompressorStatus(0, 'tripped')
    // T+3s: Gas supply drops
    setTimeout(() => sim.setTotalAvailableGas(sim.state.maxGasCapacity * 0.5), 3000)
    // T+6s: Well unload
    setTimeout(() => {
      sim.setStateField('scrubberPressure', sim.state.suctionTarget + 35)
      sim.setStateField('wellUnloadActive', true)
    }, 6000)
    // T+10s: Sales line backs up
    setTimeout(() => sim.setStateField('salesValvePosition', 90), 10000)
    // T+15s: Another compressor trips
    setTimeout(() => { if (sim.state.compressors.length > 1) sim.setCompressorStatus(1, 'tripped') }, 15000)
    // T+20s: Well loads up
    setTimeout(() => {
      const lastWell = [...sim.state.wells].sort((a, b) => b.priority - a.priority)[0]
      if (lastWell) sim.setWellDesiredRate(lastWell.id, 0)
    }, 20000)

    setTimeout(() => setChaosActive(false), 25000)
  }

  const resetChaos = () => {
    setChaosActive(false)
    sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
    sim.state.wells.forEach(w => { if (w.desiredRate === 0) sim.setWellDesiredRate(w.id, 150) })
    sim.setTotalAvailableGas(sim.state.maxGasCapacity)
    sim.setStateField('wellUnloadActive', false)
    sim.setStateField('salesValvePosition', 0)
  }

  return (
    <div className="space-y-1.5">
      <button onClick={triggerChaos} disabled={chaosActive}
        className={`w-full py-3 rounded-lg font-bold text-[12px] transition-all ${
          chaosActive
            ? 'bg-[#E8200C] text-white animate-pulse'
            : 'bg-[#E8200C]/20 border-2 border-[#E8200C] text-[#E8200C] hover:bg-[#E8200C] hover:text-white'
        }`}>
        {chaosActive ? '💥 CHAOS IN PROGRESS...' : '💀 THE BAD DAY — Hit Everything'}
      </button>
      {chaosActive && (
        <div className="text-[9px] text-[#E8200C] text-center">
          Comp trip → Gas drop → Well unload → Sales backup → 2nd trip → Well loads up
        </div>
      )}
      <button onClick={resetChaos}
        className="w-full py-1.5 rounded text-[10px] text-[#888] border border-[#333] hover:text-white hover:border-[#555]">
        ↩️ Reset Everything
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 4. CUSTOMER DATA INPUT
// ═══════════════════════════════════════════════════════════
export function CustomerDataInput({ data, onChange }) {
  const set = (key, val) => onChange({ ...data, [key]: val })

  return (
    <div className="bg-[#111120] border border-[#2a2a3a] rounded-lg p-3">
      <div className="text-[8px] text-[#4fc3f7] uppercase tracking-wider font-bold mb-2">🏢 Customer Pad Data</div>
      <div className="space-y-2">
        <CustInput label="Customer Name" value={data.customerName || ''} onChange={v => set('customerName', v)} type="text" />
        <CustInput label="Pad / Lease Name" value={data.padName || ''} onChange={v => set('padName', v)} type="text" />
        <CustInput label="Oil Price ($/BOE)" value={data.boePrice || 75} onChange={v => set('boePrice', Number(v))} min={20} max={200} />
        <CustInput label="Gas Price ($/MCF)" value={data.gasPrice || 2.5} onChange={v => set('gasPrice', Number(v))} min={0.5} max={15} step={0.1} />
        <CustInput label="Avg Production (BOE/day/well)" value={data.avgProduction || 120} onChange={v => set('avgProduction', Number(v))} min={10} max={1000} />
        <CustInput label="Avg Comp Trips / Month" value={data.tripsPerMonth || 4} onChange={v => set('tripsPerMonth', Number(v))} min={0} max={30} />
        <CustInput label="Avg Manual Response (min)" value={data.manualResponseMin || 90} onChange={v => set('manualResponseMin', Number(v))} min={15} max={480} />
        <CustInput label="Gas Constraint Events / Week" value={data.constraintPerWeek || 2} onChange={v => set('constraintPerWeek', Number(v))} min={0} max={20} />
      </div>
    </div>
  )
}

function CustInput({ label, value, onChange, type = 'number', min, max, step }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-[#888] flex-1">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        min={min} max={max} step={step}
        className="w-20 bg-[#0a0a14] border border-[#333] rounded px-2 py-1 text-[11px] text-white text-right outline-none focus:border-[#4fc3f7]" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 5. ANNUAL ROI CALCULATOR
// ═══════════════════════════════════════════════════════════
export function ROICalculator({ customerData }) {
  const d = customerData
  const boePrice = d.boePrice || 75
  const avgProd = d.avgProduction || 120
  const trips = d.tripsPerMonth || 4
  const responseMin = d.manualResponseMin || 90
  const constraints = d.constraintPerWeek || 2

  // Compressor trip savings
  // Without WellLogic: full production lost for manual response time
  // With WellLogic: 90% recovered in ~60 seconds
  const tripLostHours = responseMin / 60
  const tripSavedBoePerEvent = avgProd * (tripLostHours / 24) * 0.85 // 85% of lost production saved
  const tripAnnualSaved = tripSavedBoePerEvent * boePrice * trips * 12

  // Gas constraint savings
  // Without: all wells lose proportionally. With: priority wells protected
  const constraintSavedBoe = avgProd * 0.3 * 0.5 // 30% of production on bottom wells, save half
  const constraintAnnualSaved = constraintSavedBoe * boePrice * constraints * 52

  // Unload/slugging savings (prevent shutdowns)
  const unloadSaved = boePrice * avgProd * 2 * 12 // ~2 avoided shutdowns/month

  const totalAnnual = tripAnnualSaved + constraintAnnualSaved + unloadSaved

  return (
    <div className="bg-[#0a0a1a] border border-[#4fc3f7]/30 rounded-lg p-3">
      <div className="text-[8px] text-[#4fc3f7] uppercase tracking-wider font-bold mb-2">📊 Estimated Annual ROI</div>
      {d.customerName && <div className="text-[10px] text-white font-bold mb-2">{d.customerName} — {d.padName || 'Pad'}</div>}
      <div className="space-y-1.5 text-[10px]">
        <div className="flex justify-between">
          <span className="text-[#888]">Comp Trip Recovery ({trips}/mo × 12)</span>
          <span className="text-[#22c55e] font-bold">${(tripAnnualSaved / 1000).toFixed(0)}K</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#888]">Gas Constraint Protection ({constraints}/wk × 52)</span>
          <span className="text-[#22c55e] font-bold">${(constraintAnnualSaved / 1000).toFixed(0)}K</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#888]">Avoided Shutdowns (~24/yr)</span>
          <span className="text-[#22c55e] font-bold">${(unloadSaved / 1000).toFixed(0)}K</span>
        </div>
        <div className="border-t border-[#333] pt-1.5 flex justify-between">
          <span className="text-white font-bold">Estimated Annual Savings</span>
          <span className="text-[#4fc3f7] font-bold text-[14px]" style={{ fontFamily: "'Arial Black'" }}>
            ${(totalAnnual / 1000).toFixed(0)}K
          </span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 6. RESPONSE TIME COMPARISON TIMER
// ═══════════════════════════════════════════════════════════
export function ResponseTimer({ sim, customerData }) {
  const [eventStart, setEventStart] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [wellLogicRecovered, setWellLogicRecovered] = useState(false)
  const intervalRef = useRef(null)

  const accuracy = sim.state.wells.reduce((s, w) => s + (w.isAtTarget ? 1 : 0), 0) / sim.state.wells.length * 100
  const isDisturbance = accuracy < 85
  const manualResponse = (customerData?.manualResponseMin || 90) * 60 // seconds

  useEffect(() => {
    if (isDisturbance && !eventStart) {
      setEventStart(Date.now())
      setWellLogicRecovered(false)
      setElapsed(0)
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    if (!isDisturbance && eventStart) {
      if (!wellLogicRecovered) setWellLogicRecovered(true)
    }
    if (!isDisturbance && !eventStart) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setElapsed(0)
      setWellLogicRecovered(false)
    }
    return () => {}
  }, [isDisturbance])

  // Reset when fully recovered for a while
  useEffect(() => {
    if (wellLogicRecovered && !isDisturbance) {
      const timeout = setTimeout(() => {
        setEventStart(null)
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      }, 10000)
      return () => clearTimeout(timeout)
    }
  }, [wellLogicRecovered, isDisturbance])

  if (!eventStart && elapsed === 0) return null

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="bg-[#111] border border-[#333] rounded-lg p-3 mt-2">
      <div className="text-[8px] text-[#f97316] uppercase tracking-wider font-bold mb-2">⏱ Response Time Comparison</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <div className="text-[9px] text-[#E8200C] font-bold mb-1">Manual Response</div>
          <div className="text-[20px] text-[#E8200C] font-bold" style={{ fontFamily: "'Arial Black'" }}>
            {formatTime(Math.min(elapsed, manualResponse))}
          </div>
          <div className="text-[8px] text-[#888]">{elapsed < manualResponse ? 'Pumper en route...' : 'Pumper arrived'}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-[#22c55e] font-bold mb-1">WellLogic Response</div>
          <div className="text-[20px] font-bold" style={{ fontFamily: "'Arial Black'", color: wellLogicRecovered ? '#22c55e' : '#eab308' }}>
            {wellLogicRecovered ? formatTime(elapsed < 5 ? elapsed : Math.min(elapsed, 60)) : formatTime(elapsed)}
          </div>
          <div className="text-[8px] text-[#888]">{wellLogicRecovered ? '✅ Recovered' : 'Rebalancing...'}</div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 7. 2AM SATURDAY SCENARIO
// ═══════════════════════════════════════════════════════════
export function SaturdayNightButton({ sim }) {
  const [active, setActive] = useState(false)
  const [stage, setStage] = useState('')

  const trigger = () => {
    setActive(true)
    setStage('🌙 2:00 AM — All quiet. Pumper is 45 min away.')

    setTimeout(() => {
      setStage('⚡ 2:03 AM — C1 trips on high discharge temp.')
      sim.setCompressorStatus(0, 'tripped')
    }, 3000)

    setTimeout(() => {
      setStage('📉 2:05 AM — Suction pressure dropping. Wells losing injection.')
      sim.setTotalAvailableGas(sim.state.maxGasCapacity * 0.5)
    }, 8000)

    setTimeout(() => {
      setStage('💥 2:08 AM — Well 3 unloads. Scrubber pressure spikes.')
      sim.setStateField('scrubberPressure', sim.state.suctionTarget + 30)
      sim.setStateField('wellUnloadActive', true)
    }, 14000)

    setTimeout(() => {
      setStage('🟢 WellLogic has rebalanced. Priority wells protected. Sales valve managing pressure.')
      sim.setStateField('wellUnloadActive', false)
    }, 22000)

    setTimeout(() => {
      setStage('📱 2:48 AM — Pumper arrives on-site. WellLogic already handled it 45 minutes ago.')
    }, 30000)

    setTimeout(() => setActive(false), 40000)
  }

  return (
    <div className="space-y-1.5">
      <button onClick={trigger} disabled={active}
        className={`w-full py-2.5 rounded-lg font-bold text-[11px] transition-all ${
          active
            ? 'bg-[#1a1a40] border border-[#4a4aff] text-[#8888ff]'
            : 'bg-[#1a1a30] border-2 border-[#4a4aff] text-[#8888ff] hover:bg-[#2a2a50] hover:text-white'
        }`}>
        {active ? '🌙 Scenario Running...' : '🌙 2AM Saturday — Nobody On-Site'}
      </button>
      {active && stage && (
        <div className="bg-[#1a1a30] rounded p-2 border border-[#333]">
          <div className="text-[10px] text-[#ccc] leading-relaxed">{stage}</div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// FEATURE TOGGLES PANEL
// ═══════════════════════════════════════════════════════════
export function FeatureToggles({ features, onToggle }) {
  const items = [
    { key: 'revenueTicker', label: 'Revenue Impact Ticker', icon: '💰', desc: 'Show $/hr lost and saved' },
    { key: 'beforeAfter', label: 'Before / After', icon: '⚡', desc: 'Side-by-side comparison on disturbance' },
    { key: 'responseTimer', label: 'Response Timer', icon: '⏱', desc: 'Manual vs WellLogic response time' },
    { key: 'badDay', label: 'Bad Day Button', icon: '💀', desc: 'Multi-event cascading failure' },
    { key: 'saturdayNight', label: '2AM Saturday', icon: '🌙', desc: 'Nobody on-site nightmare scenario' },
    { key: 'customerData', label: 'Customer Data', icon: '🏢', desc: 'Input prospect\'s actual numbers' },
    { key: 'roiCalc', label: 'ROI Calculator', icon: '📊', desc: 'Annual savings estimate' },
  ]

  return (
    <div className="bg-[#111120] border border-[#2a2a3a] rounded-lg p-3 mb-3">
      <div className="text-[8px] text-[#E8200C] uppercase tracking-wider font-bold mb-2">Sales Features</div>
      <div className="space-y-1">
        {items.map(item => (
          <label key={item.key} className="flex items-center gap-2 py-1 cursor-pointer group">
            <div className={`w-8 h-4 rounded-full transition-colors shrink-0 relative ${features[item.key] ? 'bg-[#E8200C]' : 'bg-[#333]'}`}
              onClick={() => onToggle(item.key)}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${features[item.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-[10px]">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-[10px] font-bold ${features[item.key] ? 'text-white' : 'text-[#888]'}`}>{item.label}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
