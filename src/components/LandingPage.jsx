import { useAuth } from './auth/AuthProvider'
import { getSelectedLogo } from './BrandLogos'

const SECTIONS = [
  {
    id: 'marketing',
    title: 'Marketing Material',
    icon: '🎬',
    desc: 'Product videos, sales sheets, presentation deck, and ROI templates.',
    color: '#E8200C',
    requiresAuth: false,
  },
  {
    id: 'sales',
    title: 'Sales Demo',
    icon: '📊',
    desc: 'Interactive WellLogic simulator with guided scenarios for client presentations.',
    color: '#22c55e',
    requiresAuth: false,
  },
  {
    id: 'technical',
    title: 'Technical Info',
    icon: '📐',
    desc: 'Technical documentation, specifications, and engineering resources.',
    color: '#4fc3f7',
    requiresAuth: false,
  },
  {
    id: 'quote',
    title: 'Request a Quote',
    icon: '💰',
    desc: 'Get pricing for your pad configuration and WellLogic deployment.',
    color: '#f97316',
    requiresAuth: false,
  },
]

export default function LandingPage({ onNavigate }) {
  const { user, isAdmin, isTech, canViewQuotes, settings } = useAuth()
  const activeLogo = getSelectedLogo(settings)

  return (
    <div className="flex-1 flex items-start sm:items-center justify-center bg-[#080810] overflow-auto py-6 sm:py-10">
      <div className="max-w-[900px] w-full px-4 sm:px-6">
        {/* Branding — Logo or text fallback */}
        <div className="text-center mb-6 sm:mb-10">
          {activeLogo ? (
            <div className="flex justify-center mb-2">
              <activeLogo.Full size={170} />
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-4xl tracking-tight mb-1 sm:mb-2" style={{ fontFamily: "'Arial Black'", fontStyle: 'italic', color: '#E8200C' }}>
                FieldTune™
              </div>
              <div className="text-xl sm:text-2xl text-white font-bold mb-1 sm:mb-2" style={{ fontFamily: "'Arial Black'" }}>
                WellLogic™
              </div>
              <div className="text-xs sm:text-sm text-[#888]">Automated Gas Lift Injection Optimization</div>
              <div className="w-24 h-0.5 bg-[#E8200C] mx-auto mt-3 sm:mt-4" />
              <div className="text-[9px] sm:text-[10px] text-[#555] uppercase tracking-widest mt-2 sm:mt-3">Service Compression</div>
            </>
          )}
        </div>

        {/* ADMIN DASHBOARD — big button for admins */}
        {isAdmin && (
          <button onClick={() => onNavigate('admin')}
            className="w-full mb-4 py-4 sm:py-5 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-xl text-base sm:text-lg transition-all hover:scale-[1.01] shadow-xl shadow-[#f97316]/20"
            style={{ fontFamily: "'Arial Black'" }}>
            ⚙️ ADMIN DASHBOARD
            <div className="text-[10px] sm:text-[11px] font-normal mt-1 opacity-80">User management, tuning parameters, and activity logs</div>
          </button>
        )}

        {/* ONE-CLICK PRESENTATION BUTTON */}
        <button onClick={() => onNavigate('autopilot')}
          className="w-full mb-4 sm:mb-6 py-4 sm:py-5 bg-[#E8200C] hover:bg-[#c01a0a] text-white font-bold rounded-xl text-base sm:text-lg transition-all hover:scale-[1.01] shadow-xl shadow-[#E8200C]/20"
          style={{ fontFamily: "'Arial Black'" }}>
          ▶ START CUSTOMER PRESENTATION
          <div className="text-[10px] sm:text-[11px] font-normal mt-1 opacity-80">Auto-guided demo with voice narration — just click and present</div>
        </button>

        {/* 4 Big Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 mb-6 sm:mb-8">
          {SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => onNavigate(section.id)}
              className="bg-[#111118] rounded-xl border-2 border-[#1a1a2a] p-4 sm:p-8 text-left transition-all hover:scale-[1.02] hover:shadow-xl group"
              style={{ '--hover-color': section.color }}
              onMouseEnter={e => e.currentTarget.style.borderColor = section.color + '60'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a2a'}
            >
              <div className="text-2xl sm:text-4xl mb-2 sm:mb-4">{section.icon}</div>
              <h2 className="text-sm sm:text-lg text-white font-bold mb-1 sm:mb-2" style={{ fontFamily: "'Arial Black'" }}>
                {section.title}
              </h2>
              <p className="text-[10px] sm:text-[12px] text-[#888] leading-relaxed">{section.desc}</p>
              <div className="mt-2 sm:mt-4 text-[10px] sm:text-[11px] font-bold transition-colors" style={{ color: section.color }}>
                Open →
              </div>
            </button>
          ))}
        </div>

        {/* Tech Team access at bottom */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          {isTech && (
            <button onClick={() => onNavigate('simulator')}
              className="px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] font-bold text-[#4fc3f7] border border-[#4fc3f7]/30 rounded hover:bg-[#4fc3f7]/10 transition-colors">
              🔧 Tech Simulator
            </button>
          )}
          {isTech && (
            <button onClick={() => onNavigate('livedata')}
              className="px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] font-bold text-[#22c55e] border border-[#22c55e]/30 rounded hover:bg-[#22c55e]/10 transition-colors">
              📡 Live Field Data
            </button>
          )}
          {canViewQuotes && (
            <button onClick={() => onNavigate('pipeline')}
              className="px-3 sm:px-4 py-2 text-[10px] sm:text-[11px] font-bold text-[#22c55e] border border-[#22c55e]/30 rounded hover:bg-[#22c55e]/10 transition-colors">
              📋 Sales Pipeline
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
