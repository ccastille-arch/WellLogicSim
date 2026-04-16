// Pure simulation engine — tick(state) → newState
// Models the Pad Optimization Panel logic
//
// REALISTIC BEHAVIOR:
// When a disturbance occurs (compressor trip, gas change), the system goes through phases:
//   Phase 1 - DISTURBANCE (0-5 sec): All wells see immediate flow loss proportionally
//   Phase 2 - DETECTION (5-15 sec): WellLogic detects the shortfall, begins calculating new allocation
//   Phase 3 - REBALANCING (15-60 sec): Chokes on low-priority wells close gradually,
//             high-priority wells recover to target. Not instant — valves move at realistic speed.
//   Phase 4 - STABLE: System reaches new steady state
//
// WELLHEAD PARAMETERS calibrated from Klondike COP0001 30-day field data:
//   Total pad injection: 2910–3380 MSCFD (4 wells, 2 compressors)
//   Per-well flow: ~800 MCFD at setpoint
//   Static injection pressure: 779–861 PSI (typical ~805)
//   Differential pressure: 41–50 PSI typical (spikes to 800+ during unload events)
//   Injection temperature: 116–151°F (typical ~137)
//   Choke AO: 65–68% (tight band — system well-optimized)

const DEFAULT_COMPRESSOR_CAPACITY = 1600 // MCFD per compressor
const DEFAULT_WELL_RATE = 800 // MCFD desired injection per well (Klondike calibrated)
const DEFAULT_WELL_PRODUCTION = 120 // BOE/day at full injection accuracy
export const GAS_SUPPLY_UI_MAX = 10000000 // MCFD

// Klondike-calibrated wellhead parameter defaults
const KLONDIKE_STATIC_PRESSURE = 805   // PSI — typical injection static pressure
const KLONDIKE_DIFF_PRESSURE = 45      // PSI — typical differential across choke
const KLONDIKE_TEMP = 137              // °F — typical injection temperature
const KLONDIKE_CHOKE_AO = 66.5        // % — typical choke analog output

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
const DEFAULT_STARTUP_ASSIST_WELLS = 2
const DEFAULT_STARTUP_FIXED_CHOKE = 38
const DEFAULT_STARTUP_ASSIST_DURATION = 18

// Default tuning parameters — can be overridden at runtime via admin panel
export const DEFAULT_TUNING = {
  chokeMoveRate: 0.255,         // 50% between 0.01 and 0.50
  flowResponseRate: 0.255,      // 50% between 0.01 and 0.50
  productionLag: 0.1525,        // 50% between 0.005 and 0.30
  compressorRamp: 0.26,         // 50% between 0.02 and 0.50
  pressureResponse: 0.26,       // 50% between 0.02 and 0.50
  rebalanceRate: 0.1525,        // 50% between 0.005 and 0.30
  disturbanceThreshold: 52.5,   // 50% between 5 and 100
  salesValveOpenRate: 0.26,     // 50% between 0.02 and 0.50
  salesValveCloseRate: 0.155,   // 50% between 0.01 and 0.30
  compressorSpindownRate: 0.16, // 50% between 0.02 and 0.30
  tickInterval: 1050,           // 50% between 100 and 2000 ms
  unloadChance: 0.05,           // 50% between 0 and 0.10
}

export function createInitialState(config) {
  const { compressorCount, wellCount, siteType } = config
  const compressorMaxFlowRate = config.compressorMaxFlowRate ?? DEFAULT_COMPRESSOR_CAPACITY

  const suctionTarget = config.suctionTarget ?? DEFAULT_SUCTION_TARGET
  const suctionLowRange = config.suctionLowRange ?? DEFAULT_SUCTION_LOW_RANGE
  const staggerOffset = config.staggerOffset ?? DEFAULT_STAGGER_OFFSET
  const dischargeShutdown = config.dischargeShutdownPressure ?? DEFAULT_DISCHARGE_SHUTDOWN
  const dischargeOffset = config.dischargeSlowdownOffset ?? DEFAULT_DISCHARGE_SLOWDOWN_OFFSET
  const coolerSP = config.coolerOutletSP ?? DEFAULT_COOLER_OUTLET_SP
  const startupAssistWellCount = config.startupAssistWellCount ?? DEFAULT_STARTUP_ASSIST_WELLS
  const startupFixedChokePct = config.startupFixedChokePct ?? DEFAULT_STARTUP_FIXED_CHOKE
  const startupAssistDuration = config.startupAssistDuration ?? DEFAULT_STARTUP_ASSIST_DURATION

  const compressors = Array.from({ length: compressorCount }, (_, i) => ({
    id: i,
    name: `C${i + 1}`,
    status: 'running',
    mode: 'auto',
    autoStartAllowed: true,
    personnelLockout: false,
    capacityMcfd: compressorMaxFlowRate,
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

  // Klondike setpoints: W1=1000, W2=750, W3=800, W4=800 MCFD
  const KLONDIKE_SETPOINTS = [1000, 750, 800, 800]

  const wells = Array.from({ length: wellCount }, (_, i) => {
    const setpoint = config.wellSetpoints?.[i] ?? KLONDIKE_SETPOINTS[i] ?? DEFAULT_WELL_RATE
    return {
      id: i,
      name: `W${i + 1}`,
      priority: i,
      desiredRate: setpoint,
      actualRate: setpoint, // Start at steady state
      productionBoe: DEFAULT_WELL_PRODUCTION,
      baseProduction: DEFAULT_WELL_PRODUCTION + (Math.random() * 40 - 20),
      isHunting: false,
      huntPhase: Math.random() * Math.PI * 2,
      chokeManualSP: 80 + Math.floor(Math.random() * 20),
      chokeMode: 'auto',
      chokeAO: KLONDIKE_CHOKE_AO + (Math.random() * 2 - 1), // Start near field-calibrated AO
      isAtTarget: true,
      // WellLogic's CURRENT allocation target for this well (moves slowly toward optimum)
      _allocTarget: setpoint,
      // Wellhead sensor parameters (Klondike-calibrated starting values)
      injectionPressure: KLONDIKE_STATIC_PRESSURE + (Math.random() * 10 - 5),
      diffPressure: KLONDIKE_DIFF_PRESSURE + (Math.random() * 4 - 2),
      injectionTemp: KLONDIKE_TEMP + (Math.random() * 6 - 3),
    }
  })

  const totalCapacity = compressors.reduce((sum, c) => sum + c.capacityMcfd, 0)
  const totalDesiredRate = wells.reduce((sum, well) => sum + well.desiredRate, 0)
  const initialDeliveredGas = Math.min(totalDesiredRate, totalCapacity)
  const initializedCompressors = compressors.map((compressor) => {
    const throughput = compressors.length > 0 ? initialDeliveredGas / compressors.length : 0
    const boundedThroughput = Math.min(throughput, compressor.capacityMcfd)
    const loadPct = compressor.capacityMcfd > 0 ? (boundedThroughput / compressor.capacityMcfd) * 100 : 0

    return {
      ...compressor,
      loadPct,
      actualThroughput: boundedThroughput,
    }
  })

  return {
    config: {
      ...config,
      compressorMaxFlowRate,
      startupAssistWellCount,
      startupFixedChokePct,
      startupAssistDuration,
    },
    compressors: initializedCompressors,
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
    startupAssistRemaining: 0,
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
  const compressorsOffline = onlineCapacity <= 0

  // Detect if a disturbance just happened (capacity changed significantly)
  const capacityDelta = effectiveGas - prevEffective
  const disturbanceOccurred = Math.abs(capacityDelta) > T.disturbanceThreshold
  const capacityDropped = capacityDelta < -T.disturbanceThreshold
  const capacityGained = capacityDelta > T.disturbanceThreshold
  const coldStartRecovery = prevEffective <= T.disturbanceThreshold && effectiveGas > T.disturbanceThreshold

  // ──────────────────────────────────────────────
  // 3. Calculate OPTIMUM allocation (what WellLogic WANTS to achieve)
  //    This is the "perfect" answer — but we don't apply it instantly
  // ──────────────────────────────────────────────
  const sortedWells = sortedByPriority(updatedWells)
  let remainingGas = effectiveGas
  const optimumAlloc = new Map()
  const startupAssistRemaining = coldStartRecovery
    ? state.config.startupAssistDuration
    : Math.max(0, (state.startupAssistRemaining || 0) - 3)
  const startupAssistActive = !compressorsOffline && startupAssistRemaining > 0
  const startupAssistWellIds = new Set(
    sortedWells
      .slice(0, Math.max(0, Math.min(state.config.startupAssistWellCount || 0, sortedWells.length)))
      .map(well => well.id),
  )

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

  const finalWells = updatedWells.map((w, i) => {
    const desired = w._huntAdjustedRate || w.desiredRate
    const optimum = optimumAlloc.get(w.id) || 0
    let allocTarget = w._allocTarget || desired

    if (capacityDropped) {
      // On a compressor loss, WellLogic should immediately protect the highest
      // priority wells instead of slowly ramping every choke closed together.
      allocTarget = optimum
    } else {
      // PHASE 2-3: WellLogic gradually moves allocation toward optimum
      // High priority wells recover first (they get opened), low priority close down
      allocTarget = allocTarget + (optimum - allocTarget) * T.rebalanceRate
    }

    // Clamp
    allocTarget = Math.max(0, Math.min(desired, allocTarget))

    if (startupAssistActive && startupAssistWellIds.has(w.id) && desired > 0) {
      const startupTarget = desired * ((state.config.startupFixedChokePct || DEFAULT_STARTUP_FIXED_CHOKE) / 100)
      allocTarget = Math.max(allocTarget, Math.min(desired, startupTarget))
    }

    // Full-close actions should slam the choke shut; partial moves still behave like PID control.
    const protectedByStartupAssist = startupAssistActive && startupAssistWellIds.has(w.id) && desired > 0
    const fullShutdown = compressorsOffline || (optimum === 0 && !protectedByStartupAssist)
    const actualRate = fullShutdown
      ? smooth(w.actualRate, 0, compressorsOffline ? 0.85 : 0.7)
      : smooth(w.actualRate, allocTarget, T.flowResponseRate)

    // Choke position moves at realistic valve speed
    const targetChokeAO = desired > 0 ? Math.min(100, (allocTarget / desired) * 100) : 0
    const chokeAO = fullShutdown ? 0 : smooth(w.chokeAO, targetChokeAO, T.chokeMoveRate)

    // Production has the most inertia
    const accuracy = desired > 0 ? actualRate / desired : 1
    const isAtTarget = accuracy >= 0.95
    const targetProd = w.baseProduction * Math.min(accuracy, 1)
    const productionBoe = smooth(w.productionBoe, targetProd, T.productionLag)

    // Wellhead sensor parameters — evolve realistically
    // Static injection pressure: rises when choke closes (less flow), falls when open
    // Diff pressure: proportional to flow through choke (ΔP ∝ flow²)
    const flowFraction = desired > 0 ? allocTarget / desired : 1
    const targetStaticPress = KLONDIKE_STATIC_PRESSURE + (1 - flowFraction) * 30 + (Math.random() - 0.5) * 4
    const injectionPressure = smooth(w.injectionPressure ?? KLONDIKE_STATIC_PRESSURE, targetStaticPress, 0.08)

    // Diff pressure: ~45 PSI at normal flow, spikes during unload events
    const targetDiff = state.wellUnloadActive && i === 0
      ? KLONDIKE_DIFF_PRESSURE + Math.random() * 200  // unload spike on priority well
      : KLONDIKE_DIFF_PRESSURE * (flowFraction * flowFraction) + (Math.random() - 0.5) * 3
    const diffPressure = smooth(w.diffPressure ?? KLONDIKE_DIFF_PRESSURE, Math.max(0, targetDiff), 0.10)

    // Temperature: slight rise at lower flow (less cooling effect)
    const targetTemp = KLONDIKE_TEMP - flowFraction * 8 + (Math.random() - 0.5) * 2
    const injectionTemp = smooth(w.injectionTemp ?? KLONDIKE_TEMP, targetTemp, 0.04)

    const { _huntAdjustedRate, ...rest } = w
    return {
      ...rest,
      actualRate,
      productionBoe,
      chokeAO,
      isAtTarget,
      _allocTarget: allocTarget,
      injectionPressure: Math.max(700, Math.min(900, injectionPressure)),
      diffPressure: Math.max(0, diffPressure),
      injectionTemp: Math.max(100, Math.min(180, injectionTemp)),
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

  const deliveredGas = Math.min(totalActualInjection, effectiveGas)
  const startingCompressors = capacityGained
    ? activeCompressors.filter(c => c.actualThroughput < Math.max(c.capacityMcfd * 0.05, 25))
    : []
  const establishedCompressors = activeCompressors.filter(
    c => !startingCompressors.some(starting => starting.id === c.id)
  )
  const committedEstablishedFlow = establishedCompressors.reduce(
    (sum, compressor) => sum + Math.min(compressor.actualThroughput, compressor.capacityMcfd),
    0,
  )
  const remainingForStarters = Math.max(0, deliveredGas - committedEstablishedFlow)

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

    const isStarting = startingCompressors.some(starting => starting.id === c.id)
    const shareOfLoad = activeCompressors.length === 0
      ? 0
      : capacityGained && isStarting
        ? remainingForStarters / Math.max(startingCompressors.length, 1)
        : capacityGained
          ? Math.min(c.actualThroughput, c.capacityMcfd)
          : deliveredGas / activeCompressors.length
    const boundedThroughput = Math.min(shareOfLoad, c.capacityMcfd)
    const loadPct = c.capacityMcfd > 0 ? (boundedThroughput / c.capacityMcfd) * 100 : 0
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
      actualThroughput: smooth(c.actualThroughput, boundedThroughput, T.flowResponseRate),
      speedAutoSuctionSP,
      speedAutoDischargeSP: state.dischargeShutdownPressure - state.dischargeSlowdownOffset,
    }
  })

  // ──────────────────────────────────────────────
  // 10. Alarms
  // ──────────────────────────────────────────────
  const alarms = []
  if (compressorsOffline) {
    alarms.push({ type: 'critical', message: 'Compressors Offline - Well Flow Control Suspended' })
  }
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
    startupAssistRemaining,
    alarms,
    systemRunning: !compressorsOffline,
    runningWellsLabel: compressorsOffline ? 'Compressors Offline' : runningWells,
  }
}

function smooth(current, target, factor) {
  return current + (target - current) * factor
}

function sortedByPriority(wells) {
  return [...wells].sort((a, b) => a.priority - b.priority)
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
