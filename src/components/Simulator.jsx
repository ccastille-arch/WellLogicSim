import { useState } from 'react'
import { useSimulation } from '../hooks/useSimulation'
import Sidebar from './Sidebar'
import MetricsDashboard from './MetricsDashboard'
import SiteDiagram from './diagram/SiteDiagram'
import HMIPanel from './hmi/HMIPanel'
import TutorialOverlay from './TutorialOverlay'

export default function Simulator({ config, tutorialMode, onTutorialEnd }) {
  const sim = useSimulation(config)
  const [view, setView] = useState('dashboard') // dashboard | diagram | values | compressors

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <MetricsDashboard metrics={sim.metrics} running={sim.running} onToggleRunning={sim.toggleRunning} />
      <div className="flex-1 flex overflow-hidden">
        {/* Left HMI Navigation */}
        <HMINav currentView={view} onViewChange={setView} />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {view === 'dashboard' ? (
            <HMIPanel
              state={sim.state}
              onCompressorStatus={sim.setCompressorStatus}
              onWellRate={sim.setWellDesiredRate}
              onWellPriorities={sim.setWellPriorities}
              onTotalGas={sim.setTotalAvailableGas}
              onHuntSequence={sim.setHuntSequence}
              onReset={sim.resetToDefaults}
              onChokeManualSP={sim.setChokeManualSP}
              onChokeMode={sim.setChokeMode}
              onCompressorMode={sim.setCompressorMode}
            />
          ) : view === 'diagram' ? (
            <div className="flex-1 overflow-hidden">
              <div className="flex-1 flex overflow-hidden h-full">
                <Sidebar
                  state={sim.state}
                  onCompressorStatus={sim.setCompressorStatus}
                  onWellRate={sim.setWellDesiredRate}
                  onWellPriorities={sim.setWellPriorities}
                  onTotalGas={sim.setTotalAvailableGas}
                  onHuntSequence={sim.setHuntSequence}
                  onReset={sim.resetToDefaults}
                />
                <div className="flex-1 overflow-hidden bg-sc-darker p-3">
                  <SiteDiagram state={sim.state} config={config} />
                </div>
              </div>
            </div>
          ) : view === 'values' ? (
            <ValuesPage state={sim.state} />
          ) : (view === 'compressors' || view === 'global' || view === 'startup' || view === 'channels') ? (
            <CompressorControlPage
              state={sim.state}
              onCompressorStatus={sim.setCompressorStatus}
              onCompressorMode={sim.setCompressorMode}
            />
          ) : null}
        </div>
      </div>

      {/* Bottom Status Bar — matches screenshot */}
      <BottomBar state={sim.state} onReset={sim.resetToDefaults} running={sim.running} onToggleRunning={sim.toggleRunning} />

      {/* Tutorial Overlay */}
      <TutorialOverlay active={tutorialMode} onEnd={onTutorialEnd} />
    </div>
  )
}

function HMINav({ currentView, onViewChange }) {
  // Matches actual DE-4000 panel left nav: Dashboard, Values, Trends, Events, Global, Start-Up, Channels
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
    { id: 'values', label: 'Values', icon: ValuesIcon },
    { id: 'diagram', label: 'Trends', icon: DiagramIcon },
    { id: 'compressors', label: 'Events', icon: EventsIcon },
    { id: 'global', label: 'Global', icon: GlobalIcon },
    { id: 'startup', label: 'Start-Up', icon: StartUpIcon },
    { id: 'channels', label: 'Channels', icon: ChannelsIcon },
  ]

  return (
    <div className="w-[75px] shrink-0 bg-[#222226] border-r border-[#444] flex flex-col items-center pt-1 gap-0">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`w-full flex flex-col items-center gap-0.5 py-2 px-1 text-center transition-colors border-l-2 ${
            currentView === item.id
              ? 'bg-[#2a3a4e] text-white border-l-[#4a9eff]'
              : 'text-[#999] hover:bg-[#2a2a30] hover:text-[#ccc] border-l-transparent'
          }`}
        >
          <item.icon active={currentView === item.id} />
          <span className="text-[9px] font-medium leading-tight">{item.label}</span>
        </button>
      ))}
      {/* Down arrow at bottom like actual panel */}
      <div className="mt-auto pb-2 text-[#666] text-lg">▼</div>
    </div>
  )
}

// SVG icons matching HMI panel style
function DashboardIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#888'} strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
      <path d="M7 12h2M15 12h2M12 7v1M12 16v1" />
    </svg>
  )
}

function ValuesIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#888'} strokeWidth="1.5">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9h16M4 14h16M9 4v16M14 4v16" />
    </svg>
  )
}

function DiagramIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#888'} strokeWidth="1.5">
      <polyline points="4 18 8 12 12 15 16 8 20 12" />
      <path d="M4 4v16h16" />
    </svg>
  )
}

function EventsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#888'} strokeWidth="1.5">
      <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      <path d="M8 6v12" />
    </svg>
  )
}

function GlobalIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#888'} strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18" />
    </svg>
  )
}

function StartUpIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#888'} strokeWidth="1.5">
      <path d="M12 4v8" />
      <path d="M8 6a8 8 0 1 0 8 0" />
    </svg>
  )
}

function ChannelsIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#fff' : '#888'} strokeWidth="1.5">
      <path d="M6 4v16M10 4v16M14 4v16M18 4v16" />
      <path d="M6 8h4M14 12h4M6 16h4M14 8h4" />
    </svg>
  )
}

// Values Page — matches actual DE-4000 Values tab
// Grid of register/tag cards with category filter tabs
function ValuesPage({ state }) {
  const [activeTab, setActiveTab] = useState('All')
  const { compressors, wells } = state

  // Build register list matching actual panel layout
  const registers = buildRegisterList(state)
  const tabs = ['T1', 'T2', 'Temp.', 'Pres.', 'Volt.', 'Percent', 'Curr. Loop', 'Discrete', 'Other', 'All']

  const filtered = activeTab === 'All' ? registers : registers.filter(r => r.category === activeTab)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e22]">
      {/* Category tabs — matches actual panel top bar */}
      <div className="flex gap-0 border-b border-[#444] shrink-0 overflow-x-auto bg-[#2a2a2e]">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-[11px] font-bold tracking-wide whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab
                ? 'text-white border-white bg-[#3a3a4e]'
                : 'text-[#888] border-transparent hover:text-[#ccc] hover:bg-[#333]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Register grid — matches actual panel card grid */}
      <div className="flex-1 overflow-auto p-1">
        <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
          {filtered.map((reg, i) => (
            <RegisterCard key={i} reg={reg} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Individual register card matching actual panel layout:
// [tagName          TYPE_LABEL]
// [     LARGE_VALUE           ]
// [Lo: xxx          Hi: xxx   ]
function RegisterCard({ reg }) {
  const { name, type, value, lo, hi, color, bgColor } = reg

  return (
    <div className={`border border-[#555] px-2 py-1 flex flex-col ${bgColor || 'bg-[#2a2a2e]'}`} style={{ minHeight: 52 }}>
      {/* Top row: tag name + type */}
      <div className="flex items-start justify-between gap-1">
        <span className="text-[8px] text-[#ccc] leading-tight truncate flex-1">{name}</span>
        <span className="text-[7px] text-[#888] shrink-0">{type}</span>
      </div>
      {/* Value — large, right-aligned */}
      <div className="flex-1 flex items-center justify-end">
        <span
          className="text-xl font-bold leading-none text-right"
          style={{ fontFamily: "'Arial Black', Arial, sans-serif", color: color || '#fff' }}
        >
          {value}
        </span>
      </div>
      {/* Bottom row: Lo / Hi range */}
      <div className="flex justify-between text-[7px] text-[#666] mt-0.5">
        <span>Lo: {lo ?? 'NaN'}</span>
        <span>Hi: {hi ?? 'NaN'}</span>
      </div>
    </div>
  )
}

function buildRegisterList(state) {
  const { compressors, wells } = state
  const regs = []

  // Epoch
  regs.push({ name: 'epoch', type: 'VIRTUAL', value: Math.floor(Date.now() / 1000).toString(), lo: 'NaN', hi: 'NaN', category: 'Other' })

  // WellHead Choke FBs (feedback)
  wells.forEach((w, i) => {
    regs.push({ name: `WellHead Choke #${i+1} FB`, type: `T1_IN${i+1}`, value: (-25.0).toFixed(1) + '%', lo: '-10000', hi: '10000', category: 'T1' })
  })

  // Compressor run statuses
  compressors.forEach((c, i) => {
    const isRunning = c.status === 'running' || c.status === 'locked_out_running'
    regs.push({
      name: `Run Status Compress...`, type: `T1_IN${26+i}`,
      value: isRunning ? 'OPEN' : 'CLOSED',
      lo: '0', hi: '10000', category: 'Discrete',
      color: isRunning ? '#fff' : '#fff',
    })
  })

  // Remote Flow Control
  regs.push({ name: 'Remote Flow Control', type: 'T1_IN29', value: 'OPEN', lo: '0', hi: '10000', category: 'Discrete' })

  // Customer Remote Estop
  regs.push({
    name: 'Customer Remote Estop', type: 'T1_IN30',
    value: 'NORMAL', lo: '0', hi: '10000', category: 'Discrete',
    color: '#22c55e', bgColor: 'bg-[#1a3a1a]',
  })

  // Engine/Motor Fault
  regs.push({ name: 'Engine/Motor Fault', type: 'T1_IN31', value: 'OPEN', lo: '0', hi: '10000', category: 'Discrete' })

  // Local Estop
  regs.push({
    name: 'Local Estop', type: 'T1_IN32',
    value: 'NORMAL', lo: '0', hi: '10000', category: 'Discrete',
    color: '#22c55e', bgColor: 'bg-[#1a3a1a]',
  })

  // WellHead Control AOs
  wells.forEach((w, i) => {
    regs.push({ name: `WellHead Control #${i+1} AO`, type: `T1_AO${i+1}`, value: Math.round(w.chokeAO).toString(), lo: 'NaN', hi: 'NaN', category: 'Curr. Loop' })
  })

  // Power Supply Voltage
  regs.push({ name: 'Power Supply Voltage', type: 'T1_PS', value: '24.2', lo: 'NaN', hi: 'NaN', category: 'Volt.' })

  // Fuel / Ignition
  regs.push({ name: 'Fuel', type: 'CTL_DO1', value: '0', lo: 'NaN', hi: 'NaN', category: 'Discrete' })
  regs.push({ name: 'Ignition', type: 'CTL_DO2', value: '0', lo: 'NaN', hi: 'NaN', category: 'Discrete' })

  // Compressor permission
  compressors.forEach((c, i) => {
    regs.push({ name: `Compressor #${i+1} Permi...`, type: `CTL_DO${i+4}`, value: c.status === 'running' ? '1' : '0', lo: 'NaN', hi: 'NaN', category: 'Discrete' })
  })

  // Comms / PID params
  regs.push({ name: 'Comms_Lose_DSCH_...', type: 'PARAM', value: '', lo: 'NaN', hi: 'NaN', category: 'Other' })
  wells.forEach((w, i) => {
    regs.push({ name: `WellHead_${i+1}_PID_Min`, type: 'PARAM', value: '', lo: 'NaN', hi: 'NaN', category: 'Other' })
  })

  // Desired well flows
  wells.forEach((w, i) => {
    regs.push({ name: `Desired_WellFlow_DS...`, type: 'PARAM', value: '', lo: 'NaN', hi: 'NaN', category: 'Other' })
  })

  // Debug epochs
  compressors.forEach((c, i) => {
    regs.push({ name: `Debug_Comp${i+1}_epoch`, type: 'VIRTUAL', value: Math.floor(Date.now() / 1000 + i * 100).toString(), lo: 'NaN', hi: 'NaN', category: 'Other' })
  })

  // Debug flow values
  compressors.forEach((c, i) => {
    regs.push({ name: `Debug_Comp_Flow${i+1}`, type: 'VIRTUAL', value: c.actualThroughput.toFixed(1), lo: 'NaN', hi: 'NaN', category: 'Other' })
  })

  // Config version
  regs.push({ name: 'configVer', type: 'VIRTUAL', value: '330.0', lo: 'NaN', hi: 'NaN', category: 'Other' })

  return regs
}

function CompressorControlPage({ state, onCompressorStatus, onCompressorMode }) {
  return (
    <div className="flex-1 p-4 overflow-auto bg-[#1e1e22]">
      <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
        Compressor Control
      </h2>
      <div className="grid grid-cols-2 gap-4 max-w-[800px]">
        {state.compressors.map(c => (
          <div key={c.id} className="bg-[#2a2a2e] rounded-lg border border-[#444] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold text-white" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>{c.name}</span>
              <StatusIndicator status={c.status} />
            </div>
            <div className="text-[11px] text-[#aaa] mb-3">
              {c.personnelLockout ? (
                <span className="text-[#E8200C] font-bold">LOCKED OUT – PERSONNEL ON SITE</span>
              ) : (
                <span>{c.status === 'running' ? 'RUNNING' : c.status === 'stopped' ? 'STOPPED' : c.status.toUpperCase()}</span>
              )}
            </div>
            {/* Telemetry */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-[11px]">
              <div><span className="text-[#888]">RPM: </span><span className="text-white font-bold">{c.rpm.toFixed(0)}</span></div>
              <div><span className="text-[#888]">Load: </span><span className="text-white font-bold">{c.loadPct.toFixed(0)}%</span></div>
              <div><span className="text-[#888]">Suction: </span><span className="text-white font-bold">{c.suctionPsi.toFixed(0)} PSI</span></div>
              <div><span className="text-[#888]">Discharge: </span><span className="text-white font-bold">{c.dischargePsi.toFixed(0)} PSI</span></div>
              <div><span className="text-[#888]">Flow: </span><span className="text-white font-bold">{c.actualThroughput.toFixed(0)} MCFD</span></div>
              <div><span className="text-[#888]">Suction SP: </span><span className="text-white font-bold">{c.speedAutoSuctionSP.toFixed(0)} PSI</span></div>
            </div>
            {/* Mode selector — document section 8 */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => onCompressorMode?.(c.id, 'manual')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded border ${
                  c.mode === 'manual' ? 'bg-white text-black border-white' : 'border-[#555] text-[#888] hover:text-white'
                }`}
              >
                Manual
              </button>
              <button
                onClick={() => onCompressorMode?.(c.id, 'auto')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded border ${
                  c.mode === 'auto' ? 'bg-white text-black border-white' : 'border-[#555] text-[#888] hover:text-white'
                }`}
              >
                Auto
              </button>
            </div>
            {/* Start/Stop — document section 8 */}
            <div className="flex gap-2">
              <button
                onClick={() => onCompressorStatus(c.id, 'running')}
                disabled={c.personnelLockout}
                className="flex-1 py-2 text-[11px] font-bold rounded bg-[#22c55e] text-black hover:bg-[#16a34a] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ▶ Start
              </button>
              <button
                onClick={() => onCompressorStatus(c.id, 'stopped')}
                disabled={c.personnelLockout}
                className="flex-1 py-2 text-[11px] font-bold rounded bg-[#E8200C] text-white hover:bg-[#c01a0a] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ■ Stop
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusIndicator({ status }) {
  const colors = {
    running: '#22c55e',
    stopped: '#888',
    tripped: '#E8200C',
    locked_out_running: '#eab308',
    locked_out_stopped: '#E8200C',
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[status] || '#888', boxShadow: `0 0 6px ${colors[status] || '#888'}` }} />
    </div>
  )
}

function BottomBar({ state, onReset, running, onToggleRunning }) {
  const runningWells = state.wells.filter(w => w.actualRate > 0).map(w => w.name).join(', ')
  const siteType = state.config.siteType === 'greenfield' ? 'Gas Lift' : 'Oil'

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2e] border-t border-[#444] shrink-0" data-tutorial="bottom-bar">
      {/* Stop / Reset / Start buttons matching screenshot */}
      <button
        onClick={() => onToggleRunning()}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-[#333] rounded border border-[#555] hover:bg-[#444]"
      >
        <span className="w-3 h-3 rounded-full bg-[#E8200C]" />
        <span className="text-[#ccc]">Stop</span>
      </button>
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-[#333] rounded border border-[#555] hover:bg-[#444]"
      >
        <span className="w-3 h-3 rounded-full bg-[#eab308]" />
        <span className="text-[#ccc]">Reset</span>
      </button>
      <button
        onClick={() => onToggleRunning()}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-[#333] rounded border border-[#555] hover:bg-[#444]"
      >
        <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
        <span className="text-[#ccc]">Start</span>
      </button>

      {/* Running status — matches screenshot green bar */}
      <div className={`flex-1 mx-2 py-1.5 px-4 rounded text-center font-bold text-sm ${
        running ? 'bg-[#22c55e] text-black' : 'bg-[#555] text-[#aaa]'
      }`}>
        {running ? `Running: ${runningWells} : ${siteType}` : 'PAUSED'}
      </div>

      {/* Settings gear */}
      <button className="p-1.5 text-[#888] hover:text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      </button>
    </div>
  )
}
