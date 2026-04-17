import { useAuth } from './auth/AuthProvider'
import WellLogicLogo from './WellLogicBrand'

/**
 * LandingPage — Service Compression brand treatment.
 *
 * Hierarchy matches the SC home page pattern (eyebrow → rule → lockup
 * → hero CTA → secondary grid). The WellLogic logo + tagline stay as
 * authored artwork; everything else is navy/red/cyan/Montserrat.
 */
export default function LandingPage({ onNavigate }) {
  const { canAccess } = useAuth()

  return (
    <div
      className="flex-1 flex flex-col overflow-auto relative"
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, #0F3C64 0%, #05233E 55%, #03172A 100%)',
      }}
    >
      {/* Decorative cyan hex grid accent (matches SC web treatment) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(73,208,226,0.07) 1px, transparent 0)',
          backgroundSize: '22px 22px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.55), transparent 70%)',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.55), transparent 70%)',
        }}
      />

      <div className="max-w-[960px] w-full px-4 sm:px-6 mx-auto py-8 sm:py-14 relative z-10">
        {/* Hero lockup */}
        <div className="text-center mb-10">
          <div className="sc-eyebrow mb-2" style={{ display: 'inline-block' }}>
            Service Compression · FieldTune
          </div>
          <div className="flex justify-center mb-1">
            <span className="sc-rule" aria-hidden="true" />
          </div>
          <div className="flex justify-center mb-4 pt-1 overflow-visible">
            <WellLogicLogo size={140} />
          </div>
          <p
            className="max-w-xl mx-auto"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 500,
              fontSize: 14,
              lineHeight: 1.55,
              color: 'rgba(255, 255, 255, 0.7)',
              letterSpacing: 0.2,
            }}
          >
            Automated gas lift injection optimization — built on live field data,
            tuned to your fleet, not to a spec sheet.
          </p>
        </div>

        {/* Admin dashboard (permission-gated) */}
        {canAccess('admin') && (
          <button
            onClick={() => onNavigate('admin')}
            className="w-full mb-4 transition-all hover:translate-y-[-1px]"
            style={{
              padding: '20px 28px',
              background: 'linear-gradient(135deg, #0F3C64 0%, #05233E 100%)',
              border: '1px solid rgba(249, 115, 22, 0.4)',
              borderLeft: '3px solid #f97316',
              borderRadius: 2,
              color: '#FFFFFF',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: 2,
              textTransform: 'uppercase',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            Admin Dashboard
            <div
              className="mt-1"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 500,
                fontSize: 11,
                letterSpacing: 0.6,
                textTransform: 'none',
                color: 'rgba(255, 255, 255, 0.65)',
              }}
            >
              User management · Sales pipeline · Activity logs
            </div>
          </button>
        )}

        {/* JUMBO Live Stream CTA — sized to jump off a TV screen.
             Red LIVE STREAM badge, big headline, pulsing red border
             glow. This is the first thing a customer should notice on
             the home screen. */}
        <button
          onClick={() => onNavigate('livedata')}
          className="w-full mb-5 sm:mb-7 transition-all group text-left relative"
          style={{
            padding: 0,
            border: '2px solid #D32028',
            borderRadius: 2,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0F3C64 0%, #05233E 60%, #03172A 100%)',
            cursor: 'pointer',
            animation: 'wlLiveGlow 2.2s ease-in-out infinite',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <style>{`
            @keyframes wlLiveGlow {
              0%, 100% { box-shadow: 0 0 0 0 rgba(211, 32, 40, 0.55); }
              50%      { box-shadow: 0 0 44px 4px rgba(211, 32, 40, 0.55); }
            }
          `}</style>
          {/* Telemetry-style dot grid on the right for texture */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(73,208,226,0.10) 1px, transparent 0)',
              backgroundSize: '18px 18px',
              maskImage: 'linear-gradient(90deg, transparent 20%, #000 85%)',
              WebkitMaskImage: 'linear-gradient(90deg, transparent 20%, #000 85%)',
              pointerEvents: 'none',
            }}
          />

          <div className="relative flex items-center justify-between gap-4 px-5 sm:px-8 py-6 sm:py-8">
            <div className="min-w-0">
              <div
                className="inline-flex items-center gap-2 mb-3 px-3 py-1.5"
                style={{
                  background: '#D32028',
                  borderRadius: 2,
                  boxShadow: '0 0 28px rgba(211, 32, 40, 0.55)',
                }}
              >
                <span
                  style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#FFFFFF',
                    boxShadow: '0 0 8px rgba(255,255,255,0.9)',
                    animation: 'scPulse 1.2s ease-in-out infinite',
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 800,
                    fontSize: 12,
                    letterSpacing: 4,
                    color: '#FFFFFF',
                    lineHeight: 1,
                  }}
                >
                  LIVE STREAM
                </span>
              </div>
              <h2
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  fontSize: 'clamp(22px, 3.2vw, 34px)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.8px',
                  color: '#FFFFFF',
                  marginBottom: 8,
                }}
              >
                Watch an Active Well Pad
              </h2>
              <p
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  lineHeight: 1.5,
                  letterSpacing: 0.8,
                  color: '#49D0E2',
                  textTransform: 'uppercase',
                }}
              >
                West Texas · 4 Wells · 2 Compressors · Streaming Now
              </p>
            </div>
            <div className="shrink-0 text-right flex flex-col items-end gap-2">
              <div
                className="group-hover:translate-x-1 transition-transform"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  fontSize: 'clamp(14px, 1.8vw, 20px)',
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                }}
              >
                Watch Live →
              </div>
              <div
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                Real Pad · Real Data
              </div>
            </div>
          </div>
          <div
            className="h-[3px] w-full"
            style={{
              background:
                'linear-gradient(90deg, transparent, #D32028 35%, #49D0E2 65%, transparent)',
            }}
          />
        </button>

        {/* Hero CTA — customer presentation */}
        <button
          onClick={() => onNavigate('autopilot')}
          className="sc-btn-primary w-full mb-6 sm:mb-8"
          style={{
            width: '100%',
            padding: '22px 28px',
            fontSize: 14,
          }}
        >
          Start Customer Presentation →
        </button>

        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 500,
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.55)',
            textAlign: 'center',
            marginTop: '-16px',
            marginBottom: 24,
            lineHeight: 1.5,
          }}
        >
          Auto-guided demo with your uploaded narration · one click, ready to present
        </div>

        {/* Section divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
          <span
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#49D0E2',
            }}
          >
            Explore
          </span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Secondary grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            {
              id: 'marketing',
              tag: 'Marketing',
              title: 'Marketing Material',
              desc: 'Videos, sales sheets, presentation decks, and ROI templates.',
              cta: 'Get materials',
              accent: '#D32028',
            },
            {
              id: 'sales',
              tag: 'Sales · Demo',
              title: 'Sales Demo',
              desc: 'Interactive simulator — run scenarios live during a client call.',
              cta: 'Launch demo',
              accent: '#49D0E2',
            },
            {
              id: 'technical',
              tag: 'Docs · SCADA',
              title: 'Technical Docs',
              desc: 'SCADA registers, electrical drawings, and wiring diagrams.',
              cta: 'View docs',
              accent: '#49D0E2',
            },
            {
              id: 'quote',
              tag: 'Request',
              title: 'Request a Quote',
              desc: 'Get pricing for your pad configuration and deployment.',
              cta: 'Get a quote',
              accent: '#D32028',
            },
            {
              id: 'setpoint-adjust',
              tag: 'Remote · Control',
              title: 'How to Remotely Adjust Your Wells',
              desc: 'Change a well setpoint from the couch — see how the pad rebalances in real time without a truck roll.',
              cta: 'See it work',
              accent: '#49D0E2',
            },
          ].map(section => (
            <button
              key={section.id}
              onClick={() => onNavigate(section.id)}
              className="sc-card text-left group"
              style={{
                borderRadius: 2,
                cursor: 'pointer',
                background: 'rgba(15, 60, 100, 0.5)',
              }}
            >
              <div
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: section.accent,
                  marginBottom: 10,
                }}
              >
                {section.tag}
              </div>
              <span
                className="inline-block"
                style={{
                  width: 32, height: 2, background: section.accent, marginBottom: 14,
                }}
                aria-hidden="true"
              />
              <h2
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  fontSize: 18,
                  lineHeight: 1.15,
                  letterSpacing: '-0.2px',
                  color: '#FFFFFF',
                  marginBottom: 8,
                }}
              >
                {section.title}
              </h2>
              <p
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 500,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: 14,
                }}
              >
                {section.desc}
              </p>
              <span
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: section.accent,
                }}
              >
                {section.cta} →
              </span>
            </button>
          ))}
        </div>

        {/* Permission-gated secondary actions */}
        {(canAccess('simulator') || canAccess('pipeline')) && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {canAccess('simulator') && (
              <button
                onClick={() => onNavigate('simulator')}
                className="sc-btn-ghost"
                style={{ padding: '10px 20px', fontSize: 11 }}
              >
                Tech Simulator
              </button>
            )}
            {canAccess('pipeline') && (
              <button
                onClick={() => onNavigate('pipeline')}
                className="sc-btn-ghost"
                style={{ padding: '10px 20px', fontSize: 11 }}
              >
                Sales Pipeline
              </button>
            )}
          </div>
        )}

        <div
          className="text-center mt-10"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 600,
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          Service Compression · Well Logic
        </div>
      </div>
    </div>
  )
}
