// Sales Features â€” enable/disable overlays for the demo mode
// Economics calculated from questionnaire answers plus a fixed demo Brent assumption.

import { useState, useEffect, useRef } from 'react'
import { INDUSTRY_RATES } from './CustomerQuestionnaire'

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BRENT CRUDE PRICE â€” fixed demo benchmark so live data stays isolated to the
// dedicated "View Live Data" experience.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let cachedBrentPrice = 72

export function useBrentPrice() {
  const [price] = useState(cachedBrentPrice)
  const [source] = useState('demo')

  return { brentPrice: price, priceSource: source }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ECONOMICS ENGINE â€” calculates all $/costs from questionnaire
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

  // FULL manual cycle: drive out + diagnose + wait mechanic + fix + drive BACK + readjust chokes
  const blendedDriveMin = (dayResponse + nightResponse) / 2
  const diagnoseMin = 15
  const mechWaitMin = 60
  const fixMin = 30
  const returnDriveMin = blendedDriveMin // operator drives BACK to readjust chokes
  const chokeAdjustMin = 20
  const blendedResponseMin = blendedDriveMin
  const totalManualMin = blendedDriveMin + diagnoseMin + mechWaitMin + fixMin + returnDriveMin + chokeAdjustMin
  const totalManualHrs = totalManualMin / 60

  // Per-event production loss (BOE lost during FULL manual cycle)
  const padDailyProduction = wellCount * avgProd
  const boePerHour = padDailyProduction / 24
  const boeLostPerTrip = boePerHour * totalManualHrs * 0.7 // 70% of pad affected during full cycle
  const boeSavedPerTrip = boeLostPerTrip * R.wellLogicRecoveryPct

  // Revenue per BOE (Brent crude is a proxy â€” actual wellhead price is lower)
  const wellheadDiscount = 0.85 // wellhead ~85% of Brent
  const boeValue = brentPrice * wellheadDiscount

  // === COMPRESSOR TRIP SAVINGS ===
  const tripRevenueSavedPerEvent = boeSavedPerTrip * boeValue
  const tripAnnualRevenueSaved = tripRevenueSavedPerEvent * tripsMonth * 12

  // === GAS CONSTRAINT SAVINGS ===
  const constraintLostBoePerEvent = padDailyProduction * R.constraintProductionLoss * (totalManualHrs / 24)
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 1. REVENUE IMPACT TICKER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function RevenueTicker({ sim, customerData, brentPrice }) {
  const [cumulativeSaved, setCumulativeSaved] = useState(0)
  const prevAccuracyRef = useRef(100)

  const wells = sim?.state?.wells || []
  const econ = calculateEconomics(customerData || {}, brentPrice || 72)
  const totalDesired = wells.reduce((s, w) => s + (w.desiredRate || 0), 0)
  const totalActual = wells.reduce((s, w) => s + (w.actualRate || 0), 0)
  const accuracy = totalDesired > 0 ? totalActual / totalDesired : 1

  const lostPerHour = (econ.boePerHour || 0) * (1 - Math.min(1, accuracy)) * (econ.boeValue || 0)
  const productionValuePerHour = (econ.boePerHour || 0) * (econ.boeValue || 0)

  useEffect(() => {
    if (!wells.length) return
    if (accuracy > prevAccuracyRef.current && accuracy < 0.99) {
      const delta = accuracy - prevAccuracyRef.current
      setCumulativeSaved(prev => prev + delta * (econ.boePerHour || 0) * (econ.boeValue || 0) * 0.5)
    }
    prevAccuracyRef.current = accuracy
  }, [sim?.state?.tickCount])

  if (!wells.length) return null

  return (
    <div className="bg-[#0a1a0a] border border-[#22c55e]/30 rounded-lg p-2.5">
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-[8px] text-[#22c55e] uppercase tracking-wider font-bold">Revenue Impact</span>
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

function clampPct(value) {
  return Math.max(0, Math.min(100, value))
}

function getEffectivePadCapacity(simState) {
  const compressors = simState?.compressors || []
  const totalAvailableGas = simState?.totalAvailableGas || 0
  const onlineCapacity = compressors
    .filter(c => c.status === 'running' || c.status === 'locked_out_running')
    .reduce((sum, c) => sum + (c.capacityMcfd || 0), 0)

  return Math.min(totalAvailableGas, onlineCapacity)
}

function getAutoProductionPct(wells) {
  const totalPotential = wells.reduce((sum, w) => sum + (w.baseProduction || w.productionBoe || 0), 0)
  const totalActual = wells.reduce((sum, w) => sum + (w.productionBoe || 0), 0)
  return totalPotential > 0 ? clampPct((totalActual / totalPotential) * 100) : 100
}

function getManualProductionPct(simState) {
  const wells = simState?.wells || []
  if (!wells.length) return 100

  const activeWells = wells.filter(w => (w.desiredRate || 0) > 0)
  if (!activeWells.length) return 100

  const effectiveGas = getEffectivePadCapacity(simState)
  const equalShareRate = effectiveGas / activeWells.length
  const totalPotential = activeWells.reduce((sum, w) => sum + (w.baseProduction || w.productionBoe || 0), 0)

  const estimatedManualProduction = activeWells.reduce((sum, w) => {
    const desiredRate = Math.max(w.desiredRate || 0, 1)
    const shareFraction = Math.min(1, equalShareRate / desiredRate)
    // When every well is starved equally, production degrades harder than a
    // prioritized pad because no well gets fully protected.
    const productionFraction = Math.pow(shareFraction, 1.15)
    return sum + (w.baseProduction || w.productionBoe || 0) * productionFraction
  }, 0)

  return totalPotential > 0 ? clampPct((estimatedManualProduction / totalPotential) * 100) : 100
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 2. PRODUCTION RECOVERY COMPARISON
// Shows the full manual workflow vs Pad Logic automatic response
// Manual: SCADA alarm â†’ dispatch operator â†’ drive to pad â†’ diagnose â†’
//         call out mechanic â†’ mechanic fixes comp â†’ operator returns â†’
//         operator readjusts chokes â†’ production restored
// Pad Logic: detects â†’ rebalances chokes automatically â†’ production protected
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function BeforeAfterOverlay({ sim, customerData }) {
  const [manualState, setManualState] = useState({ elapsed: 0, phase: 'idle' })
  const intervalRef = useRef(null)

  const wells = sim?.state?.wells || []
  const autoProdPct = getAutoProductionPct(wells)
  const manualProdPct = getManualProductionPct(sim?.state)
  const isDisturbance = autoProdPct < 95

  // Manual timeline (scaled for demo â€” real times shown in labels)
  const driveTime1 = (customerData?.dayResponseMin || 45) // min â€” first dispatch
  const diagTime = 15 // min to diagnose
  const mechWait = 60 // min waiting for mechanic
  const fixTime = 30 // min for mechanic to fix
  const driveTime2 = driveTime1 // operator drives BACK to readjust chokes
  const chokeAdjust = 20 // min to manually readjust all chokes
  const totalManualMin = driveTime1 + diagTime + mechWait + fixTime + driveTime2 + chokeAdjust

  // Scaled for demo (1 real second = ~3 min of real time)
  const scaleFactor = 3
  const phase1End = driveTime1 / scaleFactor
  const phase2End = phase1End + diagTime / scaleFactor
  const phase3End = phase2End + mechWait / scaleFactor
  const phase4End = phase3End + fixTime / scaleFactor
  const phase5End = phase4End + driveTime2 / scaleFactor
  const phase6End = phase5End + chokeAdjust / scaleFactor

  useEffect(() => {
    if (isDisturbance && !intervalRef.current) {
      setManualState({ elapsed: 0, phase: 'alarm' })
      intervalRef.current = setInterval(() => {
        setManualState(prev => {
          const e = prev.elapsed + 1
          let phase = 'alarm'
          if (e >= phase1End) phase = 'diagnose'
          if (e >= phase2End) phase = 'waiting_mechanic'
          if (e >= phase3End) phase = 'mechanic_fixing'
          if (e >= phase4End) phase = 'operator_returning'
          if (e >= phase5End) phase = 'readjusting_chokes'
          if (e >= phase6End) phase = 'restored'
          return { elapsed: e, phase }
        })
      }, 1000)
    }
    if (!isDisturbance && intervalRef.current) {
      clearInterval(intervalRef.current); intervalRef.current = null
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isDisturbance])

  if (!isDisturbance && manualState.elapsed === 0) return null

  const { elapsed, phase } = manualState

  const phaseLabels = {
    alarm: `SCADA alarm fired - dispatching operator (${driveTime1} min drive)`,
    diagnose: `Operator on-site - diagnosing issue (~${diagTime} min)`,
    waiting_mechanic: `Called mechanic - waiting for arrival (~${mechWait} min)`,
    mechanic_fixing: `Mechanic repairing compressor (~${fixTime} min)`,
    operator_returning: `Comp fixed - dispatching operator BACK to readjust chokes (${driveTime2} min drive)`,
    readjusting_chokes: `Operator manually readjusting chokes on ${sim.state.wells.length} wells (~${chokeAdjust} min)`,
    restored: `Production finally restored - total time: ${totalManualMin} min (${(totalManualMin / 60).toFixed(1)} hrs)`,
  }

  return (
    <div className="bg-[#111] border border-[#333] rounded-lg p-2.5">
      <div className="text-[8px] text-[#f97316] uppercase tracking-wider font-bold mb-1">
        Production Recovery Comparison - What Happens When a Compressor Goes Down?
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* MANUAL SIDE */}
        <div className="bg-[#1a0808] rounded p-2 border border-[#E8200C]/20">
          <div className="text-[9px] text-[#E8200C] font-bold mb-1">TODAY - Manual Response</div>
          <div className="w-full bg-[#200] rounded h-3 overflow-hidden">
            <div className="h-full bg-[#E8200C] transition-all duration-1000" style={{ width: `${manualProdPct}%` }} />
          </div>
          <div className="text-[10px] text-[#E8200C] font-bold mt-1">{manualProdPct.toFixed(0)}% production</div>
          <div className="text-[8px] text-[#ccc] mt-1 leading-relaxed">{phaseLabels[phase]}</div>
          {/* Timeline steps */}
          <div className="mt-1.5 space-y-0.5">
            {[
              { p: 'alarm', t: `Drive to pad (${driveTime1} min)` },
              { p: 'diagnose', t: `Diagnose (${diagTime} min)` },
              { p: 'waiting_mechanic', t: `Wait for mechanic (${mechWait} min)` },
              { p: 'mechanic_fixing', t: `Mechanic repairs (${fixTime} min)` },
              { p: 'operator_returning', t: `Operator drives back (${driveTime2} min)` },
              { p: 'readjusting_chokes', t: `Readjust chokes (${chokeAdjust} min)` },
            ].map((step, i) => {
              const phases = ['alarm','diagnose','waiting_mechanic','mechanic_fixing','operator_returning','readjusting_chokes','restored']
              const current = phases.indexOf(phase)
              const stepIdx = phases.indexOf(step.p)
              const done = current > stepIdx
              const active = current === stepIdx
              return (
                <div key={i} className={`text-[7px] flex items-center gap-1 ${done ? 'text-[#E8200C]' : active ? 'text-white' : 'text-[#444]'}`}>
                  <span>{done ? 'DONE' : active ? 'NOW' : 'WAIT'}</span>
                  <span>{step.t}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* WELLLOGIC SIDE */}
        <div className="bg-[#081a08] rounded p-2 border border-[#22c55e]/20">
          <div className="text-[9px] text-[#22c55e] font-bold mb-1">WITH PAD LOGIC - Automatic</div>
          <div className="w-full bg-[#020] rounded h-3 overflow-hidden">
            <div className="h-full bg-[#22c55e] transition-all duration-1000" style={{ width: `${autoProdPct}%` }} />
          </div>
          <div className="text-[10px] text-[#22c55e] font-bold mt-1">{autoProdPct.toFixed(0)}% production</div>
          <div className="text-[8px] text-[#ccc] mt-1 leading-relaxed">
            {autoProdPct >= 95
              ? 'Priority wells at full injection. Low-priority wells curtailed to protect top producers.'
              : autoProdPct >= 70
              ? 'Rebalancing in progress - closing chokes on low-priority wells, protecting top producers.'
              : 'Disturbance detected - reallocating gas by well priority...'}
          </div>
          <div className="mt-1.5 space-y-0.5">
            <div className="text-[7px] text-[#22c55e] flex items-center gap-1"><span>OK</span><span>Detects shortfall (instant)</span></div>
            <div className={`text-[7px] flex items-center gap-1 ${autoProdPct >= 50 ? 'text-[#22c55e]' : 'text-white'}`}>
              <span>{autoProdPct >= 50 ? 'OK' : 'NOW'}</span><span>Rebalances chokes (30-60 sec)</span>
            </div>
            <div className={`text-[7px] flex items-center gap-1 ${autoProdPct >= 90 ? 'text-[#22c55e]' : 'text-[#444]'}`}>
              <span>{autoProdPct >= 90 ? 'OK' : 'WAIT'}</span><span>Priority wells at target</span>
            </div>
            <div className={`text-[7px] flex items-center gap-1 ${autoProdPct >= 95 ? 'text-[#22c55e]' : 'text-[#444]'}`}>
              <span>{autoProdPct >= 95 ? 'OK' : 'WAIT'}</span><span>Stable - no operator needed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 3. BAD DAY CHAOS BUTTON
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
        {chaosActive ? 'CHAOS IN PROGRESS...' : 'THE BAD DAY'}
      </button>
      <button onClick={reset} className="w-full py-1.5 rounded text-[10px] text-[#888] border border-[#333] hover:text-white">Reset</button>
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 5. ROI CALCULATOR â€” uses questionnaire + burden rates + Brent
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function ROICalculator({ customerData, brentPrice }) {
  const econ = calculateEconomics(customerData, brentPrice)

  return (
    <div className="bg-[#0a0a1a] border border-[#4fc3f7]/30 rounded-lg p-3">
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[8px] text-[#4fc3f7] uppercase tracking-wider font-bold">Estimated Annual ROI</span>
        <span className="text-[7px] text-[#555] ml-auto">Brent ${brentPrice.toFixed(0)}/bbl</span>
      </div>
      {customerData.customerName && (
        <div className="text-[10px] text-white font-bold mb-2">{customerData.customerName} {customerData.padName && `- ${customerData.padName}`}</div>
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 6. TIME TO FULL PRODUCTION RECOVERY
// Manual: drive1 + diagnose + wait mechanic + fix + drive2 + readjust chokes
// Pad Logic: 30-60 seconds automatic
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function ResponseTimer({ sim, customerData }) {
  const [eventStart, setEventStart] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [recovered, setRecovered] = useState(false)
  const intervalRef = useRef(null)

  const wells = sim?.state?.wells || []
  const wellsAtTarget = wells.length ? wells.filter(w => w.isAtTarget).length / wells.length * 100 : 100
  const isDisturbance = wellsAtTarget < 85

  // Full manual cycle times from questionnaire
  const drive1 = customerData?.dayResponseMin || 45
  const diagnose = 15
  const mechWait = 60
  const fix = 30
  const drive2 = drive1 // RETURN TRIP â€” operator drives back to readjust
  const chokeAdj = 20
  const totalManualMin = drive1 + diagnose + mechWait + fix + drive2 + chokeAdj

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
      <div className="text-[8px] text-[#f97316] uppercase tracking-wider font-bold mb-1">
        Time to Full Production Recovery
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* MANUAL */}
        <div className="text-center bg-[#1a0808] rounded p-2 border border-[#E8200C]/20">
          <div className="text-[8px] text-[#E8200C] font-bold mb-0.5">Manual - Operator + Mechanic</div>
          <div className="text-[20px] text-[#E8200C] font-bold" style={{ fontFamily: "'Arial Black'" }}>
            {totalManualMin} min
          </div>
          <div className="text-[7px] text-[#888] leading-relaxed mt-1">
            Drive out ({drive1}m) + Diagnose ({diagnose}m) + Wait for mechanic ({mechWait}m) + Repair ({fix}m) + <span className="text-[#E8200C]">Operator drives BACK ({drive2}m)</span> + Readjust chokes ({chokeAdj}m)
          </div>
          <div className="text-[8px] text-[#E8200C] font-bold mt-1">= {(totalManualMin / 60).toFixed(1)} hours of lost production</div>
        </div>

        {/* WELLLOGIC */}
        <div className="text-center bg-[#081a08] rounded p-2 border border-[#22c55e]/20">
          <div className="text-[8px] text-[#22c55e] font-bold mb-0.5">Pad Logic - Fully Automatic</div>
          <div className="text-[20px] font-bold" style={{ fontFamily: "'Arial Black'", color: recovered ? '#22c55e' : '#eab308' }}>
            {recovered ? fmt(Math.min(elapsed, 60)) : fmt(elapsed)}
          </div>
          <div className="text-[7px] text-[#888] leading-relaxed mt-1">
            {recovered
              ? 'Priority wells at target. No operator dispatch needed. Mechanic dispatched only for compressor - chokes already handled.'
              : 'Detecting shortfall and rebalancing injection across wells by priority...'}
          </div>
          <div className="text-[8px] text-[#22c55e] font-bold mt-1">
            {recovered ? 'Production protected - zero operator trips for choke adjustment' : 'Rebalancing...'}
          </div>
        </div>
      </div>
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// 7. 2AM SATURDAY
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function SaturdayNightButton({ sim, customerData }) {
  const [active, setActive] = useState(false)
  const [stage, setStage] = useState('')
  const nightMin = customerData?.nightResponseMin || 90

  const trigger = () => {
    setActive(true)
    setStage(`2:00 AM Saturday - Pad unmanned. Nearest pumper is ${nightMin} minutes away.`)
    setTimeout(() => { setStage('2:03 AM - C1 trips on high discharge temp.'); sim.setCompressorStatus(0, 'tripped') }, 3000)
    setTimeout(() => { setStage('2:05 AM - Suction pressure dropping. All wells losing injection.'); sim.setTotalAvailableGas(sim.state.maxGasCapacity * 0.5) }, 8000)
    setTimeout(() => { setStage('2:08 AM - Well unloads. Scrubber pressure spikes.'); sim.setStateField('scrubberPressure', sim.state.suctionTarget + 30); sim.setStateField('wellUnloadActive', true) }, 14000)
    setTimeout(() => { setStage('Pad Logic rebalanced. Priority wells protected. Sales valve managing pressure.'); sim.setStateField('wellUnloadActive', false) }, 22000)
    setTimeout(() => setStage(`2:${nightMin > 60 ? Math.floor(nightMin / 60) + ':' + (nightMin % 60).toString().padStart(2, '0') : nightMin} AM - Pumper finally arrives. Pad Logic handled it ${nightMin} minutes ago.`), 30000)
    setTimeout(() => setActive(false), 40000)
  }

  return (
    <div className="space-y-1.5">
      <button onClick={trigger} disabled={active}
        className={`w-full py-2.5 rounded-lg font-bold text-[11px] transition-all ${active ? 'bg-[#1a1a40] border border-[#4a4aff] text-[#8888ff]' : 'bg-[#1a1a30] border-2 border-[#4a4aff] text-[#8888ff] hover:bg-[#2a2a50] hover:text-white'}`}>
        {active ? 'Running...' : '2AM Saturday - Nobody On-Site'}
      </button>
      {active && stage && <div className="bg-[#1a1a30] rounded p-2 border border-[#333]"><div className="text-[10px] text-[#ccc] leading-relaxed">{stage}</div></div>}
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FEATURE TOGGLES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function FeatureToggles({ features, onToggle }) {
  const items = [
    { key: 'revenueTicker', label: 'Revenue Ticker', icon: 'REV' },
    { key: 'beforeAfter', label: 'Before / After', icon: 'CMP' },
    { key: 'responseTimer', label: 'Response Timer', icon: 'TIME' },
    { key: 'badDay', label: 'Bad Day Button', icon: 'BAD' },
    { key: 'saturdayNight', label: '2AM Saturday', icon: 'NITE' },
    { key: 'roiCalc', label: 'ROI Calculator', icon: 'ROI' },
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


