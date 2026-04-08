// Pure simulation engine — tick(state) → newState
// Models the Permian Resources Pad Optimization Panel logic

const DEFAULT_COMPRESSOR_CAPACITY = 400 // MCFD per compressor
const DEFAULT_WELL_RATE = 150 // MCFD desired injection per well
const DEFAULT_WELL_PRODUCTION = 120 // BOE/day at full injection accuracy

// From document: suction header target pressure system
const DEFAULT_SUCTION_TARGET = 80 // PSI
const DEFAULT_SUCTION_HIGH_RANGE = 20 // PSI above target
const DEFAULT_SUCTION_LOW_RANGE = 40 // PSI — low range value
const DEFAULT_STAGGER_OFFSET = 2 // PSI between compressors
const DEFAULT_DISCHARGE_SHUTDOWN = 600 // PSI
const DEFAULT_DISCHARGE_SLOWDOWN_OFFSET = 50 // PSI
const DEFAULT_COOLER_OUTLET_SP = 200 // °F
const DEFAULT_MAX_TEMP_AT_PLATE = 165 // °F
const DEFAULT_STABILITY_TIMER = 60 // seconds
const DEFAULT_STAGING_LOCKOUT = 300 // seconds (5 min)

export function createInitialState(config) {
  const { compressorCount, wellCount, siteType } = config

  const compressors = Array.from({ length: compressorCount }, (_, i) => ({
    id: i,
    name: `C${i + 1}`,
    status: 'running', // 'running' | 'stopped' | 'tripped' | 'locked_out_running' | 'locked_out_stopped'
    mode: 'auto', // 'auto' | 'manual'
    autoStartAllowed: true,
    personnelLockout: false,
    capacityMcfd: DEFAULT_COMPRESSOR_CAPACITY,
    rpm: 1050,
    suctionPsi: DEFAULT_SUCTION_TARGET,
    dischargePsi: 400,
    loadPct: 0,
    actualThroughput: 0,
    // Modbus registers from document
    speedAutoSuctionSP: DEFAULT_SUCTION_LOW_RANGE + 2 + i * DEFAULT_STAGGER_OFFSET,
    speedAutoDischargeSP: DEFAULT_DISCHARGE_SHUTDOWN - DEFAULT_DISCHARGE_SLOWDOWN_OFFSET,
    coolerOutletSP: DEFAULT_COOLER_OUTLET_SP,
    secondStageSuctionCoolerSP: 200,
  }))

  const wells = Array.from({ length: wellCount }, (_, i) => ({
    id: i,
    name: `W${i + 1}`,
    priority: i,
    desiredRate: DEFAULT_WELL_RATE,
    actualRate: 0,
    productionBoe: 0,
    baseProduction: DEFAULT_WELL_PRODUCTION + (Math.random() * 40 - 20),
    isHunting: false,
    huntPhase: Math.random() * Math.PI * 2,
    // Choke valve controls (from panel screenshot)
    chokeManualSP: 80 + Math.floor(Math.random() * 20), // 80-100 range like screenshot
    chokeMode: 'auto', // 'auto' | 'manual'
    chokeAO: 0, // actual output 0-100%
    isAtTarget: false,
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
    // Suction header system (from document section 1)
    suctionTarget: DEFAULT_SUCTION_TARGET,
    suctionHighRange: DEFAULT_SUCTION_HIGH_RANGE,
    suctionLowRange: DEFAULT_SUCTION_LOW_RANGE,
    staggerOffset: DEFAULT_STAGGER_OFFSET,
    suctionHeaderPressure: DEFAULT_SUCTION_TARGET,
    // Discharge settings (from document section 2B)
    dischargeShutdownPressure: DEFAULT_DISCHARGE_SHUTDOWN,
    dischargeSlowdownOffset: DEFAULT_DISCHARGE_SLOWDOWN_OFFSET,
    // Temperature (from document section 2C)
    coolerOutletSP: DEFAULT_COOLER_OUTLET_SP,
    maxTempAtPlate: DEFAULT_MAX_TEMP_AT_PLATE,
    flowMeterTemp: 155, // simulated
    // Scrubber (from document section 3)
    scrubberPressure: DEFAULT_SUCTION_TARGET,
    scrubberRateOfChange: 0,
    // Well unload detection (from document section 4)
    unloadRateThreshold: 5, // psi/sec
    unloadSpikeThreshold: 15, // psi
    wellUnloadActive: false,
    // Sales valve (from document section 5)
    salesValvePosition: 0, // 0-100%
    // Staging timers (from document section 12)
    stabilityTimer: DEFAULT_STABILITY_TIMER,
    stagingLockoutTimer: DEFAULT_STAGING_LOCKOUT,
    stagingLockoutRemaining: 0,
    // Flow rate control mode
    flowRateMode: 'local', // 'local' | 'remote'
    // Alarms
    alarms: [],
    // Running state
    systemRunning: true,
    runningWellsLabel: '',
  }
}

export function tick(state) {
  const { compressors, wells, totalAvailableGas, huntSequenceEnabled, tickCount, config } = state
  const newTickCount = tickCount + 1
  const simTime = newTickCount * 3

  // 1. Update hunt sequence phases
  const updatedWells = wells.map(w => {
    if (!huntSequenceEnabled) {
      return { ...w, isHunting: false }
    }
    const newPhase = w.huntPhase + 0.15
    const huntOffset = Math.sin(newPhase) * w.desiredRate * 0.10
    return {
      ...w,
      isHunting: true,
      huntPhase: newPhase,
      _huntAdjustedRate: Math.max(0, w.desiredRate + huntOffset),
    }
  })

  // 2. Calculate available gas from running compressors (including locked_out_running)
  const activeCompressors = compressors.filter(c =>
    c.status === 'running' || c.status === 'locked_out_running'
  )
  const onlineCapacity = activeCompressors.reduce((sum, c) => sum + c.capacityMcfd, 0)
  const effectiveGas = Math.min(totalAvailableGas, onlineCapacity)

  // 3. Allocate gas by priority
  const sortedWells = [...updatedWells].sort((a, b) => a.priority - b.priority)
  let remainingGas = effectiveGas
  const allocations = new Map()

  for (const well of sortedWells) {
    const desired = well._huntAdjustedRate || well.desiredRate
    const allocated = Math.min(desired, remainingGas)
    allocations.set(well.id, allocated)
    remainingGas = Math.max(0, remainingGas - allocated)
  }

  // 4. Apply allocations, calculate production, choke AO
  const finalWells = updatedWells.map(w => {
    const actualRate = allocations.get(w.id) || 0
    const desired = w._huntAdjustedRate || w.desiredRate
    const accuracy = desired > 0 ? actualRate / desired : 1
    const isAtTarget = accuracy >= 0.95
    const productionBoe = w.baseProduction * Math.min(accuracy, 1)
    // Choke AO reflects actual output percentage
    const chokeAO = desired > 0 ? Math.min(100, (actualRate / desired) * 100) : 0

    const { _huntAdjustedRate, ...rest } = w
    return {
      ...rest,
      actualRate: smooth(w.actualRate, actualRate, 0.3),
      productionBoe: smooth(w.productionBoe, productionBoe, 0.2),
      chokeAO: smooth(w.chokeAO, chokeAO, 0.25),
      isAtTarget,
    }
  })

  // 5. Simulate suction header pressure (document section 1)
  const totalActualInjection = finalWells.reduce((sum, w) => sum + w.actualRate, 0)
  const totalDesired = finalWells.reduce((sum, w) => sum + w.desiredRate, 0)
  const supplyDemandRatio = totalDesired > 0 ? effectiveGas / totalDesired : 1
  // Suction pressure drops when demand exceeds supply
  const targetSuction = state.suctionTarget + (supplyDemandRatio - 1) * 30
  const suctionHeaderPressure = smooth(state.suctionHeaderPressure, targetSuction + (Math.random() - 0.5) * 2, 0.15)

  // 6. Simulate scrubber pressure with occasional spikes (document section 3-4)
  const scrubberBase = suctionHeaderPressure + 5
  const unloadChance = Math.random()
  let scrubberPressure = state.scrubberPressure
  let wellUnloadActive = false
  if (unloadChance > 0.98) {
    // Simulate well unload event — rapid pressure spike
    scrubberPressure = scrubberBase + 20 + Math.random() * 15
    wellUnloadActive = true
  } else {
    scrubberPressure = smooth(state.scrubberPressure, scrubberBase + (Math.random() - 0.5) * 3, 0.2)
  }
  const scrubberRateOfChange = (scrubberPressure - state.scrubberPressure) / 3 // psi/sec

  // 7. Sales valve control (document section 5)
  let salesValvePosition = state.salesValvePosition
  const upperLimit = state.suctionTarget + state.suctionHighRange
  if (suctionHeaderPressure > upperLimit || wellUnloadActive) {
    salesValvePosition = smooth(salesValvePosition, Math.min(100, (suctionHeaderPressure - upperLimit) * 5 + 30), 0.3)
  } else {
    salesValvePosition = smooth(salesValvePosition, 0, 0.1)
  }

  // 8. Simulate flow meter temperature (document section 2C)
  const flowMeterTemp = 150 + Math.random() * 20 + (totalActualInjection / (totalDesired || 1)) * 10

  // 9. Update compressor telemetry with stagger logic (document section 2A)
  const stagingLockoutRemaining = Math.max(0, state.stagingLockoutRemaining - 3)

  const finalCompressors = compressors.map((c, i) => {
    const isProducing = c.status === 'running' || c.status === 'locked_out_running'

    if (!isProducing) {
      return {
        ...c,
        rpm: smooth(c.rpm, 0, 0.15),
        suctionPsi: smooth(c.suctionPsi, suctionHeaderPressure, 0.1),
        dischargePsi: smooth(c.dischargePsi, 0, 0.15),
        loadPct: smooth(c.loadPct, 0, 0.15),
        actualThroughput: smooth(c.actualThroughput, 0, 0.15),
      }
    }

    const shareOfLoad = activeCompressors.length > 0
      ? totalActualInjection / activeCompressors.length
      : 0
    const loadPct = c.capacityMcfd > 0 ? (shareOfLoad / c.capacityMcfd) * 100 : 0
    const clampedLoad = Math.min(100, Math.max(0, loadPct))

    const rpm = 950 + (clampedLoad / 100) * 200
    const suctionPsi = suctionHeaderPressure + (Math.random() - 0.5) * 2
    const dischargePsi = 200 + (clampedLoad / 100) * 400

    // Stagger offset for speed auto suction SP (document section 2A)
    const speedAutoSuctionSP = state.suctionLowRange + 2 + i * state.staggerOffset

    const noise = () => (Math.random() - 0.5) * 2

    return {
      ...c,
      rpm: smooth(c.rpm, rpm + noise() * 5, 0.2),
      suctionPsi: smooth(c.suctionPsi, suctionPsi, 0.2),
      dischargePsi: smooth(c.dischargePsi, dischargePsi + noise() * 5, 0.2),
      loadPct: smooth(c.loadPct, clampedLoad, 0.2),
      actualThroughput: smooth(c.actualThroughput, shareOfLoad, 0.3),
      speedAutoSuctionSP,
      speedAutoDischargeSP: state.dischargeShutdownPressure - state.dischargeSlowdownOffset,
    }
  })

  // 10. Generate alarms (document sections 14-17)
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
  if (wellUnloadActive) {
    alarms.push({ type: 'info', message: 'Well Unload Event Detected' })
  }
  if (flowMeterTemp > state.maxTempAtPlate) {
    alarms.push({ type: 'warning', message: 'Gas Temperature High at Flow Meter' })
  }
  if (suctionHeaderPressure > upperLimit) {
    alarms.push({ type: 'warning', message: 'Suction Pressure Above Upper Range' })
  }

  // Running wells label (from screenshot bottom bar)
  const runningWells = finalWells.filter(w => w.actualRate > 0).map(w => w.name).join(', ')

  return {
    ...state,
    compressors: finalCompressors,
    wells: finalWells,
    tickCount: newTickCount,
    simTime,
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
