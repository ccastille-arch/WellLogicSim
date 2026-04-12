import { useState, useCallback, Component } from 'react'
import { AuthProvider, useAuth } from './components/auth/AuthProvider'

// Global error boundary — catches any crash and shows recovery UI
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[#080810] h-screen">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg text-white font-bold mb-2" style={{ fontFamily: "'Arial Black'" }}>Something went wrong</h2>
            <p className="text-[12px] text-[#888] mb-4">The page encountered an error.</p>
            <button onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
              className="px-6 py-2 bg-[#E8200C] text-white font-bold rounded-lg hover:bg-[#c01a0a]">
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
import LoginModal from './components/auth/LoginModal'
import AdminDashboard from './components/auth/AdminDashboard'
import { ForumButton, ForumPanel } from './components/Forum'
import MLinkDashboard from './components/MLinkDashboard'
import AutoPilot from './components/demos/AutoPilot'
import { getSelectedLogo } from './components/BrandLogos'

function AppContent() {
  const { user, isAdmin, isTech, canViewQuotes, logout, trackActivity, settings } = useAuth()
  const activeLogo = getSelectedLogo(settings)
  const [page, setPage] = useState('home')
  const [config, setConfig] = useState(null)
  const [tutorialMode, setTutorialMode] = useState(false)
  const [showLogin, setShowLogin] = useState(null)
  const [showForum, setShowForum] = useState(false)

  // Require signup/login before accessing anything
  if (!user) return <SignupGate />

  const navigate = useCallback((target) => {
    trackActivity?.(`Navigated to ${target}`)
    if (target === 'simulator') {
      if (!isTech) { setShowLogin({ target: 'simulator' }); return }
      setPage('simulator')
    } else if (target === 'admin') {
      if (!isAdmin) { setShowLogin({ target: 'admin' }); return }
      setPage('admin')
    } else if (target === 'pipeline') {
      if (!canViewQuotes) { setShowLogin({ target: 'pipeline' }); return }
      setPage('pipeline')
    } else {
      setPage(target)
    }
  }, [isTech, isAdmin, trackActivity])

  const handleLoginComplete = (loggedInUser) => {
    setShowLogin(null)
    if (!loggedInUser) return
    if (showLogin?.target === 'simulator' && (loggedInUser.role === 'tech' || loggedInUser.role === 'admin')) setPage('simulator')
    else if (showLogin?.target === 'admin' && loggedInUser.role === 'admin') setPage('admin')
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <LandingPage onNavigate={navigate} />

      case 'marketing':
        return <MarketingHub onClose={() => setPage('home')} />

      case 'autopilot': {
        // Auto-pilot needs a running simulation
        const apConfig = config || {
          compressorCount: 2, wellCount: 4, siteType: 'greenfield', salesMode: true,
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
        return <UnderConstruction title="Technical Information"
          description="Technical documentation, engineering specifications, and approved operator resources will be available here."
          onBack={() => setPage('home')} />

      case 'quote':
        return <QuoteRequest onBack={() => setPage('home')} />

      case 'pipeline':
        return <QuoteSystem onBack={() => setPage('home')} />

      case 'livedata':
        return <MLinkDashboard onBack={() => setPage('home')} />

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
    <div className="flex flex-col h-screen bg-[#080810]">
      {/* Header for pages that need it */}
      {(page === 'home' || page === 'technical' || page === 'quote' || page === 'admin' || page === 'pipeline' || page === 'livedata') && (
        <header className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0 gap-2" style={{ minHeight: 44 }}>
          <div className="flex items-center gap-2 sm:gap-4 cursor-pointer shrink-0" onClick={() => { setPage('home'); setConfig(null) }}>
            {activeLogo ? (
              <activeLogo.Compact size={32} />
            ) : (
              <>
                <span className="text-sm sm:text-lg tracking-tight" style={{ fontFamily: "'Arial Black'", fontStyle: 'italic', color: '#E8200C' }}>FieldTune™</span>
                <div className="w-px h-5 bg-[#333] hidden sm:block" />
                <span className="text-xs sm:text-sm text-[#ccc] tracking-wide hidden sm:block" style={{ fontFamily: "'Arial Black'" }}>WellLogic™</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap justify-end">
            <span className="text-[9px] sm:text-[11px] text-[#888] hidden sm:inline">👤 {user.name}</span>
            {isTech && <button onClick={() => navigate('simulator')} className="text-[9px] sm:text-[10px] text-[#4fc3f7] hover:text-white font-bold">🔧 Simulator</button>}
            {isAdmin && <button onClick={() => navigate('admin')} className="text-[9px] sm:text-[10px] text-[#f97316] hover:text-white font-bold">⚙️ Admin</button>}
            <button onClick={logout} className="px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-bold text-[#888] border border-[#333] rounded hover:text-white hover:border-[#E8200C]">Logout</button>
          </div>
        </header>
      )}

      {renderPage()}

      {/* Home button — every page except home */}
      {page !== 'home' && (
        <button onClick={() => { setPage('home'); setConfig(null) }}
          className="fixed bottom-5 left-5 z-40 px-4 py-2.5 bg-[#1a1a2a] hover:bg-[#E8200C] border border-[#333] hover:border-[#E8200C] text-[#ccc] hover:text-white rounded-full shadow-lg text-[11px] font-bold transition-all flex items-center gap-2"
          style={{ fontFamily: "'Arial Black'" }}>
          🏠 Home
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
