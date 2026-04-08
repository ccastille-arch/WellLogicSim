import { useState, useEffect, useCallback, useRef } from 'react'
import { createInitialState, tick, getMetrics } from '../engine/simulation'

export function useSimulation(config) {
  const [state, setState] = useState(() => createInitialState(config))
  const [running, setRunning] = useState(true)
  const intervalRef = useRef(null)

  useEffect(() => {
    setState(createInitialState(config))
    setRunning(true)
  }, [config.compressorCount, config.wellCount, config.siteType])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setState(prev => tick(prev))
      }, 500)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  const setCompressorStatus = useCallback((id, status) => {
    setState(prev => {
      const compressors = prev.compressors.map(c =>
        c.id === id ? { ...c, status } : c
      )
      const onlineCapacity = compressors
        .filter(c => c.status === 'running' || c.status === 'locked_out_running')
        .reduce((sum, c) => sum + c.capacityMcfd, 0)
      return {
        ...prev,
        compressors,
        totalAvailableGas: Math.min(prev.totalAvailableGas, onlineCapacity),
        maxGasCapacity: compressors.reduce((sum, c) => sum + c.capacityMcfd, 0),
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
    setState(prev => ({ ...prev, totalAvailableGas: gas }))
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

  const toggleRunning = useCallback(() => {
    setRunning(r => !r)
  }, [])

  const metrics = getMetrics(state)

  return {
    state,
    metrics,
    running,
    toggleRunning,
    setCompressorStatus,
    setCompressorMode,
    setWellDesiredRate,
    setWellPriorities,
    setTotalAvailableGas,
    setHuntSequence,
    setChokeManualSP,
    setChokeMode,
    setStateField,
    resetToDefaults,
  }
}
