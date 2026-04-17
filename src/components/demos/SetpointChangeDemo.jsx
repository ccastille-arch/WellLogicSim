import { useEffect, useMemo, useRef, useState } from 'react'

const TOTAL_CAPACITY = 3350
const SUCTION_TARGET = 145
const DEMO_DEVICE = 'Klondike Well Pad COP0001'

const WELL_DEFS = [
  { id: 1, display: 'Well 1', short: 'W1', desiredFlow: 800, priority: 1, yesterdayFlow: 0.798 },
  { id: 2, display: 'Well 2', short: 'W2', desiredFlow: 820, priority: 2, yesterdayFlow: 0.814 },
  { id: 3, display: 'Well 3', short: 'W3', desiredFlow: 840, priority: 3, yesterdayFlow: 0.836 },
  { id: 4, display: 'Well 4', short: 'W4', desiredFlow: 890, priority: 4, yesterdayFlow: 0.882 },
]

function pad(value) {
  return String(value).padStart(2, '0')
}

function stampNow() {
  const now = new Date()
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

function desiredRegisterForWell(id) {
  return {
    label: `Wellhead #${id} Calculated Desired Flow`,
    register: String(460050 + (id - 1) * 2),
    units: 'MCFD',
  }
}

function priorityRegisterForWell(id) {
  return {
    label: `Wellhead #${id} Choke Flow Priority #`,
    register: String(461002 + (id - 1) * 2),
    units: 'rank',
  }
}

function flowRegisterForWell(id) {
  return {
    label: `Wellhead #${id} Injection Flow Rate From Customer PLC`,
    register: String(460212 + (id - 1) * 14),
    units: 'MCFD',
  }
}

function runningStatusRegisterForWell(id) {
  return {
    label: `WellHead #${id} Running Status`,
    register: String(460074 + (id - 1) * 2),
    units: 'state',
  }
}

function buildStableModel(overrides = {}) {
  return WELL_DEFS.map((well) => ({
    ...well,
    desiredFlow: overrides[well.id]?.desiredFlow ?? well.desiredFlow,
    priority: overrides[well.id]?.priority ?? well.priority,
  }))
}

function computeSystemState(model) {
  const sorted = [...model].sort((a, b) => a.priority - b.priority || a.id - b.id)
  let remaining = TOTAL_CAPACITY
  const actualById = new Map()

  sorted.forEach((well) => {
    const delivered = Math.max(0, Math.min(well.desiredFlow, remaining))
    actualById.set(well.id, delivered)
    remaining -= delivered
  })

  const wells = model.map((well) => {
    const actualFlow = actualById.get(well.id) ?? 0
    const choke = Math.max(16, Math.min(96, 18 + actualFlow / 12))
    const trackingError = actualFlow - well.desiredFlow
    return {
      ...well,
      actualFlow,
      choke,
      status: actualFlow > 50 ? 'Online' : 'Trimmed',
      tracking: Math.abs(trackingError) <= 8 ? 'At Target' : trackingError < 0 ? 'Priority Limited' : 'Leading',
    }
  })

  const totalInjection = wells.reduce((sum, well) => sum + well.actualFlow, 0)
  const overload = Math.max(0, wells.reduce((sum, well) => sum + well.desiredFlow, 0) - TOTAL_CAPACITY)
  const suctionPsi = SUCTION_TARGET + Math.min(4.5, overload / 110) - Math.min(2.5, remaining / 220)

  return {
    wells,
    totalInjection,
    suctionPsi,
    remainingCapacity: remaining,
    overloaded: overload > 0,
  }
}

function interpolateState(fromState, toState, progress) {
  return {
    ...toState,
    totalInjection: fromState.totalInjection + (toState.totalInjection - fromState.totalInjection) * progress,
    suctionPsi: fromState.suctionPsi + (toState.suctionPsi - fromState.suctionPsi) * progress,
    wells: toState.wells.map((targetWell) => {
      const sourceWell = fromState.wells.find((well) => well.id === targetWell.id) || targetWell
      return {
        ...targetWell,
        desiredFlow: sourceWell.desiredFlow + (targetWell.desiredFlow - sourceWell.desiredFlow) * progress,
        actualFlow: sourceWell.actualFlow + (targetWell.actualFlow - sourceWell.actualFlow) * progress,
        choke: sourceWell.choke + (targetWell.choke - sourceWell.choke) * progress,
        priority: progress < 0.5 ? sourceWell.priority : targetWell.priority,
      }
    }),
  }
}

function MetricCard({ label, value, helper }) {
  return (
    <div className="rounded-md border border-[#d9d9d9] bg-white px-4 py-3 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a7a7a]">{label}</div>
      <div className="mt-2 text-[28px] font-black text-[#1f1f1f]" style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}>
        {value}
      </div>
      <div className="mt-1 text-[11px] text-[#6d6d6d]">{helper}</div>
    </div>
  )
}

function LightBadge({ tone = 'neutral', children }) {
  const tones = {
    success: 'bg-[#e8f5e9] text-[#2e7d32] border-[#a5d6a7]',
    warn: 'bg-[#fff8e1] text-[#946200] border-[#ffe082]',
    danger: 'bg-[#fff3f3] text-[#c62828] border-[#ffcdd2]',
    info: 'bg-[#e3f2fd] text-[#1565c0] border-[#90caf9]',
    neutral: 'bg-[#f4f4f4] text-[#666] border-[#ddd]',
  }

  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${tones[tone]}`}>
      {children}
    </span>
  )
}

export default function SetpointChangeDemo() {
  const [activeTab, setActiveTab] = useState('settings')
  const [system, setSystem] = useState(() => computeSystemState(buildStableModel()))
  const [editor, setEditor] = useState(null)
  const [draft, setDraft] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [selectedWellId, setSelectedWellId] = useState(1)
  const [lastWriteSummary, setLastWriteSummary] = useState('No writes sent yet. Open the settings widget and review a change.')
  const [logLines, setLogLines] = useState([
    { at: '00:00:00', type: 'INFO', text: 'MLink training widget ready. Use Settings to simulate customer setpoint writes.' },
  ])
  const [transitioning, setTransitioning] = useState(false)
  const animationRef = useRef(null)

  const selectedWell = useMemo(
    () => system.wells.find((well) => well.id === selectedWellId) || system.wells[0],
    [selectedWellId, system.wells],
  )

  const addLog = (text, type = 'INFO') => {
    setLogLines((current) => [
      { at: stampNow(), type, text },
      ...current.slice(0, 13),
    ])
  }

  useEffect(() => {
    if (transitioning) return undefined

    const id = window.setInterval(() => {
      setSystem((current) => ({
        ...current,
        suctionPsi: current.suctionPsi + (Math.random() - 0.5) * 0.35,
        wells: current.wells.map((well) => ({
          ...well,
          actualFlow: Math.max(0, well.actualFlow + (Math.random() - 0.5) * 3),
          choke: Math.max(10, Math.min(98, well.choke + (Math.random() - 0.5) * 0.2)),
        })),
      }))
    }, 1400)

    return () => window.clearInterval(id)
  }, [transitioning])

  useEffect(() => () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const realtimeRows = useMemo(() => {
    return system.wells.flatMap((well) => {
      const desiredRegister = desiredRegisterForWell(well.id)
      const priorityRegister = priorityRegisterForWell(well.id)
      const flowRegister = flowRegisterForWell(well.id)
      const runningRegister = runningStatusRegisterForWell(well.id)

      return [
        {
          key: `${well.id}-desired`,
          register: desiredRegister.register,
          tag: desiredRegister.label,
          value: well.desiredFlow.toFixed(0),
          units: desiredRegister.units,
          state: 'Configured',
        },
        {
          key: `${well.id}-priority`,
          register: priorityRegister.register,
          tag: priorityRegister.label,
          value: String(well.priority),
          units: priorityRegister.units,
          state: `Priority ${well.priority}`,
        },
        {
          key: `${well.id}-flow`,
          register: flowRegister.register,
          tag: flowRegister.label,
          value: well.actualFlow.toFixed(0),
          units: flowRegister.units,
          state: well.tracking,
        },
        {
          key: `${well.id}-status`,
          register: runningRegister.register,
          tag: runningRegister.label,
          value: well.actualFlow > 50 ? '1' : '0',
          units: runningRegister.units,
          state: well.status,
        },
      ]
    })
  }, [system.wells])

  const openEditor = (wellId) => {
    const well = system.wells.find((item) => item.id === wellId)
    if (!well) return

    setSelectedWellId(wellId)
    setActiveTab('settings')
    setDraft({
      wellId,
      desiredFlow: Math.round(well.desiredFlow),
      priority: well.priority,
    })
    setEditor(wellId)
    addLog(`Opened settings prompt for ${desiredRegisterForWell(wellId).label}`, 'NAV')
  }

  const cancelEditor = () => {
    setEditor(null)
    setDraft(null)
    setConfirming(false)
    addLog('Cancelled pending MLink write prompt.', 'NAV')
  }

  const reviewWrite = () => {
    if (!draft) return
    setConfirming(true)
    addLog(`Reviewing pending write for Well ${draft.wellId}.`, 'CHECK')
  }

  const saveWrite = () => {
    if (!draft) return

    const editedWellId = draft.wellId
    const desiredMeta = desiredRegisterForWell(editedWellId)
    const priorityMeta = priorityRegisterForWell(editedWellId)
    const fromState = system
    const targetModel = buildStableModel(
      Object.fromEntries(system.wells.map((well) => [well.id, {
        desiredFlow: well.id === editedWellId ? draft.desiredFlow : well.desiredFlow,
        priority: well.id === editedWellId ? draft.priority : well.priority,
      }])),
    )
    const targetState = computeSystemState(targetModel)

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    setEditor(null)
    setConfirming(false)
    setTransitioning(true)
    setActiveTab('realtime')
    setLastWriteSummary(
      `Wrote ${desiredMeta.label} (${desiredMeta.register}) to ${draft.desiredFlow} ${desiredMeta.units} and ${priorityMeta.label} (${priorityMeta.register}) to ${draft.priority}.`,
    )
    addLog(`Write accepted: ${desiredMeta.label} -> ${draft.desiredFlow} ${desiredMeta.units}`, 'ACTION')
    addLog(`Write accepted: ${priorityMeta.label} -> ${draft.priority}`, 'ACTION')

    const startedAt = performance.now()
    const durationMs = 2600

    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      setSystem(interpolateState(fromState, targetState, eased))

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      setSystem(targetState)
      setTransitioning(false)
      setDraft(null)
      addLog(
        targetState.overloaded
          ? 'Pad Logic rebalanced flow by priority after the write. Lower-priority wells were trimmed.'
          : 'Pad Logic settled the new desired rate with all wells still meeting demand.',
        targetState.overloaded ? 'WARN' : 'INFO',
      )
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  return (
    <div className="h-full overflow-auto bg-[#f1f1f1] p-4 text-[#222]">
      <div className="mx-auto flex max-w-[1560px] flex-col gap-4">
        <div className="overflow-hidden rounded-md border border-[#c8c8c8] bg-white shadow-sm">
          <div className="bg-[#c40000] px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.24em] text-white">
            Pad Logic MLink Settings Training
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d6d6d6] bg-[#333] px-4 py-3 text-white">
            <div>
              <div className="text-[22px] font-black tracking-[-0.02em]" style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}>
                MLink Settings Widget
              </div>
              <div className="text-[11px] text-[#d6d6d6]">
                Training mirror for {DEMO_DEVICE} using the real Klondike desired-flow and priority registers
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <LightBadge tone="success">{transitioning ? 'Write In Progress' : 'Widget Ready'}</LightBadge>
              <LightBadge tone="info">Capacity {TOTAL_CAPACITY.toLocaleString()} MCFD</LightBadge>
              <LightBadge tone={system.overloaded ? 'warn' : 'success'}>
                {system.overloaded ? 'Priority Trim Active' : 'All Wells Meeting Demand'}
              </LightBadge>
            </div>
          </div>

          <div className="grid gap-3 border-b border-[#dcdcdc] bg-[#fafafa] p-4 md:grid-cols-3">
            <MetricCard
              label="Total Injection"
              value={`${Math.round(system.totalInjection).toLocaleString()} MCFD`}
              helper={`${Math.round(system.remainingCapacity).toLocaleString()} MCFD spare compressor capacity`}
            />
            <MetricCard
              label="Suction Header"
              value={`${system.suctionPsi.toFixed(1)} PSI`}
              helper={`Target ${SUCTION_TARGET} PSI`}
            />
            <MetricCard
              label="Last Write"
              value={selectedWell ? selectedWell.short : 'W1'}
              helper={lastWriteSummary}
            />
          </div>

          <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="overflow-hidden rounded-md border border-[#d9d9d9] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#ddd] bg-[#fafafa] px-4 py-2">
                <div className="flex gap-2">
                  {[
                    ['realtime', 'Real-Time Data'],
                    ['settings', 'Settings Widget'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      className={`rounded-sm border px-3 py-1.5 text-[11px] font-bold ${
                        activeTab === id
                          ? 'border-[#c40000] bg-[#fff3f3] text-[#c40000]'
                          : 'border-[#d4d4d4] bg-white text-[#555]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-[#666]">
                  Customer workflow: open settings, review register write, confirm, then verify on live data.
                </div>
              </div>

              {activeTab === 'realtime' ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-[12px]">
                    <thead className="bg-[#f0f0f0] text-[#666]">
                      <tr>
                        <th className="border-b border-r border-[#e5e5e5] px-3 py-2 text-left text-[11px] font-bold">Register</th>
                        <th className="border-b border-r border-[#e5e5e5] px-3 py-2 text-left text-[11px] font-bold">Tag Name</th>
                        <th className="border-b border-r border-[#e5e5e5] px-3 py-2 text-left text-[11px] font-bold">Value</th>
                        <th className="border-b border-r border-[#e5e5e5] px-3 py-2 text-left text-[11px] font-bold">Units</th>
                        <th className="border-b border-[#e5e5e5] px-3 py-2 text-left text-[11px] font-bold">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {realtimeRows.map((row) => (
                        <tr
                          key={row.key}
                          className={row.tag.includes(`Wellhead #${selectedWellId}`) ? 'bg-[#fff8e1]' : 'even:bg-[#fafafa]'}
                        >
                          <td className="border-b border-r border-[#ededed] px-3 py-2 font-mono text-[11px]">{row.register}</td>
                          <td className="border-b border-r border-[#ededed] px-3 py-2 text-[#222]">{row.tag}</td>
                          <td className="border-b border-r border-[#ededed] px-3 py-2 font-bold text-[#222]">{row.value}</td>
                          <td className="border-b border-r border-[#ededed] px-3 py-2 text-[#666]">{row.units}</td>
                          <td className="border-b border-[#ededed] px-3 py-2">
                            <LightBadge tone={row.state === 'Priority Limited' ? 'warn' : row.state === 'Online' || row.state === 'Configured' ? 'success' : 'info'}>
                              {row.state}
                            </LightBadge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4">
                  <div className="mb-4 rounded-sm border border-[#90caf9] bg-[#e3f2fd] px-4 py-3 text-[12px] text-[#1565c0]">
                    This mirrors the customer MLink settings workflow. Each write prompt below uses the actual Klondike well pad register labels for desired injection rate and flow priority.
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-[12px]">
                      <thead className="bg-[#f0f0f0] text-[#666]">
                        <tr>
                          <th className="border-b border-r border-[#e5e5e5] px-3 py-2 text-left text-[11px] font-bold">Well</th>
                          <th className="border-b border-r border-[#e5e5e5] px-3 py-2 text-left text-[11px] font-bold">Desired Injection Register</th>
                          <th className="border-b border-r border-[#e5e5e5] px-3 py-2 text-left text-[11px] font-bold">Priority Register</th>
                          <th className="border-b border-r border-[#e5e5e5] px-3 py-2 text-left text-[11px] font-bold">Current Desired</th>
                          <th className="border-b border-r border-[#e5e5e5] px-3 py-2 text-left text-[11px] font-bold">Current Priority</th>
                          <th className="border-b border-[#e5e5e5] px-3 py-2 text-left text-[11px] font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {system.wells.map((well) => {
                          const desiredMeta = desiredRegisterForWell(well.id)
                          const priorityMeta = priorityRegisterForWell(well.id)
                          return (
                            <tr key={well.id} className={well.id === selectedWellId ? 'bg-[#fff8e1]' : 'even:bg-[#fafafa]'}>
                              <td className="border-b border-r border-[#ededed] px-3 py-2 font-bold">{well.display}</td>
                              <td className="border-b border-r border-[#ededed] px-3 py-2">
                                <div className="font-semibold">{desiredMeta.label}</div>
                                <div className="font-mono text-[11px] text-[#777]">Reg {desiredMeta.register}</div>
                              </td>
                              <td className="border-b border-r border-[#ededed] px-3 py-2">
                                <div className="font-semibold">{priorityMeta.label}</div>
                                <div className="font-mono text-[11px] text-[#777]">Reg {priorityMeta.register}</div>
                              </td>
                              <td className="border-b border-r border-[#ededed] px-3 py-2 font-bold">{Math.round(well.desiredFlow)} MCFD</td>
                              <td className="border-b border-r border-[#ededed] px-3 py-2 font-bold">Priority {well.priority}</td>
                              <td className="border-b border-[#ededed] px-3 py-2">
                                <button
                                  onClick={() => openEditor(well.id)}
                                  className="rounded-sm border border-[#c40000] bg-[#fff3f3] px-3 py-1.5 text-[11px] font-bold text-[#c40000] hover:bg-[#ffe3e3]"
                                >
                                  Edit In Widget
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-[#d9d9d9] bg-white shadow-sm">
                <div className="border-b border-[#ddd] bg-[#c40000] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                  Customer Workflow
                </div>
                <div className="space-y-3 p-4 text-[12px]">
                  {[
                    'Open the MLink Settings Widget from laptop or phone.',
                    'Select the well that needs a desired injection or priority change.',
                    'Review the exact Klondike register labels before saving.',
                    'Confirm the write, then verify the result on real-time data.',
                  ].map((step, index) => (
                    <div key={step} className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#d0d0d0] bg-[#f8f8f8] text-[11px] font-bold">
                        {index + 1}
                      </div>
                      <div className="text-[#333]">{step}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-[#d9d9d9] bg-white shadow-sm">
                <div className="border-b border-[#ddd] bg-[#fafafa] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#666]">
                  Selected Well Snapshot
                </div>
                <div className="space-y-3 p-4 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#333]">{selectedWell.display}</span>
                    <LightBadge tone={selectedWell.tracking === 'Priority Limited' ? 'warn' : 'success'}>
                      {selectedWell.tracking}
                    </LightBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[#888]">Desired</div>
                      <div className="text-[18px] font-black text-[#222]" style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}>
                        {Math.round(selectedWell.desiredFlow)} MCFD
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[#888]">Actual</div>
                      <div className="text-[18px] font-black text-[#222]" style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}>
                        {Math.round(selectedWell.actualFlow)} MCFD
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[#888]">Priority</div>
                      <div className="text-[16px] font-bold text-[#222]">#{selectedWell.priority}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[#888]">Yesterday Flow</div>
                      <div className="text-[16px] font-bold text-[#222]">{selectedWell.yesterdayFlow.toFixed(3)} MMSCFD</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-[#d9d9d9] bg-white shadow-sm">
                <div className="border-b border-[#ddd] bg-[#fafafa] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#666]">
                  Event Log
                </div>
                <div className="max-h-[320px] space-y-2 overflow-auto p-4">
                  {logLines.map((line, index) => (
                    <div key={`${line.at}-${index}`} className="flex gap-3 text-[11px]">
                      <span className="shrink-0 font-mono text-[#999]">{line.at}</span>
                      <span className="shrink-0 font-bold text-[#777]">{line.type}</span>
                      <span className="text-[#333]">{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editor && draft && !confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[460px] overflow-hidden rounded-md border border-[#d0d0d0] bg-white shadow-2xl">
            <div className="bg-[#c40000] px-4 py-3 text-[14px] font-bold text-white">
              Edit Well {draft.wellId} Settings
            </div>
            <div className="space-y-4 p-4 text-[12px] text-[#333]">
              <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
                <div className="font-semibold">{desiredRegisterForWell(draft.wellId).label}</div>
                <div className="mt-1 font-mono text-[11px] text-[#777]">Register {desiredRegisterForWell(draft.wellId).register}</div>
                <div className="mt-2">
                  <input
                    type="range"
                    min={300}
                    max={1200}
                    step={5}
                    value={draft.desiredFlow}
                    onChange={(event) => setDraft((current) => ({ ...current, desiredFlow: Number(event.target.value) }))}
                    className="w-full accent-red-700"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-[#777]">300 MCFD</span>
                    <span className="text-[18px] font-black text-[#222]" style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}>
                      {draft.desiredFlow} MCFD
                    </span>
                    <span className="text-[11px] text-[#777]">1200 MCFD</span>
                  </div>
                </div>
              </div>

              <div className="rounded-sm border border-[#eee] bg-[#fafafa] p-3">
                <div className="font-semibold">{priorityRegisterForWell(draft.wellId).label}</div>
                <div className="mt-1 font-mono text-[11px] text-[#777]">Register {priorityRegisterForWell(draft.wellId).register}</div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setDraft((current) => ({ ...current, priority }))}
                      className={`rounded-sm border px-2 py-2 text-[11px] font-bold ${
                        draft.priority === priority
                          ? 'border-[#c40000] bg-[#fff3f3] text-[#c40000]'
                          : 'border-[#ddd] bg-white text-[#555]'
                      }`}
                    >
                      Priority {priority}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-2 border-t border-[#eee] px-4 py-4">
              <button onClick={cancelEditor} className="rounded-sm border border-[#d0d0d0] px-4 py-2 text-[12px] font-bold text-[#555]">
                Cancel
              </button>
              <button onClick={reviewWrite} className="rounded-sm border border-[#c40000] bg-[#c40000] px-4 py-2 text-[12px] font-bold text-white">
                Review Write
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editor && draft && confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[430px] overflow-hidden rounded-md border border-[#d0d0d0] bg-white shadow-2xl">
            <div className="bg-[#c40000] px-4 py-3 text-[14px] font-bold text-white">
              Confirm MLink Write
            </div>
            <div className="space-y-3 p-5 text-center text-[13px] text-[#333]">
              <p>Send this customer write to the training widget?</p>
              <div className="rounded-sm border border-[#eee] bg-[#fafafa] px-4 py-3 text-left">
                <div className="font-semibold">{desiredRegisterForWell(draft.wellId).label}</div>
                <div className="font-mono text-[11px] text-[#777]">Reg {desiredRegisterForWell(draft.wellId).register}</div>
                <div className="mt-1 font-bold text-[#222]">{draft.desiredFlow} MCFD</div>
              </div>
              <div className="rounded-sm border border-[#eee] bg-[#fafafa] px-4 py-3 text-left">
                <div className="font-semibold">{priorityRegisterForWell(draft.wellId).label}</div>
                <div className="font-mono text-[11px] text-[#777]">Reg {priorityRegisterForWell(draft.wellId).register}</div>
                <div className="mt-1 font-bold text-[#222]">Priority {draft.priority}</div>
              </div>
            </div>
            <div className="flex justify-center gap-2 border-t border-[#eee] px-4 py-4">
              <button
                onClick={() => setConfirming(false)}
                className="rounded-sm border border-[#d0d0d0] px-4 py-2 text-[12px] font-bold text-[#555]"
              >
                Back
              </button>
              <button
                onClick={saveWrite}
                className="rounded-sm border border-[#c40000] bg-[#c40000] px-4 py-2 text-[12px] font-bold text-white"
              >
                Yes, Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
