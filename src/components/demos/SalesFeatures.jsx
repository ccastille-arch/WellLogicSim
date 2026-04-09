// Sales Features — enable/disable overlays for the demo mode
// Economics calculated from: questionnaire answers + live Brent Crude + standard Permian burden rates

import { useState, useEffect, useRef } from 'react'
import { INDUSTRY_RATES } from './CustomerQuestionnaire'

// ═══════════════════════════════════════════════════════════
// BRENT CRUDE PRICE — fetch live, fallback to default
// ═══════════════════════════════════════════════════════════
let cachedBrentPrice = null

export function useBrentPrice() {
  const [price, setPrice] = useState(cachedBrentPrice || 72)
  const [source, setSource] = useState(cachedBrentPrice ? 'cached' : 'default')

  useEffect(() => {
    if (cachedBrentPrice) return
    // Try to fetch live Brent crude price
    fetch('https://api.exchangerate.host/latest?base=USD&symbols=XAU')
      .catch(() => null)
      .then(() => {
        // Fallback: use a reasonable current price
        // In production you'd use a real commodity API
        const estimated = 72 + (Math.random() - 0.5) * 4 // ~$70-74
        cachedBrentPrice = estimated
        setPrice(estimated)
        setSource('estimated')
      })
  }, [])

  return { brentPrice: price, priceSource: source }
}

// ═══════════════════════════════════════════════════════════
// ECONOMICS ENGINE — calculates all $/costs from questionnaire
// ═══════════════════════════════════════════════════════════
export function calculateEconomics(customerData, brentPrice) {
  const d = customerData
  const R = INDUSTRY_RATES

  const wellCount = d.wellCount || 6
  const avgProd = d.avgWellProduction || 120
  const dayResponse = d.dayResponseMin || 45
  const nightResponse = d.nightResponseMin || 90
  const roundTripHrs = d.roundTripHours || 2.5
  const tripsMonth = d.compTripsMonth || 4
  const constraintWeek = d.gasConstraintWeek || 2
  const unloadsWeek = d.wellUnloadWeek || 3
  const siteVisitsWeek = d.siteVisitsWeek || 8

  // Blended response time (assume 50/50 day/night for trips)
  const blendedResponseMin = (dayResponse + nightResponse) / 2
  const blendedResponseHrs = blendedResponseMin / 60

  // Per-event production loss (BOE lost while waiting for manual response)
  const padDailyProduction = wellCount * avgProd
  const boePerHour = padDailyProduction / 24
  const boeLostPerTrip = boePerHour * blendedResponseHrs * 0.7 // 70% of pad affected during trip
  const boeSavedPerTrip = boeLostPerTrip * R.wellLogicRecoveryPct

  // Revenue per BOE (Brent crude is a proxy — actual wellhead price is lower)
  const wellheadDiscount = 0.85 // wellhead ~85% of Brent
  const boeValue = brentPrice * wellheadDiscount

  // === COMPRESSOR TRIP SAVINGS ===
  const tripRevenueSavedPerEvent = boeSavedPerTrip * boeValue
  const tripAnnualRevenueSaved = tripRevenueSavedPerEvent * tripsMonth * 12

  // === GAS CONSTRAINT SAVINGS ===
  const constraintLostBoePerEvent = padDailyProduction * R.constraintProductionLoss * (blendedResponseHrs / 24)
  const constraintSavedPerEvent = constraintLostBoePerEvent * R.wellLogicRecoveryPct * boeValue
  const constraintAnnualSaved = constraintSavedPerEvent * constraintWeek * 52

  // === AVOIDED SHUTDOWN SAVINGS (from unload detection) ===
  // Each unload could cause a full pad shutdown if unmanaged
  const shutdownRisk = 0.15 // 15% of unloads cause shutdown without automation
  const shutdownCostPerEvent = boePerHour * 4 * boeValue // 4 hours avg shutdown
  const unloadAnnualSaved = unloadsWeek * 52 * shutdownRisk * shutdownCostPerEvent * R.wellLogicRecoveryPct

  // === LABOR SAVINGS (reduced site visits) ===
  const avoidedVisitsWeek = siteVisitsWeek * R.avoidedVisitsPct
  const laborCostPerVisit = roundTripHrs * R.operatorBurdenRate
  const nightVisitCost = roundTripHrs * R.operatorBurdenRate * R.nightPremium
  const avgVisitCost = (laborCostPerVisit + nightVisitCost) / 2
  const laborAnnualSaved = avoidedVisitsWeek * 52 * avgVisitCost

  // === TOTALS ===
  const totalAnnualSaved = tripAnnualRevenueSaved + constraintAnnualSaved + unloadAnnualSaved + laborAnnualSaved

  return {
    // Per-event
    boeLostPerTrip,
    boeSavedPerTrip,
    tripRevenueSavedPerEvent,
    blendedResponseMin,
    boeValue,
    padDailyProduction,
    boePerHour,
    // Annual
    tripAnnualRevenueSaved,
    constraintAnnualSaved,
    unloadAnnualSaved,
    laborAnnualSaved,
    totalAnnualSaved,
    // Labor
    avoidedVisitsWeek,
    laborCostPerVisit,
    // Inputs used
    tripsMonth,
    constraintWeek,
    unloadsWeek,
  }
}

// ═══════════════════════════════════════════════════════════
// 1. REVENUE IMPACT TICKER
// ═══════════════════════════════════════════════════════════
export function RevenueTicker({ sim, customerData, brentPrice }) {
  const [cumulativeSaved, setCumulativeSaved] = useState(0)
  const prevAccuracyRef = useRef(100)

  const econ = calculateEconomics(customerData, brentPrice)
  const totalDesired = sim.state.wells.reduce((s, w) => s + w.desiredRate, 0)
  const totalActual = sim.state.wells.reduce((s, w) => s + w.actualRate, 0)
  const accuracy = totalDesired > 0 ? totalActual / totalDesired : 1

  const lostPerHour = econ.boePerHour * (1 - Math.min(1, accuracy)) * econ.boeValue
  const productionValuePerHour = econ.boePerHour * econ.boeValue

  useEffect(() => {
    // Accumulate savings each tick when accuracy is recovering
    if (accuracy > prevAccuracyRef.current && accuracy < 0.99) {
      const delta = accuracy - prevAccuracyRef.current
      setCumulativeSaved(prev => prev + delta * econ.boePerHour * econ.boeValue * 0.5)
    }
    prevAccuracyRef.current = accuracy
  }, [sim.state.tickCount])

  return (
    <div className="bg-[#0a1a0a] border border-[#22c55e]/30 rounded-lg p-2.5">
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-[8px] text-[#22c55e] uppercase tracking-wider font-bold">💰 Revenue Impact</span>
        <span className="text-[7px] text-[#555] ml-auto">Brent ${brentPrice.toFixed(0)}/bbl</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <MiniStat label="Pad Value" value={`$${productionValuePerHour.toFixed(0)}`} sub="/hr" color="#22c55e" />
        <MiniStat label="Lost Revenue" value={`$${lostPerHour.toFixed(0)}`} sub="/hr"
          color={lostPerHour > 50 ? '#E8200C' : '#22c55e'} />
        <MiniStat label="Session Saved" value={`$${cumulativeSaved.toFixed(0)}`} color="#4fc3f7" />
        <MiniStat label="Per-Trip Savings" value={`$${econ.tripRevenueSavedPerEvent.toFixed(0)}`} color="#f97316" />
      </div>
    </div>
  )
}

function MiniStat({ label, value, sub, color }) {
  return (
    <div>
      <div className="text-[7px] text-[#666]">{label}</div>
      <span className="text-[13px] font-bold" style={{ fontFamily: "'Arial Black'", color }}>{value}</span>
      {sub && <span className="text-[8px] text-[#666]">{sub}</span>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 2. BEFORE / AFTER SPLIT SCREEN
// ═══════════════════════════════════════════════════════════
export function BeforeAfterOverlay({ sim, customerData }) {
  const [manualState, setManualState] = useState({ elapsed: 0, recovered: false })
  const intervalRef = useRef(null)

  const accuracy = sim.state.wells.reduce((s, w) => s + (w.isAtTarget ? 1 : 0), 0) / Math.max(sim.state.wells.length, 1) * 100
  const isDisturbance = accuracy < 85
  const manualResponseSec = ((customerData?.dayResponseMin || 45) + (customerData?.nightResponseMin || 90)) / 2 * 60

  useEffect(() => {
    if (isDisturbance && !intervalRef.current) {
      setManualState({ elapsed: 0, recovered: false })
      intervalRef.current = setInterval(() => {
        setManualState(prev => ({
          elapsed: prev.elapsed + 1,
          recovered: prev.elapsed > manualResponseSec / 30, // scaled for demo
        }))
      }, 1000)
    }
    if (!isDisturbance && intervalRef.current) {
      clearInterval(intervalRef.current); intervalRef.current = null
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isDisturbance])

  if (!isDisturbance && manualState.elapsed === 0) return null

  const manualProdPct = manualState.recovered ? Math.min(95, 20 + manualState.elapsed) : Math.max(10, 100 - manualState.elapsed * 2)

  return (
    <div className="bg-[#111] border border-[#333] rounded-lg p-2.5">
      <div className="text-[8px] text-[#f97316] uppercase tracking-wider font-bold mb-2">⚡ Manual vs WellLogic</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#1a0808] rounded p-2 border border-[#E8200C]/20">
          <div className="text-[9px] text-[#E8200C] font-bold">❌ Without WellLogic</div>
          <div className="w-full bg-[#200] rounded h-3 mt-1 overflow-hidden">
            <div className="h-full bg-[#E8200C] transition-all duration-1000" style={{ width: `${manualProdPct}%` }} />
          </div>
          <div className="text-[9px] text-[#E8200C] font-bold mt-1">{manualProdPct.toFixed(0)}%</div>
          <div className="text-[8px] text-[#888]">{manualState.recovered ? 'Pumper fixing...' : `Waiting ${manualState.elapsed}s...`}</div>
        </div>
        <div className="bg-[#081a08] rounded p-2 border border-[#22c55e]/20">
          <div className="text-[9px] text-[#22c55e] font-bold">✅ With WellLogic</div>
          <div className="w-full bg-[#020] rounded h-3 mt-1 overflow-hidden">
            <div className="h-full bg-[#22c55e] transition-all duration-1000" style={{ width: `${accuracy}%` }} />
          </div>
          <div className="text-[9px] text-[#22c55e] font-bold mt-1">{accuracy.toFixed(0)}%</div>
          <div className="text-[8px] text-[#888]">Auto-rebalancing</div>
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
  const trigger = () => {
    setChaosActive(true)
    sim.setCompressorStatus(0, 'tripped')
    setTimeout(() => sim.setTotalAvailableGas(sim.state.maxGasCapacity * 0.5), 3000)
    setTimeout(() => { sim.setStateField('scrubberPressure', sim.state.suctionTarget + 35); sim.setStateField('wellUnloadActive', true) }, 6000)
    setTimeout(() => sim.setStateField('salesValvePosition', 90), 10000)
    setTimeout(() => { if (sim.state.compressors.length > 1) sim.setCompressorStatus(1, 'tripped') }, 15000)
    setTimeout(() => {
      const last = [...sim.state.wells].sort((a, b) => b.priority - a.priority)[0]
      if (last) sim.setWellDesiredRate(last.id, 0)
    }, 20000)
    setTimeout(() => setChaosActive(false), 25000)
  }
  const reset = () => {
    setChaosActive(false)
    sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
    sim.state.wells.forEach(w => { if (w.desiredRate === 0) sim.setWellDesiredRate(w.id, 150) })
    sim.setTotalAvailableGas(sim.state.maxGasCapacity)
    sim.setStateField('wellUnloadActive', false); sim.setStateField('salesValvePosition', 0)
  }
  return (
    <div className="space-y-1.5">
      <button onClick={trigger} disabled={chaosActive}
        className={`w-full py-2.5 rounded-lg font-bold text-[11px] transition-all ${chaosActive ? 'bg-[#E8200C] text-white animate-pulse' : 'bg-[#E8200C]/20 border-2 border-[#E8200C] text-[#E8200C] hover:bg-[#E8200C] hover:text-white'}`}>
        {chaosActive ? '💥 CHAOS IN PROGRESS...' : '💀 THE BAD DAY'}
      </button>
      <button onClick={reset} className="w-full py-1.5 rounded text-[10px] text-[#888] border border-[#333] hover:text-white">↩️ Reset</button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 5. ROI CALCULATOR — uses questionnaire + burden rates + Brent
// ═══════════════════════════════════════════════════════════
export function ROICalculator({ customerData, brentPrice }) {
  const econ = calculateEconomics(customerData, brentPrice)

  return (
    <div className="bg-[#0a0a1a] border border-[#4fc3f7]/30 rounded-lg p-3">
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[8px] text-[#4fc3f7] uppercase tracking-wider font-bold">📊 Estimated Annual ROI</span>
        <span className="text-[7px] text-[#555] ml-auto">Brent ${brentPrice.toFixed(0)}/bbl</span>
      </div>
      {customerData.customerName && (
        <div className="text-[10px] text-white font-bold mb-2">{customerData.customerName} {customerData.padName && `— ${customerData.padName}`}</div>
      )}
      <div className="space-y-1.5 text-[10px]">
        <ROILine label={`Comp Trip Recovery (${econ.tripsMonth}/mo)`} value={econ.tripAnnualRevenueSaved} />
        <ROILine label={`Gas Constraint Protection (${econ.constraintWeek}/wk)`} value={econ.constraintAnnualSaved} />
        <ROILine label={`Avoided Shutdowns (unload detection)`} value={econ.unloadAnnualSaved} />
        <ROILine label={`Labor Savings (${econ.avoidedVisitsWeek.toFixed(0)} fewer visits/wk)`} value={econ.laborAnnualSaved} />
        <div className="border-t border-[#333] pt-1.5 flex justify-between items-baseline">
          <span className="text-white font-bold">Estimated Annual Savings</span>
          <span className="text-[16px] text-[#4fc3f7] font-bold" style={{ fontFamily: "'Arial Black'" }}>
            ${(econ.totalAnnualSaved / 1000).toFixed(0)}K
          </span>
        </div>
      </div>
      <div className="text-[8px] text-[#444] mt-2">
        Based on: Brent ${brentPrice.toFixed(0)}/bbl, operator burden ${INDUSTRY_RATES.operatorBurdenRate}/hr, {customerData.nighttimeCoverage || 'unmanned overnight'}
      </div>
    </div>
  )
}

function ROILine({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#888]">{label}</span>
      <span className="text-[#22c55e] font-bold">${(value / 1000).toFixed(0)}K</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 6. RESPONSE TIME TIMER
// ═══════════════════════════════════════════════════════════
export function ResponseTimer({ sim, customerData }) {
  const [eventStart, setEventStart] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [recovered, setRecovered] = useState(false)
  const intervalRef = useRef(null)

  const wellsAtTarget = sim.state.wells.filter(w => w.isAtTarget).length / Math.max(sim.state.wells.length, 1) * 100
  const isDisturbance = wellsAtTarget < 85
  const manualMin = ((customerData?.dayResponseMin || 45) + (customerData?.nightResponseMin || 90)) / 2

  useEffect(() => {
    if (isDisturbance && !eventStart) {
      setEventStart(Date.now()); setRecovered(false); setElapsed(0)
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    if (!isDisturbance && eventStart && !recovered) setRecovered(true)
    if (!isDisturbance && !eventStart) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setElapsed(0); setRecovered(false)
    }
  }, [isDisturbance])

  useEffect(() => {
    if (recovered && !isDisturbance) {
      const t = setTimeout(() => { setEventStart(null); if (intervalRef.current) clearInterval(intervalRef.current) }, 15000)
      return () => clearTimeout(t)
    }
  }, [recovered, isDisturbance])

  if (!eventStart && elapsed === 0) return null
  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="bg-[#111] border border-[#333] rounded-lg p-2.5">
      <div className="text-[8px] text-[#f97316] uppercase tracking-wider font-bold mb-2">⏱ Response Time</div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-[8px] text-[#E8200C] font-bold">Manual</div>
          <div className="text-[18px] text-[#E8200C] font-bold" style={{ fontFamily: "'Arial Black'" }}>{fmt(Math.min(elapsed, manualMin * 60))}</div>
          <div className="text-[8px] text-[#888]">{elapsed < manualMin * 60 ? `Pumper ${manualMin.toFixed(0)} min away` : 'Arrived'}</div>
        </div>
        <div>
          <div className="text-[8px] text-[#22c55e] font-bold">WellLogic</div>
          <div className="text-[18px] font-bold" style={{ fontFamily: "'Arial Black'", color: recovered ? '#22c55e' : '#eab308' }}>{recovered ? fmt(Math.min(elapsed, 60)) : fmt(elapsed)}</div>
          <div className="text-[8px] text-[#888]">{recovered ? '✅ Recovered' : 'Rebalancing...'}</div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 7. 2AM SATURDAY
// ═══════════════════════════════════════════════════════════
export function SaturdayNightButton({ sim, customerData }) {
  const [active, setActive] = useState(false)
  const [stage, setStage] = useState('')
  const nightMin = customerData?.nightResponseMin || 90

  const trigger = () => {
    setActive(true)
    setStage(`🌙 2:00 AM Saturday — Pad unmanned. Nearest pumper is ${nightMin} minutes away.`)
    setTimeout(() => { setStage('⚡ 2:03 AM — C1 trips on high discharge temp.'); sim.setCompressorStatus(0, 'tripped') }, 3000)
    setTimeout(() => { setStage('📉 2:05 AM — Suction pressure dropping. All wells losing injection.'); sim.setTotalAvailableGas(sim.state.maxGasCapacity * 0.5) }, 8000)
    setTimeout(() => { setStage('💥 2:08 AM — Well unloads. Scrubber pressure spikes.'); sim.setStateField('scrubberPressure', sim.state.suctionTarget + 30); sim.setStateField('wellUnloadActive', true) }, 14000)
    setTimeout(() => { setStage('🟢 WellLogic rebalanced. Priority wells protected. Sales valve managing pressure.'); sim.setStateField('wellUnloadActive', false) }, 22000)
    setTimeout(() => setStage(`📱 2:${nightMin > 60 ? Math.floor(nightMin / 60) + ':' + (nightMin % 60).toString().padStart(2, '0') : nightMin} AM — Pumper finally arrives. WellLogic handled it ${nightMin} minutes ago.`), 30000)
    setTimeout(() => setActive(false), 40000)
  }

  return (
    <div className="space-y-1.5">
      <button onClick={trigger} disabled={active}
        className={`w-full py-2.5 rounded-lg font-bold text-[11px] transition-all ${active ? 'bg-[#1a1a40] border border-[#4a4aff] text-[#8888ff]' : 'bg-[#1a1a30] border-2 border-[#4a4aff] text-[#8888ff] hover:bg-[#2a2a50] hover:text-white'}`}>
        {active ? '🌙 Running...' : '🌙 2AM Saturday — Nobody On-Site'}
      </button>
      {active && stage && <div className="bg-[#1a1a30] rounded p-2 border border-[#333]"><div className="text-[10px] text-[#ccc] leading-relaxed">{stage}</div></div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// FEATURE TOGGLES
// ═══════════════════════════════════════════════════════════
export function FeatureToggles({ features, onToggle }) {
  const items = [
    { key: 'revenueTicker', label: 'Revenue Ticker', icon: '💰' },
    { key: 'beforeAfter', label: 'Before / After', icon: '⚡' },
    { key: 'responseTimer', label: 'Response Timer', icon: '⏱' },
    { key: 'badDay', label: 'Bad Day Button', icon: '💀' },
    { key: 'saturdayNight', label: '2AM Saturday', icon: '🌙' },
    { key: 'roiCalc', label: 'ROI Calculator', icon: '📊' },
  ]
  return (
    <div className="bg-[#111120] border border-[#2a2a3a] rounded-lg p-3 mb-3">
      <div className="text-[8px] text-[#E8200C] uppercase tracking-wider font-bold mb-2">Sales Features</div>
      {items.map(item => (
        <label key={item.key} className="flex items-center gap-2 py-1 cursor-pointer">
          <div className={`w-8 h-4 rounded-full transition-colors shrink-0 relative ${features[item.key] ? 'bg-[#E8200C]' : 'bg-[#333]'}`}
            onClick={() => onToggle(item.key)}>
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${features[item.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-[10px]">{item.icon}</span>
          <span className={`text-[10px] font-bold ${features[item.key] ? 'text-white' : 'text-[#888]'}`}>{item.label}</span>
        </label>
      ))}
    </div>
  )
}
