import { useState, useEffect, useCallback, useRef } from 'react'
import { createInitialState, tick, getMetrics, GAS_SUPPLY_UI_MAX } from '../engine/simulation'

const isProducing = (compressor) =>
  compressor.status === 'running' || compressor.status === 'locked_out_running'

const getOnlineCapacity = (compressors) =>
  compressors.filter(isProducing).reduce((sum, compressor) => sum + compressor.capacityMcfd, 0)

export function useSimulation(config) {
  const [state, setState] = useState(() => createInitialState(config))
  const [running, setRunning] = useState(true)
  const intervalRef = useRef(null)

  useEffect(() => {
    setState(createInitialState(config))
    setRunning(true)
  }, [config])

  useEffect(() => {
    if (running) {
      const interval = state.tuning?.tickInterval || 500
      intervalRef.current = setInterval(() => {
        setState(prev => tick(prev))
      }, interval)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, state.tuning?.tickInterval])

  const setCompressorStatus = useCallback((id, status) => {
    setState(prev => {
      const compressors = prev.compressors.map(c =>
        c.id === id ? { ...c, status } : c
      )
      const prevOnlineCapacity = getOnlineCapacity(prev.compressors)
      const onlineCapacity = getOnlineCapacity(compressors)
      const wasAtCapacity = Math.abs(prev.totalAvailableGas - prevOnlineCapacity) < 1

      return {
        ...prev,
        compressors,
        totalAvailableGas:
          onlineCapacity > prevOnlineCapacity && wasAtCapacity
            ? onlineCapacity
            : Math.min(prev.totalAvailableGas, onlineCapacity),
        maxGasCapacity: compressors.reduce((sum, c) => sum + c.capacityMcfd, 0),
      }
    })
  }, [])

  const setCompressorCapacity = useCallback((id, capacityMcfd) => {
    setState(prev => {
      const nextCapacity = Math.max(0, Number(capacityMcfd) || 0)
      const prevOnlineCapacity = getOnlineCapacity(prev.compressors)
      const compressors = prev.compressors.map(c =>
        c.id === id ? { ...c, capacityMcfd: nextCapacity } : c
      )
      const onlineCapacity = getOnlineCapacity(compressors)
      const maxGasCapacity = compressors.reduce((sum, c) => sum + c.capacityMcfd, 0)
      const wasAtCapacity = Math.abs(prev.totalAvailableGas - prevOnlineCapacity) < 1

      return {
        ...prev,
        compressors,
        config: {
          ...prev.config,
          compressorMaxFlowRate: nextCapacity,
        },
        totalAvailableGas:
          onlineCapacity > prevOnlineCapacity && wasAtCapacity
            ? onlineCapacity
            : Math.min(prev.totalAvailableGas, onlineCapacity),
        maxGasCapacity,
      }
    })
  }, [])

  const setCompressorMode = useCallback((id, mode) => {
    setState(prev => ({
      ...prev,
      compressors: prev.compressors.map(c =>
        c.id === id ? { ...c, mode } : c
      ),
    }))
  }, [])

  const setWellDesiredRate = useCallback((id, rate) => {
    setState(prev => ({
      ...prev,
      wells: prev.wells.map(w =>
        w.id === id ? { ...w, desiredRate: rate } : w
      ),
    }))
  }, [])

  const setWellPriorities = useCallback((orderedIds) => {
    setState(prev => ({
      ...prev,
      wells: prev.wells.map(w => ({
        ...w,
        priority: orderedIds.indexOf(w.id),
      })),
    }))
  }, [])

  const setTotalAvailableGas = useCallback((gas) => {
    setState(prev => ({
      ...prev,
      totalAvailableGas: Math.max(0, Math.min(Number(gas) || 0, GAS_SUPPLY_UI_MAX)),
    }))
  }, [])

  const setHuntSequence = useCallback((enabled) => {
    setState(prev => ({ ...prev, huntSequenceEnabled: enabled }))
  }, [])

  const setChokeManualSP = useCallback((id, value) => {
    setState(prev => ({
      ...prev,
      wells: prev.wells.map(w =>
        w.id === id ? { ...w, chokeManualSP: value } : w
      ),
    }))
  }, [])

  const setChokeMode = useCallback((id, mode) => {
    setState(prev => ({
      ...prev,
      wells: prev.wells.map(w =>
        w.id === id ? { ...w, chokeMode: mode } : w
      ),
    }))
  }, [])

  // Generic state field setter for commissioning parameters
  const setStateField = useCallback((field, value) => {
    setState(prev => ({ ...prev, [field]: value }))
  }, [])

  const resetToDefaults = useCallback(() => {
    setState(createInitialState(config))
  }, [config])

  const applyConfig = useCallback((nextConfig) => {
    setState(createInitialState(nextConfig))
    setRunning(true)
  }, [])

  const toggleRunning = useCallback(() => {
    setRunning(r => !r)
  }, [])

  /**
   * Synchronously advance the simulation by N ticks in a single
   * setState update. Used by AutoPilot's replayToStep so the visible
   * state after a manual Next/Prev matches the sim state that would
   * have been reached at that narration tile during live playback —
   * compressor trips have to ripple through the gas supply chain
   * before wells show red, and that only happens with ticks.
   *
   * Runs inside one setState(prev =>) so React batches it as a single
   * update. Capped in the caller (AutoPilot) to avoid pathological
   * frame drops when a tile has a very long duration.
   */
  const fastForward = useCallback((ticks) => {
    const n = Math.max(0, Math.floor(Number(ticks) || 0))
    if (n === 0) return
    setState(prev => {
      let next = prev
      for (let i = 0; i < n; i += 1) next = tick(next)
      return next
    })
  }, [])

  const metrics = getMetrics(state)

  return {
    state,
    metrics,
    running,
    toggleRunning,
    setCompressorStatus,
    setCompressorCapacity,
    setCompressorMode,
    setWellDesiredRate,
    setWellPriorities,
    setTotalAvailableGas,
    setHuntSequence,
    setChokeManualSP,
    setChokeMode,
    setStateField,
    resetToDefaults,
    applyConfig,
    fastForward,
  }
}
