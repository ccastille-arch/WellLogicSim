import { useState, useCallback } from 'react'
import { AuthProvider, useAuth } from './components/auth/AuthProvider'
import SignupGate from './components/auth/SignupGate'
import LandingPage from './components/LandingPage'
import Header from './components/Header'
import ConfigPanel from './components/ConfigPanel'
import Simulator from './components/Simulator'
import MarketingHub from './components/marketing/MarketingHub'
import QuoteSystem from './components/QuoteSystem'
import UnderConstruction from './components/UnderConstruction'
import LoginModal from './components/auth/LoginModal'
import AdminDashboard from './components/auth/AdminDashboard'
import { ForumButton, ForumPanel } from './components/Forum'

function AppContent() {
  const { user, isAdmin, isTech, logout, trackActivity } = useAuth()
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
        return <QuoteSystem onBack={() => setPage('home')} />

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
      {(page === 'home' || page === 'technical' || page === 'quote' || page === 'admin') && (
        <header className="flex items-center justify-between px-5 py-2.5 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0" style={{ minHeight: 48 }}>
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setPage('home'); setConfig(null) }}>
            <span className="text-lg tracking-tight" style={{ fontFamily: "'Arial Black'", fontStyle: 'italic', color: '#E8200C' }}>FieldTune™</span>
            <div className="w-px h-6 bg-[#333]" />
            <span className="text-sm text-[#ccc] tracking-wide" style={{ fontFamily: "'Arial Black'" }}>WellLogic™</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#888]">👤 {user.name}</span>
            {isTech && <button onClick={() => navigate('simulator')} className="text-[10px] text-[#4fc3f7] hover:text-white font-bold">🔧 Simulator</button>}
            {isAdmin && <button onClick={() => navigate('admin')} className="text-[10px] text-[#f97316] hover:text-white font-bold">⚙️ Admin</button>}
            <button onClick={logout} className="px-3 py-1 text-[10px] font-bold text-[#888] border border-[#333] rounded hover:text-white hover:border-[#E8200C]">Logout</button>
          </div>
        </header>
      )}

      {renderPage()}

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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
