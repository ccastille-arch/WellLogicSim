import { useState } from 'react'
import { useAuth } from './auth/AuthProvider'
import { getSelectedLogo } from './BrandLogos'

const MLINK_STORAGE_KEY = 'mlink_exe_path'
const MLINK_DEFAULT = 'C:\\Users\\%USERNAME%\\Downloads\\M-Link Connect - Remote Device Management 0.0.12.exe'

export default function LandingPage({ onNavigate }) {
  const { user, isAdmin, isTech, canViewQuotes, canAccess, trackActivity, settings } = useAuth()
  const activeLogo = getSelectedLogo(settings)
  const [mlinkModal, setMlinkModal] = useState(null) // null | 'setup' | 'launch'
  const [mlinkPath, setMlinkPath] = useState(() => localStorage.getItem(MLINK_STORAGE_KEY) || '')
  const [mlinkCopied, setMlinkCopied] = useState(false)

  const handleMlinkClick = () => {
    const saved = localStorage.getItem(MLINK_STORAGE_KEY)
    if (saved) {
      setMlinkPath(saved)
      setMlinkModal('launch')
    } else {
      setMlinkPath(MLINK_DEFAULT.replace('%USERNAME%', user?.username || 'YourUsername'))
      setMlinkModal('setup')
    }
    setMlinkCopied(false)
  }

  const saveMlinkPath = () => {
    localStorage.setItem(MLINK_STORAGE_KEY, mlinkPath)
    setMlinkModal('launch')
  }

  const copyMlinkPath = () => {
    navigator.clipboard.writeText(`"${mlinkPath}"`).then(() => {
      setMlinkCopied(true)
      setTimeout(() => setMlinkCopied(false), 2000)
    })
  }

  return (
    <div className="flex-1 flex flex-col bg-[#080810] overflow-auto py-6 sm:py-10">
      <div className="max-w-[900px] w-full px-4 sm:px-6 mx-auto">

        {/* ─── Branding ─── */}
        <div className="text-center mb-6 sm:mb-8">
          {activeLogo ? (
            <div className="flex justify-center mb-3 pt-2 overflow-visible">
              <activeLogo.Full size={140} />
            </div>
          ) : (
            <>
              <div className="text-2xl sm:text-4xl tracking-tight mb-1" style={{ fontFamily: "'Arial Black'", fontStyle: 'italic', color: '#E8200C' }}>
                FieldTune™
              </div>
              <div className="text-xl sm:text-2xl text-white font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>
                WellLogic™
              </div>
            </>
          )}
          <p className="text-[11px] sm:text-[13px] text-[#888] max-w-md mx-auto leading-relaxed">
            Automated Gas Lift Injection Optimization — built by Service Compression
          </p>
          <div className="w-24 h-0.5 bg-[#E8200C] mx-auto mt-3" />
        </div>

        {/* ─── Admin Dashboard ─── */}
        {canAccess('admin') && (
          <button onClick={() => onNavigate('admin')}
            className="w-full mb-4 py-4 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-xl text-base transition-all hover:scale-[1.01] shadow-xl shadow-[#f97316]/20"
            style={{ fontFamily: "'Arial Black'" }}>
            ⚙️ ADMIN DASHBOARD
            <div className="text-[10px] font-normal mt-0.5 opacity-80">User management · Sales pipeline · Activity logs</div>
          </button>
        )}

        {/* ─── LIVE FIELD DATA — Hero CTA ─── */}
        <button onClick={() => onNavigate('livedata')}
          className="w-full mb-4 sm:mb-5 rounded-xl overflow-hidden border-2 border-[#22c55e]/40 hover:border-[#22c55e] transition-all hover:scale-[1.01] group"
          style={{ background: 'linear-gradient(135deg, #0a1a0f 0%, #0d1f0d 50%, #0a1408 100%)' }}>
          <div className="px-5 sm:px-8 py-5 sm:py-6 flex items-center justify-between gap-4">
            <div className="text-left">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-lg shadow-[#22c55e]/60 animate-pulse" />
                <span className="text-[10px] font-bold text-[#22c55e] tracking-widest uppercase">Live Now</span>
              </div>
              <h2 className="text-lg sm:text-2xl text-white font-bold leading-tight mb-1" style={{ fontFamily: "'Arial Black'" }}>
                See a Real WellLogic System
              </h2>
              <p className="text-[11px] sm:text-[13px] text-[#6ee7a0] leading-relaxed">
                Live data from an active pad running in West Texas — 4 wells, 2 compressors, real injection rates right now.
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-3xl sm:text-4xl mb-1">📡</div>
              <div className="text-[11px] font-bold text-[#22c55e] group-hover:text-white transition-colors whitespace-nowrap">
                View Live Data →
              </div>
            </div>
          </div>
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, #22c55e, transparent)' }} />
        </button>

        {/* ─── Start Presentation ─── */}
        <button onClick={() => onNavigate('autopilot')}
          className="w-full mb-5 sm:mb-6 py-4 sm:py-5 bg-[#E8200C] hover:bg-[#c01a0a] text-white font-bold rounded-xl text-base sm:text-lg transition-all hover:scale-[1.01] shadow-xl shadow-[#E8200C]/20"
          style={{ fontFamily: "'Arial Black'" }}>
          ▶ START CUSTOMER PRESENTATION
          <div className="text-[10px] sm:text-[11px] font-normal mt-1 opacity-80">Auto-guided demo with voice narration — one click, ready to present</div>
        </button>

        {/* ─── Section label ─── */}
        <div className="flex items-center gap-3 mb-3 sm:mb-4">
          <div className="flex-1 h-px bg-[#1a1a2a]" />
          <span className="text-[9px] text-[#555] uppercase tracking-widest font-bold">Explore</span>
          <div className="flex-1 h-px bg-[#1a1a2a]" />
        </div>

        {/* ─── 4 Cards ─── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5 sm:mb-6">
          {[
            { id: 'marketing', icon: '🎬', title: 'Marketing Material', desc: 'Videos, sales sheets, presentation decks, and ROI templates.', color: '#E8200C', cta: 'Get materials' },
            { id: 'sales',     icon: '📊', title: 'Sales Demo',         desc: 'Interactive simulator — run scenarios live during a client call.', color: '#22c55e', cta: 'Launch demo' },
            { id: 'technical', icon: '📐', title: 'Technical Docs',     desc: 'SCADA registers, electrical drawings, and wiring diagrams.', color: '#4fc3f7', cta: 'View docs' },
            { id: 'quote',     icon: '💰', title: 'Request a Quote',    desc: 'Get pricing for your pad configuration and deployment.', color: '#f97316', cta: 'Get a quote' },
          ].map(s => (
            <button key={s.id} onClick={() => onNavigate(s.id)}
              className="bg-[#111118] rounded-xl border-2 border-[#1a1a2a] p-4 sm:p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl"
              onMouseEnter={e => e.currentTarget.style.borderColor = s.color + '55'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a2a'}>
              <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{s.icon}</div>
              <h2 className="text-[12px] sm:text-[15px] text-white font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>{s.title}</h2>
              <p className="text-[9px] sm:text-[11px] text-[#888] leading-relaxed mb-2 sm:mb-3">{s.desc}</p>
              <span className="text-[9px] sm:text-[10px] font-bold" style={{ color: s.color }}>{s.cta} →</span>
            </button>
          ))}
        </div>

        {/* ─── Detechtion Launchpad ─── */}
        {canAccess('detechtion_launchpad') && (
        <a href="https://launchpad.detechtion.com/" target="_blank" rel="noopener noreferrer"
          onClick={() => trackActivity('Opened Detechtion Launchpad', 'detechtion_launchpad')}
          className="w-full mb-4 bg-[#111118] border border-[#3b82f6]/30 rounded-xl px-5 py-3 flex items-center justify-between hover:border-[#3b82f6]/60 transition-colors group block no-underline">
          <div className="flex items-center gap-3">
            <span className="text-lg">🚀</span>
            <div className="text-left">
              <div className="text-[11px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>Detechtion Launchpad</div>
              <div className="text-[9px] text-[#888]">Access the full Detechtion platform</div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#3b82f6] group-hover:text-white transition-colors">Open ↗</span>
        </a>
        )}

        {/* ─── M-Link Connect ─── */}
        {canAccess('mlink_connect') && (
        <button onClick={handleMlinkClick}
          className="w-full mb-4 bg-[#111118] border border-[#10b981]/30 rounded-xl px-5 py-3 flex items-center justify-between hover:border-[#10b981]/60 transition-colors group">
          <div className="flex items-center gap-3">
            <span className="text-lg">🔗</span>
            <div className="text-left">
              <div className="text-[11px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>M-Link Connect</div>
              <div className="text-[9px] text-[#888]">Remote Device Management</div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#10b981] group-hover:text-white transition-colors">Launch →</span>
        </button>
        )}

        {/* ─── M-Link Modal ─── */}
        {mlinkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setMlinkModal(null)}>
            <div className="bg-[#111118] border border-[#1a1a2a] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              {mlinkModal === 'setup' ? (
                <>
                  <h3 className="text-sm font-bold text-white mb-1" style={{ fontFamily: "'Arial Black'" }}>Configure M-Link Connect</h3>
                  <p className="text-[10px] text-[#888] mb-4">
                    Set the file path to M-Link Connect on your computer. This only needs to be done once.
                  </p>
                  <label className="block text-[10px] text-[#888] mb-1">Path to .exe</label>
                  <input
                    type="text"
                    value={mlinkPath}
                    onChange={e => setMlinkPath(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-[11px] text-white outline-none focus:ring-1 focus:ring-[#10b981] mb-4 font-mono"
                    style={{ background: '#080810', border: '1px solid #1e1e30' }}
                    spellCheck={false}
                  />
                  <div className="flex gap-2">
                    <button onClick={saveMlinkPath}
                      className="flex-1 py-2 rounded-lg text-[11px] font-bold text-white" style={{ background: '#10b981' }}>
                      Save & Continue
                    </button>
                    <button onClick={() => setMlinkModal(null)}
                      className="px-4 py-2 rounded-lg text-[11px] text-[#888] border border-[#1e1e30] hover:bg-white/5">
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-white mb-1" style={{ fontFamily: "'Arial Black'" }}>Launch M-Link Connect</h3>
                  <p className="text-[10px] text-[#888] mb-3">
                    Copy the path below, then press <span className="text-white font-bold">Win + R</span> and paste it to launch.
                  </p>
                  <div className="rounded-lg px-3 py-2 font-mono text-[10px] text-[#10b981] mb-3 break-all" style={{ background: '#080810', border: '1px solid #1e1e30' }}>
                    "{mlinkPath}"
                  </div>
                  <div className="flex gap-2">
                    <button onClick={copyMlinkPath}
                      className="flex-1 py-2 rounded-lg text-[11px] font-bold text-white transition-colors"
                      style={{ background: mlinkCopied ? '#059669' : '#10b981' }}>
                      {mlinkCopied ? 'Copied!' : 'Copy Path'}
                    </button>
                    <button onClick={() => { setMlinkModal('setup'); setMlinkCopied(false) }}
                      className="px-4 py-2 rounded-lg text-[11px] text-[#888] border border-[#1e1e30] hover:bg-white/5">
                      Change Path
                    </button>
                    <button onClick={() => setMlinkModal(null)}
                      className="px-4 py-2 rounded-lg text-[11px] text-[#888] border border-[#1e1e30] hover:bg-white/5">
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ─── Logo Vote banner ─── */}
        <button onClick={() => onNavigate('vote')}
          className="w-full mb-4 bg-[#111118] border border-[#a78bfa]/30 rounded-xl px-5 py-3 flex items-center justify-between hover:border-[#a78bfa]/60 transition-colors group">
          <div className="flex items-center gap-3">
            <span className="text-lg">🗳</span>
            <div className="text-left">
              <div className="text-[11px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>Vote on the New Logo</div>
              <div className="text-[9px] text-[#888]">15 designs — pick your favorite</div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#a78bfa] group-hover:text-white transition-colors">View & Vote →</span>
        </button>

        {/* ─── Tech / Pipeline access ─── */}
        {(canAccess('simulator') || canAccess('pipeline')) && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {canAccess('simulator') && (
              <button onClick={() => onNavigate('simulator')}
                className="px-4 py-2 text-[10px] font-bold text-[#4fc3f7] border border-[#4fc3f7]/30 rounded-lg hover:bg-[#4fc3f7]/10 transition-colors">
                🔧 Tech Simulator
              </button>
            )}
            {canAccess('pipeline') && (
              <button onClick={() => onNavigate('pipeline')}
                className="px-4 py-2 text-[10px] font-bold text-[#f97316] border border-[#f97316]/30 rounded-lg hover:bg-[#f97316]/10 transition-colors">
                📋 Sales Pipeline
              </button>
            )}
          </div>
        )}

        <div className="text-center mt-6 text-[9px] text-[#2a2a3a]">Service Compression · WellLogic™ · FieldTune™</div>
      </div>
    </div>
  )
}
