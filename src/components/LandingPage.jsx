import { useAuth } from './auth/AuthProvider'
import WellLogicLogo from './WellLogicBrand'

export default function LandingPage({ onNavigate }) {
  const { canAccess } = useAuth()

  return (
    <div className="flex-1 flex flex-col bg-[#080810] overflow-auto py-6 sm:py-10">
      <div className="max-w-[900px] w-full px-4 sm:px-6 mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-3 pt-2 overflow-visible">
            <WellLogicLogo size={140} />
          </div>
          <p className="text-[11px] sm:text-[13px] text-[#888] max-w-md mx-auto leading-relaxed">
            Automated Gas Lift Injection Optimization - built by Service Compression
          </p>
          <div className="w-24 h-0.5 bg-[#E8200C] mx-auto mt-3" />
        </div>

        {canAccess('admin') && (
          <button
            onClick={() => onNavigate('admin')}
            className="w-full mb-4 py-4 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-xl text-base transition-all hover:scale-[1.01] shadow-xl shadow-[#f97316]/20"
            style={{ fontFamily: "'Arial Black'" }}
          >
            ADMIN DASHBOARD
            <div className="text-[10px] font-normal mt-0.5 opacity-80">
              User management | Sales pipeline | Activity logs
            </div>
          </button>
        )}

        <button
          onClick={() => onNavigate('livedata')}
          className="w-full mb-4 sm:mb-5 rounded-xl overflow-hidden border-2 border-[#22c55e]/40 hover:border-[#22c55e] transition-all hover:scale-[1.01] group"
          style={{ background: 'linear-gradient(135deg, #0a1a0f 0%, #0d1f0d 50%, #0a1408 100%)' }}
        >
          <div className="px-5 sm:px-8 py-5 sm:py-6 flex items-center justify-between gap-4">
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-lg shadow-[#22c55e]/60 animate-pulse" />
                <span className="text-[10px] font-bold text-[#22c55e] tracking-widest uppercase">Live Now</span>
              </div>
              <h2
                className="text-lg sm:text-2xl text-white font-bold leading-tight mb-1"
                style={{ fontFamily: "'Arial Black'" }}
              >
                See a Real Pad Logic System
              </h2>
              <p className="text-[11px] sm:text-[13px] text-[#6ee7a0] leading-relaxed">
                Live data from an active pad running in West Texas - 4 wells, 2 compressors, real injection rates right now.
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[11px] font-bold text-[#22c55e] uppercase tracking-[0.22em] mb-1">Live</div>
              <div className="text-[11px] font-bold text-[#22c55e] group-hover:text-white transition-colors whitespace-nowrap">
                View Live Data {'->'}
              </div>
            </div>
          </div>
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, #22c55e, transparent)' }} />
        </button>

        <button
          onClick={() => onNavigate('autopilot')}
          className="w-full mb-5 sm:mb-6 py-4 sm:py-5 bg-[#E8200C] hover:bg-[#c01a0a] text-white font-bold rounded-xl text-base sm:text-lg transition-all hover:scale-[1.01] shadow-xl shadow-[#E8200C]/20"
          style={{ fontFamily: "'Arial Black'" }}
        >
          START CUSTOMER PRESENTATION
          <div className="text-[10px] sm:text-[11px] font-normal mt-1 opacity-80">
            Auto-guided demo with your uploaded narration - one click, ready to present
          </div>
        </button>

        <div className="flex items-center gap-3 mb-3 sm:mb-4">
          <div className="flex-1 h-px bg-[#1a1a2a]" />
          <span className="text-[9px] text-[#555] uppercase tracking-widest font-bold">Explore</span>
          <div className="flex-1 h-px bg-[#1a1a2a]" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5 sm:mb-6">
          {[
            {
              id: 'marketing',
              icon: 'MM',
              title: 'Marketing Material',
              desc: 'Videos, sales sheets, presentation decks, and ROI templates.',
              color: '#E8200C',
              cta: 'Get materials',
            },
            {
              id: 'sales',
              icon: 'SD',
              title: 'Sales Demo',
              desc: 'Interactive simulator - run scenarios live during a client call.',
              color: '#22c55e',
              cta: 'Launch demo',
            },
            {
              id: 'technical',
              icon: 'TD',
              title: 'Technical Docs',
              desc: 'SCADA registers, electrical drawings, and wiring diagrams.',
              color: '#4fc3f7',
              cta: 'View docs',
            },
            {
              id: 'quote',
              icon: 'QT',
              title: 'Request a Quote',
              desc: 'Get pricing for your pad configuration and deployment.',
              color: '#f97316',
              cta: 'Get a quote',
            },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => onNavigate(section.id)}
              className="bg-[#111118] rounded-xl border-2 border-[#1a1a2a] p-4 sm:p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl"
              onMouseEnter={(event) => {
                event.currentTarget.style.borderColor = `${section.color}55`
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.borderColor = '#1a1a2a'
              }}
            >
              <div className="text-[18px] sm:text-[22px] mb-2 sm:mb-3 font-black tracking-[0.14em]" style={{ color: section.color }}>
                {section.icon}
              </div>
              <h2 className="text-[12px] sm:text-[15px] text-white font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>
                {section.title}
              </h2>
              <p className="text-[9px] sm:text-[11px] text-[#888] leading-relaxed mb-2 sm:mb-3">
                {section.desc}
              </p>
              <span className="text-[9px] sm:text-[10px] font-bold" style={{ color: section.color }}>
                {section.cta} {'->'}
              </span>
            </button>
          ))}
        </div>

        {(canAccess('simulator') || canAccess('pipeline')) && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {canAccess('simulator') && (
              <button
                onClick={() => onNavigate('simulator')}
                className="px-4 py-2 text-[10px] font-bold text-[#4fc3f7] border border-[#4fc3f7]/30 rounded-lg hover:bg-[#4fc3f7]/10 transition-colors"
              >
                Tech Simulator
              </button>
            )}
            {canAccess('pipeline') && (
              <button
                onClick={() => onNavigate('pipeline')}
                className="px-4 py-2 text-[10px] font-bold text-[#f97316] border border-[#f97316]/30 rounded-lg hover:bg-[#f97316]/10 transition-colors"
              >
                Sales Pipeline
              </button>
            )}
          </div>
        )}

        <div className="text-center mt-6 text-[9px] text-[#2a2a3a]">Service Compression · Pad Logic</div>
      </div>
    </div>
  )
}

