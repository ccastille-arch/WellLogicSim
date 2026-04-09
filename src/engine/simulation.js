// Pure simulation engine — tick(state) → newState
// Models the Permian Resources Pad Optimization Panel logic
//
// REALISTIC BEHAVIOR:
// When a disturbance occurs (compressor trip, gas change), the system goes through phases:
//   Phase 1 - DISTURBANCE (0-5 sec): All wells see immediate flow loss proportionally
//   Phase 2 - DETECTION (5-15 sec): WellLogic detects the shortfall, begins calculating new allocation
//   Phase 3 - REBALANCING (15-60 sec): Chokes on low-priority wells close gradually,
//             high-priority wells recover to target. Not instant — valves move at realistic speed.
//   Phase 4 - STABLE: System reaches new steady state

const DEFAULT_COMPRESSOR_CAPACITY = 400 // MCFD per compressor
const DEFAULT_WELL_RATE = 150 // MCFD desired injection per well
const DEFAULT_WELL_PRODUCTION = 120 // BOE/day at full injection accuracy

const DEFAULT_SUCTION_TARGET = 80
const DEFAULT_SUCTION_HIGH_RANGE = 20
const DEFAULT_SUCTION_LOW_RANGE = 40
const DEFAULT_STAGGER_OFFSET = 2
const DEFAULT_DISCHARGE_SHUTDOWN = 600
const DEFAULT_DISCHARGE_SLOWDOWN_OFFSET = 50
const DEFAULT_COOLER_OUTLET_SP = 200
const DEFAULT_MAX_TEMP_AT_PLATE = 165
const DEFAULT_STABILITY_TIMER = 60
const DEFAULT_STAGING_LOCKOUT = 300

// Default tuning parameters — can be overridden at runtime via admin panel
export const DEFAULT_TUNING = {
  chokeMoveRate: 0.04,        // Choke valve travel speed per tick
  flowResponseRate: 0.06,     // Flow establishment through piping per tick
  productionLag: 0.03,        // Well production inertia per tick
  compressorRamp: 0.08,       // Compressor RPM/load change rate per tick
  pressureResponse: 0.10,     // Pressure change rate per tick
  rebalanceRate: 0.02,        // WellLogic allocation correction speed per tick
  disturbanceThreshold: 20,   // MCFD capacity change to trigger disturbance
  salesValveOpenRate: 0.15,   // Sales valve opening speed per tick
  salesValveCloseRate: 0.05,  // Sales valve closing speed per tick
  compressorSpindownRate: 0.06, // Compressor spindown speed per tick
  tickInterval: 500,          // Milliseconds per simulation tick
  unloadChance: 0.015,        // Random unload event probability per tick
}

export function createInitialState(config) {
  const { compressorCount, wellCount, siteType } = config

  const suctionTarget = config.suctionTarget ?? DEFAULT_SUCTION_TARGET
  const suctionLowRange = config.suctionLowRange ?? DEFAULT_SUCTION_LOW_RANGE
  const staggerOffset = config.staggerOffset ?? DEFAULT_STAGGER_OFFSET
  const dischargeShutdown = config.dischargeShutdownPressure ?? DEFAULT_DISCHARGE_SHUTDOWN
  const dischargeOffset = config.dischargeSlowdownOffset ?? DEFAULT_DISCHARGE_SLOWDOWN_OFFSET
  const coolerSP = config.coolerOutletSP ?? DEFAULT_COOLER_OUTLET_SP

  const compressors = Array.from({ length: compressorCount }, (_, i) => ({
    id: i,
    name: `C${i + 1}`,
    status: 'running',
    mode: 'auto',
    autoStartAllowed: true,
    personnelLockout: false,
    capacityMcfd: DEFAULT_COMPRESSOR_CAPACITY,
    rpm: 1050,
    suctionPsi: suctionTarget,
    dischargePsi: 400,
    loadPct: 0,
    actualThroughput: 0,
    speedAutoSuctionSP: suctionLowRange + 2 + i * staggerOffset,
    speedAutoDischargeSP: dischargeShutdown - dischargeOffset,
    coolerOutletSP: coolerSP,
    secondStageSuctionCoolerSP: config.secondStageSuctionCoolerSP ?? 200,
  }))

  const wells = Array.from({ length: wellCount }, (_, i) => ({
    id: i,
    name: `W${i + 1}`,
    priority: i,
    desiredRate: DEFAULT_WELL_RATE,
    actualRate: DEFAULT_WELL_RATE, // Start at steady state
    productionBoe: DEFAULT_WELL_PRODUCTION,
    baseProduction: DEFAULT_WELL_PRODUCTION + (Math.random() * 40 - 20),
    isHunting: false,
    huntPhase: Math.random() * Math.PI * 2,
    chokeManualSP: 80 + Math.floor(Math.random() * 20),
    chokeMode: 'auto',
    chokeAO: 100, // Start fully open at steady state
    isAtTarget: true,
    // WellLogic's CURRENT allocation target for this well (moves slowly toward optimum)
    _allocTarget: DEFAULT_WELL_RATE,
  }))

  const totalCapacity = compressors.reduce((sum, c) => sum + c.capacityMcfd, 0)

  return {
    config,
    compressors,
    wells,
    totalAvailableGas: totalCapacity,
    maxGasCapacity: totalCapacity,
    huntSequenceEnabled: false,
    tickCount: 0,
    simTime: 0,
    // Track previous capacity to detect disturbances
    _prevEffectiveGas: totalCapacity,
    suctionTarget: suctionTarget,
    suctionHighRange: config.suctionHighRange ?? DEFAULT_SUCTION_HIGH_RANGE,
    suctionLowRange: suctionLowRange,
    staggerOffset: staggerOffset,
    suctionHeaderPressure: suctionTarget,
    dischargeShutdownPressure: dischargeShutdown,
    dischargeSlowdownOffset: dischargeOffset,
    coolerOutletSP: coolerSP,
    maxTempAtPlate: config.maxTempAtPlate ?? DEFAULT_MAX_TEMP_AT_PLATE,
    flowMeterTemp: 155,
    scrubberPressure: suctionTarget,
    scrubberRateOfChange: 0,
    unloadRateThreshold: config.unloadRateThreshold ?? 5,
    unloadSpikeThreshold: config.unloadSpikeThreshold ?? 15,
    wellUnloadActive: false,
    salesValvePosition: 0,
    stabilityTimer: config.stabilityTimer ?? DEFAULT_STABILITY_TIMER,
    stagingLockoutTimer: config.stagingLockoutTimer ?? DEFAULT_STAGING_LOCKOUT,
    stagingLockoutRemaining: 0,
    flowRateMode: 'local',
    alarms: [],
    systemRunning: true,
    runningWellsLabel: '',
    // Tuning parameters — adjustable via admin panel
    tuning: { ...DEFAULT_TUNING, ...(config.tuning || {}) },
  }
}

export function tick(state) {
  const { compressors, wells, totalAvailableGas, huntSequenceEnabled, tickCount, tuning } = state
  const T = tuning || DEFAULT_TUNING
  const newTickCount = tickCount + 1
  const simTime = newTickCount * 3

  // ──────────────────────────────────────────────
  // 1. Hunt sequence
  // ──────────────────────────────────────────────
  const updatedWells = wells.map(w => {
    if (!huntSequenceEnabled) return { ...w, isHunting: false }
    const newPhase = w.huntPhase + 0.15
    const huntOffset = Math.sin(newPhase) * w.desiredRate * 0.10
    return { ...w, isHunting: true, huntPhase: newPhase, _huntAdjustedRate: Math.max(0, w.desiredRate + huntOffset) }
  })

  // ──────────────────────────────────────────────
  // 2. Calculate ACTUAL available gas right now
  // ──────────────────────────────────────────────
  const activeCompressors = compressors.filter(c => c.status === 'running' || c.status === 'locked_out_running')
  const onlineCapacity = activeCompressors.reduce((sum, c) => sum + c.capacityMcfd, 0)
  const effectiveGas = Math.min(totalAvailableGas, onlineCapacity)
  const prevEffective = state._prevEffectiveGas || effectiveGas

  // Detect if a disturbance just happened (capacity changed significantly)
  const capacityDelta = Math.abs(effectiveGas - prevEffective)
  const disturbanceOccurred = capacityDelta > T.disturbanceThreshold

  // ──────────────────────────────────────────────
  // 3. Calculate OPTIMUM allocation (what WellLogic WANTS to achieve)
  //    This is the "perfect" answer — but we don't apply it instantly
  // ──────────────────────────────────────────────
  const sortedWells = [...updatedWells].sort((a, b) => a.priority - b.priority)
  let remainingGas = effectiveGas
  const optimumAlloc = new Map()

  for (const well of sortedWells) {
    const desired = well._huntAdjustedRate || well.desiredRate
    const allocated = Math.min(desired, remainingGas)
    optimumAlloc.set(well.id, allocated)
    remainingGas = Math.max(0, remainingGas - allocated)
  }

  // ──────────────────────────────────────────────
  // 4. REALISTIC RESPONSE: Move allocation targets slowly toward optimum
  //    On disturbance: first ALL wells lose flow proportionally (physics),
  //    then WellLogic gradually corrects over 30-90 seconds
  // ──────────────────────────────────────────────
  const totalDesired = updatedWells.reduce((sum, w) => sum + (w._huntAdjustedRate || w.desiredRate), 0)
  const supplyRatio = totalDesired > 0 ? effectiveGas / totalDesired : 1

  const finalWells = updatedWells.map(w => {
    const desired = w._huntAdjustedRate || w.desiredRate
    const optimum = optimumAlloc.get(w.id) || 0
    let allocTarget = w._allocTarget || desired

    if (disturbanceOccurred) {
      // PHASE 1: Disturbance — all wells immediately see proportional flow loss
      // This simulates the physics: less gas in the header = less to everyone
      allocTarget = desired * Math.min(1, supplyRatio)
    } else {
      // PHASE 2-3: WellLogic gradually moves allocation toward optimum
      // High priority wells recover first (they get opened), low priority close down
      allocTarget = allocTarget + (optimum - allocTarget) * T.rebalanceRate
    }

    // Clamp
    allocTarget = Math.max(0, Math.min(desired, allocTarget))

    // Actual flow lags behind the allocation target (valve travel + piping)
    const actualRate = smooth(w.actualRate, allocTarget, T.flowResponseRate)

    // Choke position moves at realistic valve speed
    const targetChokeAO = desired > 0 ? Math.min(100, (allocTarget / desired) * 100) : 0
    const chokeAO = smooth(w.chokeAO, targetChokeAO, T.chokeMoveRate)

    // Production has the most inertia
    const accuracy = desired > 0 ? actualRate / desired : 1
    const isAtTarget = accuracy >= 0.95
    const targetProd = w.baseProduction * Math.min(accuracy, 1)
    const productionBoe = smooth(w.productionBoe, targetProd, T.productionLag)

    const { _huntAdjustedRate, ...rest } = w
    return {
      ...rest,
      actualRate,
      productionBoe,
      chokeAO,
      isAtTarget,
      _allocTarget: allocTarget,
    }
  })

  // ──────────────────────────────────────────────
  // 5. Suction header pressure
  // ──────────────────────────────────────────────
  const totalActualInjection = finalWells.reduce((sum, w) => sum + w.actualRate, 0)
  const supplyDemandRatio = totalDesired > 0 ? effectiveGas / totalDesired : 1
  const targetSuction = state.suctionTarget + (supplyDemandRatio - 1) * 30

  // On disturbance, pressure swings harder before settling
  const pressureNoise = disturbanceOccurred ? (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 2
  const suctionHeaderPressure = smooth(state.suctionHeaderPressure, targetSuction + pressureNoise, T.pressureResponse)

  // ──────────────────────────────────────────────
  // 6. Scrubber pressure
  // ──────────────────────────────────────────────
  const scrubberBase = suctionHeaderPressure + 5
  const unloadChance = Math.random()
  let scrubberPressure = state.scrubberPressure
  let wellUnloadActive = state.wellUnloadActive
  if (unloadChance > (1 - T.unloadChance)) {
    scrubberPressure = scrubberBase + 20 + Math.random() * 15
    wellUnloadActive = true
  } else {
    scrubberPressure = smooth(state.scrubberPressure, scrubberBase + (Math.random() - 0.5) * 3, 0.15)
    if (wellUnloadActive && Math.abs(scrubberPressure - scrubberBase) < 3) wellUnloadActive = false
  }
  const scrubberRateOfChange = (scrubberPressure - state.scrubberPressure) / 3

  // ──────────────────────────────────────────────
  // 7. Sales valve
  // ──────────────────────────────────────────────
  let salesValvePosition = state.salesValvePosition
  const upperLimit = state.suctionTarget + state.suctionHighRange
  if (suctionHeaderPressure > upperLimit || wellUnloadActive) {
    salesValvePosition = smooth(salesValvePosition, Math.min(100, (suctionHeaderPressure - upperLimit) * 5 + 30), T.salesValveOpenRate)
  } else {
    salesValvePosition = smooth(salesValvePosition, 0, T.salesValveCloseRate)
  }

  // ──────────────────────────────────────────────
  // 8. Flow meter temperature
  // ──────────────────────────────────────────────
  const flowMeterTemp = 150 + Math.random() * 20 + (totalActualInjection / (totalDesired || 1)) * 10

  // ──────────────────────────────────────────────
  // 9. Compressor telemetry — REALISTIC ramp rates
  // ──────────────────────────────────────────────
  const stagingLockoutRemaining = Math.max(0, state.stagingLockoutRemaining - 3)

  const finalCompressors = compressors.map((c, i) => {
    const isProducing = c.status === 'running' || c.status === 'locked_out_running'

    if (!isProducing) {
      // Compressor spinning down — takes time to stop
      return {
        ...c,
        rpm: smooth(c.rpm, 0, T.compressorSpindownRate),
        suctionPsi: smooth(c.suctionPsi, suctionHeaderPressure, T.pressureResponse),
        dischargePsi: smooth(c.dischargePsi, 0, T.compressorSpindownRate),
        loadPct: smooth(c.loadPct, 0, T.compressorSpindownRate),
        actualThroughput: smooth(c.actualThroughput, 0, T.compressorSpindownRate),
      }
    }

    const shareOfLoad = activeCompressors.length > 0
      ? totalActualInjection / activeCompressors.length : 0
    const loadPct = c.capacityMcfd > 0 ? (shareOfLoad / c.capacityMcfd) * 100 : 0
    const clampedLoad = Math.min(100, Math.max(0, loadPct))

    const rpm = 950 + (clampedLoad / 100) * 200
    const suctionPsi = suctionHeaderPressure + (Math.random() - 0.5) * 2
    const dischargePsi = 200 + (clampedLoad / 100) * 400

    const noise = () => (Math.random() - 0.5) * 2
    const speedAutoSuctionSP = state.suctionLowRange + 2 + i * state.staggerOffset

    return {
      ...c,
      rpm: smooth(c.rpm, rpm + noise() * 5, T.compressorRamp),
      suctionPsi: smooth(c.suctionPsi, suctionPsi, T.pressureResponse),
      dischargePsi: smooth(c.dischargePsi, dischargePsi + noise() * 5, T.compressorRamp),
      loadPct: smooth(c.loadPct, clampedLoad, T.compressorRamp),
      actualThroughput: smooth(c.actualThroughput, shareOfLoad, T.flowResponseRate),
      speedAutoSuctionSP,
      speedAutoDischargeSP: state.dischargeShutdownPressure - state.dischargeSlowdownOffset,
    }
  })

  // ──────────────────────────────────────────────
  // 10. Alarms
  // ──────────────────────────────────────────────
  const alarms = []
  const lockedOutCompressors = finalCompressors.filter(c => c.personnelLockout)
  if (lockedOutCompressors.length === 1) {
    alarms.push({ type: 'warning', message: `${lockedOutCompressors[0].name} Personnel Lockout Active` })
  }
  if (lockedOutCompressors.length > 1 && lockedOutCompressors.length < finalCompressors.length) {
    alarms.push({ type: 'warning', message: 'Multiple Compressors in Personnel Lockout' })
  }
  if (lockedOutCompressors.length === finalCompressors.length) {
    alarms.push({ type: 'critical', message: 'All Compressors in Personnel Lockout – Remote Optimization Disabled' })
  }
  if (wellUnloadActive) alarms.push({ type: 'info', message: 'Well Unload Event Detected' })
  if (flowMeterTemp > state.maxTempAtPlate) alarms.push({ type: 'warning', message: 'Gas Temperature High at Flow Meter' })
  if (suctionHeaderPressure > upperLimit) alarms.push({ type: 'warning', message: 'Suction Pressure Above Upper Range' })

  // Wells not at target
  const wellsNotAtTarget = finalWells.filter(w => !w.isAtTarget && w.desiredRate > 0)
  if (wellsNotAtTarget.length > 0) {
    alarms.push({ type: 'warning', message: `${wellsNotAtTarget.length} well(s) below target injection rate` })
  }

  const runningWells = finalWells.filter(w => w.actualRate > 10).map(w => w.name).join(', ')

  return {
    ...state,
    compressors: finalCompressors,
    wells: finalWells,
    tickCount: newTickCount,
    simTime,
    _prevEffectiveGas: effectiveGas,
    suctionHeaderPressure,
    scrubberPressure,
    scrubberRateOfChange,
    wellUnloadActive,
    salesValvePosition: Math.max(0, salesValvePosition),
    flowMeterTemp,
    stagingLockoutRemaining,
    alarms,
    runningWellsLabel: runningWells,
  }
}

function smooth(current, target, factor) {
  return current + (target - current) * factor
}

export function getMetrics(state) {
  const { compressors, wells } = state
  const totalActual = wells.reduce((sum, w) => sum + w.actualRate, 0)
  const totalDesired = wells.reduce((sum, w) => sum + w.desiredRate, 0)
  const totalProduction = wells.reduce((sum, w) => sum + w.productionBoe, 0)
  const onlineCompressors = compressors.filter(c => c.status === 'running' || c.status === 'locked_out_running').length
  const wellsAtTarget = wells.filter(w => w.isAtTarget).length

  return {
    totalActualMcfd: totalActual,
    totalDesiredMcfd: totalDesired,
    injectionAccuracy: totalDesired > 0 ? (totalActual / totalDesired) * 100 : 100,
    totalProductionBoe: totalProduction,
    compressorsOnline: onlineCompressors,
    compressorsTotal: compressors.length,
    wellsAtTarget,
    wellsTotal: wells.length,
  }
}
