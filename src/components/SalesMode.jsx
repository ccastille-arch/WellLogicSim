import { useState } from 'react'
import WellPriorityDemo from './demos/WellPriorityDemo'
import CompressorTripDemo from './demos/CompressorTripDemo'
import GasConstrainedDemo from './demos/GasConstrainedDemo'
import WellUnloadDemo from './demos/WellUnloadDemo'
import SuctionPressureDemo from './demos/SuctionPressureDemo'
import AutoStagingDemo from './demos/AutoStagingDemo'
import PersonnelLockoutDemo from './demos/PersonnelLockoutDemo'

const DEMOS = [
  { id: 'priority', label: 'Well\nPrioritization', icon: '📊', Component: WellPriorityDemo },
  { id: 'trip', label: 'Compressor\nTrip', icon: '⚡', Component: CompressorTripDemo },
  { id: 'constrained', label: 'Gas\nConstrained', icon: '📉', Component: GasConstrainedDemo },
  { id: 'unload', label: 'Well\nUnload', icon: '💥', Component: WellUnloadDemo },
  { id: 'suction', label: 'Suction\nPressure', icon: '📐', Component: SuctionPressureDemo },
  { id: 'staging', label: 'Auto\nStaging', icon: '🔄', Component: AutoStagingDemo },
  { id: 'lockout', label: 'Personnel\nLockout', icon: '🔒', Component: PersonnelLockoutDemo },
]

export default function SalesMode({ sim, config }) {
  const [activeDemo, setActiveDemo] = useState('priority')
  const currentDemo = DEMOS.find(d => d.id === activeDemo)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-2 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg tracking-tight" style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontStyle: 'italic', color: '#E8200C' }}>
            FieldTune™
          </span>
          <div className="w-px h-5 bg-[#333]" />
          <span className="text-sm text-white tracking-wide" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
            WellLogic™ Demo
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-[#E8200C]/10 border border-[#E8200C]/30 rounded text-[10px] text-[#E8200C] font-bold uppercase tracking-wider">
            Sales Presentation Mode
          </div>
          <span className="text-[10px] text-[#555] uppercase tracking-widest">Service Compression</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Demo navigation — left side */}
        <div className="w-[90px] shrink-0 bg-[#0a0a14] border-r border-[#1a1a2a] flex flex-col items-center py-2 gap-0.5 overflow-y-auto">
          {DEMOS.map(demo => (
            <button
              key={demo.id}
              onClick={() => setActiveDemo(demo.id)}
              className={`w-[82px] flex flex-col items-center gap-0.5 py-2 px-1 rounded text-center transition-all border-l-2 ${
                activeDemo === demo.id
                  ? 'bg-[#1a1a30] text-white border-l-[#E8200C]'
                  : 'text-[#888] hover:bg-[#111120] hover:text-[#ccc] border-l-transparent'
              }`}
            >
              <span className="text-lg leading-none">{demo.icon}</span>
              <span className="text-[8px] font-bold leading-tight whitespace-pre-line mt-0.5">{demo.label}</span>
            </button>
          ))}
        </div>

        {/* Active demo page */}
        {currentDemo && <currentDemo.Component sim={sim} />}
      </div>
    </div>
  )
}
