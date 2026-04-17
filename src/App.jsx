import { useState, useCallback, Component } from 'react'
import { AuthProvider, useAuth } from './components/auth/AuthProvider'

// Global error boundary — catches any crash and shows recovery UI
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center h-screen" style={{ background: '#05233E' }}>
          <div className="text-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <div className="sc-eyebrow mb-3" style={{ color: '#FF5A62' }}>Error</div>
            <h2 style={{ fontWeight: 800, fontSize: 22, color: '#FFFFFF', letterSpacing: '-0.3px', marginBottom: 10 }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 24, fontWeight: 500 }}>
              The page encountered an error.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
              className="sc-btn-primary"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
import SignupGate from './components/auth/SignupGate'
import LandingPage from './components/LandingPage'
import Header from './components/Header'
import ConfigPanel from './components/ConfigPanel'
import Simulator from './components/Simulator'
import MarketingHub from './components/marketing/MarketingHub'
import QuoteSystem from './components/QuoteSystem'
import QuoteRequest from './components/QuoteRequest'
import UnderConstruction from './components/UnderConstruction'
import TechnicalDocs from './components/TechnicalDocs'
import LoginModal from './components/auth/LoginModal'
import AdminDashboard from './components/auth/AdminDashboard'
import { ForumButton, ForumPanel } from './components/Forum'
import MLinkDashboard from './components/MLinkDashboard'
import AutoPilot from './components/demos/AutoPilot'
import SetpointChangeDemo from './components/demos/SetpointChangeDemo'
import { WellLogicCompact } from './components/WellLogicBrand'

function AppContent() {
  const { user, isAdmin, isTech, canViewQuotes, canAccess, logout, trackActivity, settings, loading } = useAuth()
  const [page, setPage] = useState('home')
  const [config, setConfig] = useState(null)
  const [tutorialMode, setTutorialMode] = useState(false)
  const [showLogin, setShowLogin] = useState(null)
  const [showForum, setShowForum] = useState(false)
  const navigate = useCallback((target) => {
    trackActivity?.(`Navigated to ${target}`, target)
    // Permission-gated tiles
    const gatedTiles = ['simulator', 'admin', 'pipeline']
    if (gatedTiles.includes(target) && !canAccess(target)) {
      setShowLogin({ target })
      return
    }
    setPage(target)
  }, [canAccess, trackActivity])

  // Show spinner while restoring session from server
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#05233E' }}>
        <div className="text-center" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          <div className="flex justify-center mb-3 animate-pulse">
            <WellLogicCompact size={46} />
          </div>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#49D0E2', fontWeight: 600 }}>Connecting…</div>
        </div>
      </div>
    )
  }

  // Require signup/login before accessing anything
  if (!user) return <SignupGate />

  const handleLoginComplete = (loggedInUser) => {
    setShowLogin(null)
    if (!loggedInUser) return
    // After login, check if user has permissions for the target tile
    const perms = loggedInUser.permissions || []
    const target = showLogin?.target
    if (target && (perms.includes('*') || perms.includes(`tile:${target}`))) {
      setPage(target)
    }
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <LandingPage onNavigate={navigate} />

      case 'marketing':
        return <MarketingHub onClose={() => setPage('home')} />

      case 'autopilot': {
        // Auto-pilot needs a running simulation. The "Normal
        // Operations" narration tile says "everything is running
        // perfectly" — that claim only holds if the supply side has
        // headroom over the demand side. Default well setpoints sum
        // to 1000+750+800+800 = 3350 MCFD; a pair of default 1600
        // MCFD compressors only covers 3200, so the lowest-priority
        // well starves by ~150 MCFD and the screen contradicts the
        // script. Bumping per-compressor capacity to 1800 gives
        // 3600 MCFD supply and ~250 MCFD of headroom so every well
        // genuinely hits target during Normal Operations. Later
        // scripted actions (tripping a compressor, cutting gas to
        // 50 %) still create the shortfall the narrative needs.
        const apConfig = config || {
          compressorCount: 2, wellCount: 4, siteType: 'greenfield', salesMode: true,
          compressorMaxFlowRate: 1800,
          suctionTarget: 80, suctionHighRange: 20, suctionLowRange: 40, staggerOffset: 2,
          dischargeShutdownPressure: 600, dischargeSlowdownOffset: 50,
          maxTempAtPlate: 165, coolerOutletSP: 200, secondStageSuctionCoolerSP: 200,
          unloadRateThreshold: 5, unloadSpikeThreshold: 15, stabilityTimer: 60, stagingLockoutTimer: 300,
        }
        if (!config) setConfig(apConfig)
        return <Simulator config={apConfig} tutorialMode={false} onTutorialEnd={() => {}} autoPresentation
          onExitPresentation={() => setPage('home')} />
      }

      case 'sales': {
        const salesConfig = config || {
          compressorCount: 2, wellCount: 4, siteType: 'greenfield', salesMode: true,
          suctionTarget: 80, suctionHighRange: 20, suctionLowRange: 40, staggerOffset: 2,
          dischargeShutdownPressure: 600, dischargeSlowdownOffset: 50,
          maxTempAtPlate: 165, coolerOutletSP: 200, secondStageSuctionCoolerSP: 200,
          unloadRateThreshold: 5, unloadSpikeThreshold: 15, stabilityTimer: 60, stagingLockoutTimer: 300,
        }
        if (!config) setConfig(salesConfig)
        return <Simulator config={salesConfig} tutorialMode={tutorialMode} onTutorialEnd={() => setTutorialMode(false)} />
      }

      case 'technical':
        return <TechnicalDocs />

      case 'quote':
        return <QuoteRequest onBack={() => setPage('home')} />

      case 'pipeline':
        return <QuoteSystem onBack={() => setPage('home')} />

      case 'livedata':
        return <MLinkDashboard onBack={() => setPage('home')} />

      case 'setpoint-adjust':
        // Standalone "How to remotely adjust your wells" page. Pulled
        // out of the SalesMode sidebar so it can be surfaced as a
        // first-class home tile.
        return (
          <div className="flex-1 overflow-auto" style={{ background: '#05233E' }}>
            <div className="max-w-[1280px] mx-auto p-4">
              <SetpointChangeDemo />
            </div>
          </div>
        )

      case 'simulator':
        return (
          <>
            <Header onReconfigure={() => { setConfig(null); setPage('simulator') }} tutorialMode={tutorialMode}
              onTutorialToggle={() => setTutorialMode(t => !t)} showTutorial={!!config}
              user={user} onLogout={() => { logout(); }} />
            {!config ? (
              <ConfigPanel onLaunch={cfg => setConfig(cfg)} />
            ) : (
              <Simulator config={config} tutorialMode={tutorialMode} onTutorialEnd={() => setTutorialMode(false)} />
            )}
          </>
        )

      case 'admin':
        return <AdminDashboard onBack={() => setPage('home')} />

      default:
        return <LandingPage onNavigate={navigate} />
    }
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#05233E' }}>
      {/* Header for pages that need it */}
      {(page === 'home' || page === 'technical' || page === 'quote' || page === 'admin' || page === 'pipeline' || page === 'livedata' || page === 'setpoint-adjust') && (
        <header
          className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 shrink-0 gap-2"
          style={{
            minHeight: 48,
            background: '#05233E',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div className="flex items-center gap-2 sm:gap-4 cursor-pointer shrink-0" onClick={() => { setPage('home') }}>
            <WellLogicCompact size={32} />
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <span
              className="hidden sm:inline"
              style={{ fontSize: 11, letterSpacing: 0.6, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}
            >
              {user.name}
            </span>
            {isTech && (
              <button
                onClick={() => navigate('simulator')}
                style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                  color: '#49D0E2', background: 'transparent', border: 0, cursor: 'pointer',
                  padding: '4px 2px',
                }}
                className="hover:text-white transition-colors"
              >
                Simulator
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => navigate('admin')}
                style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                  color: '#f97316', background: 'transparent', border: 0, cursor: 'pointer',
                  padding: '4px 2px',
                }}
                className="hover:text-white transition-colors"
              >
                Admin
              </button>
            )}
            <button
              onClick={logout}
              style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.7)',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '6px 12px',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#D32028'
                e.currentTarget.style.color = '#FFFFFF'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
              }}
            >
              Logout
            </button>
          </div>
        </header>
      )}

      {renderPage()}

      {/* Home button — every page except home */}
      {page !== 'home' && (
        <button
          onClick={() => { setPage('home') }}
          className="fixed bottom-5 left-5 z-40 flex items-center gap-2 transition-all"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#FFFFFF',
            background: '#D32028',
            border: 0,
            padding: '10px 20px',
            borderRadius: 2,
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(211, 32, 40, 0.35)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#B01A20' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#D32028' }}
        >
          ← Home
        </button>
      )}

      {/* Forum — every page */}
      <ForumButton onClick={() => setShowForum(true)} />
      {showForum && <ForumPanel onClose={() => setShowForum(false)} />}

      {/* Login modal for protected areas */}
      {showLogin && <LoginModal title={showLogin.target === 'simulator' ? 'Tech Team Login' : 'Login'} onClose={handleLoginComplete} />}
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
