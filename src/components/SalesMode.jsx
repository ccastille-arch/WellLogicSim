import { useState } from 'react'
import AdminPanel from './AdminPanel'
import WellPriorityDemo from './demos/WellPriorityDemo'
import CompressorTripDemo from './demos/CompressorTripDemo'
import GasConstrainedDemo from './demos/GasConstrainedDemo'
import WellUnloadDemo from './demos/WellUnloadDemo'
import SuctionPressureDemo from './demos/SuctionPressureDemo'
import AutoStagingDemo from './demos/AutoStagingDemo'
import PersonnelLockoutDemo from './demos/PersonnelLockoutDemo'
import {
  RevenueTicker, BeforeAfterOverlay, BadDayButton, CustomerDataInput,
  ROICalculator, ResponseTimer, SaturdayNightButton, FeatureToggles,
} from './demos/SalesFeatures'

const DEMOS = [
  { id: 'priority', label: 'Well\nPriority', icon: '📊', Component: WellPriorityDemo },
  { id: 'trip', label: 'Comp\nTrip', icon: '⚡', Component: CompressorTripDemo },
  { id: 'constrained', label: 'Gas\nConstrain', icon: '📉', Component: GasConstrainedDemo },
  { id: 'unload', label: 'Well\nUnload', icon: '💥', Component: WellUnloadDemo },
  { id: 'suction', label: 'Suction\nPressure', icon: '📐', Component: SuctionPressureDemo },
  { id: 'staging', label: 'Auto\nStaging', icon: '🔄', Component: AutoStagingDemo },
  { id: 'lockout', label: 'Personnel\nLockout', icon: '🔒', Component: PersonnelLockoutDemo },
]

const DEFAULT_FEATURES = {
  revenueTicker: true,
  beforeAfter: true,
  responseTimer: true,
  badDay: true,
  saturdayNight: true,
  customerData: false,
  roiCalc: false,
}

export default function SalesMode({ sim, config }) {
  const [activeDemo, setActiveDemo] = useState('priority')
  const [showAdmin, setShowAdmin] = useState(false)
  const [features, setFeatures] = useState(DEFAULT_FEATURES)
  const [customerData, setCustomerData] = useState({
    customerName: '', padName: '', boePrice: 75, gasPrice: 2.5,
    avgProduction: 120, tripsPerMonth: 4, manualResponseMin: 90, constraintPerWeek: 2,
  })
  const [showFeaturePanel, setShowFeaturePanel] = useState(false)

  const toggleFeature = (key) => setFeatures(f => ({ ...f, [key]: !f[key] }))
  const currentDemo = DEMOS.find(d => d.id === activeDemo)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg tracking-tight" style={{ fontFamily: "'Arial Black'", fontStyle: 'italic', color: '#E8200C' }}>FieldTune™</span>
          <div className="w-px h-5 bg-[#333]" />
          <span className="text-sm text-white tracking-wide" style={{ fontFamily: "'Arial Black'" }}>WellLogic™ Demo</span>
          {customerData.customerName && (
            <>
              <div className="w-px h-5 bg-[#333]" />
              <span className="text-[11px] text-[#4fc3f7] font-bold">{customerData.customerName} {customerData.padName && `— ${customerData.padName}`}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFeaturePanel(f => !f)}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors ${
              showFeaturePanel ? 'bg-[#E8200C] text-white border-[#E8200C]' : 'text-[#888] border-[#333] hover:border-[#E8200C] hover:text-white'
            }`}>
            Features
          </button>
          <div className="px-3 py-1 bg-[#E8200C]/10 border border-[#E8200C]/30 rounded text-[10px] text-[#E8200C] font-bold uppercase tracking-wider">
            Sales Demo
          </div>
          <button onClick={() => setShowAdmin(true)} className="p-1.5 text-[#555] hover:text-white" title="Admin Tuning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </div>
      </div>

      {/* Revenue ticker strip — when enabled */}
      {features.revenueTicker && (
        <div className="px-3 py-1.5 bg-[#060610] border-b border-[#1a1a2a] shrink-0">
          <RevenueTicker sim={sim} customerData={customerData} />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Demo navigation */}
        <div className="w-[80px] shrink-0 bg-[#0a0a14] border-r border-[#1a1a2a] flex flex-col items-center py-1 gap-0 overflow-y-auto">
          {DEMOS.map(demo => (
            <button key={demo.id} onClick={() => setActiveDemo(demo.id)}
              className={`w-full flex flex-col items-center gap-0.5 py-2 px-1 text-center transition-all border-l-2 ${
                activeDemo === demo.id
                  ? 'bg-[#1a1a30] text-white border-l-[#E8200C]'
                  : 'text-[#888] hover:bg-[#111120] hover:text-[#ccc] border-l-transparent'
              }`}>
              <span className="text-base leading-none">{demo.icon}</span>
              <span className="text-[7px] font-bold leading-tight whitespace-pre-line mt-0.5">{demo.label}</span>
            </button>
          ))}
        </div>

        {/* Main content — demo page + optional right panel */}
        <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
          {/* Demo page */}
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
            {currentDemo && <currentDemo.Component sim={sim} />}

            {/* Overlay features that appear on disturbance */}
            {(features.beforeAfter || features.responseTimer) && (
              <div className="px-3 pb-2 bg-[#080810] shrink-0 space-y-1 overflow-y-auto" style={{ maxHeight: 200 }}>
                {features.beforeAfter && <BeforeAfterOverlay sim={sim} />}
                {features.responseTimer && <ResponseTimer sim={sim} customerData={customerData} />}
              </div>
            )}
          </div>

          {/* Feature panel (right side, toggled) */}
          {showFeaturePanel && (
            <div className="w-[250px] shrink-0 bg-[#0a0a14] border-l border-[#1a1a2a] overflow-y-auto p-3 sidebar-scroll">
              <FeatureToggles features={features} onToggle={toggleFeature} />

              {features.badDay && <BadDayButton sim={sim} />}
              {features.saturdayNight && <div className="mt-2"><SaturdayNightButton sim={sim} /></div>}
              {features.customerData && <div className="mt-3"><CustomerDataInput data={customerData} onChange={setCustomerData} /></div>}
              {features.roiCalc && <div className="mt-3"><ROICalculator customerData={customerData} /></div>}
            </div>
          )}
        </div>
      </div>

      {showAdmin && <AdminPanel state={sim.state} onFieldChange={sim.setStateField} onClose={() => setShowAdmin(false)} />}
    </div>
  )
}
