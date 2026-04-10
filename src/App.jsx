import { useState, useCallback } from 'react'
import { AuthProvider, useAuth } from './components/auth/AuthProvider'
import LandingPage from './components/LandingPage'
import Header from './components/Header'
import ConfigPanel from './components/ConfigPanel'
import Simulator from './components/Simulator'
import MarketingHub from './components/marketing/MarketingHub'
import UnderConstruction from './components/UnderConstruction'
import LoginModal from './components/auth/LoginModal'
import AdminDashboard from './components/auth/AdminDashboard'
import { ForumButton, ForumPanel } from './components/Forum'

function AppContent() {
  const { user, isAdmin, isTech, logout } = useAuth()
  const [page, setPage] = useState('home') // home | marketing | sales | technical | quote | simulator | admin
  const [config, setConfig] = useState(null)
  const [tutorialMode, setTutorialMode] = useState(false)
  const [showLogin, setShowLogin] = useState(null) // null or { target: 'tech' | 'admin' }
  const [showForum, setShowForum] = useState(false)

  const navigate = useCallback((target) => {
    if (target === 'simulator') {
      if (!isTech) { setShowLogin({ target: 'simulator' }); return }
      setPage('simulator')
    } else if (target === 'admin') {
      if (!isAdmin) { setShowLogin({ target: 'admin' }); return }
      setPage('admin')
    } else {
      setPage(target)
    }
  }, [isTech, isAdmin])

  const handleLoginComplete = (loggedInUser) => {
    setShowLogin(null)
    if (!loggedInUser) return
    // After login, navigate to the originally requested page
    if (showLogin?.target === 'simulator' && (loggedInUser.role === 'tech' || loggedInUser.role === 'admin')) {
      setPage('simulator')
    } else if (showLogin?.target === 'admin' && loggedInUser.role === 'admin') {
      setPage('admin')
    }
  }

  // Determine what to show based on current page
  const renderPage = () => {
    switch (page) {
      case 'home':
        return <LandingPage onNavigate={navigate} />

      case 'marketing':
        return <MarketingHub onClose={() => setPage('home')} />

      case 'sales':
        return (
          <>
            <Header onReconfigure={() => setPage('home')} tutorialMode={tutorialMode}
              onTutorialToggle={() => setTutorialMode(t => !t)} showTutorial={!!config} />
            {!config ? (
              <ConfigPanel onLaunch={cfg => setConfig({ ...cfg, salesMode: true })} forceSalesMode />
            ) : (
              <Simulator config={config} tutorialMode={tutorialMode} onTutorialEnd={() => setTutorialMode(false)} />
            )}
          </>
        )

      case 'technical':
        return (
          <UnderConstruction
            title="Technical Information"
            description="Technical documentation, engineering specifications, and approved operator resources will be available here. Document upload functionality coming soon."
            onBack={() => setPage('home')}
          />
        )

      case 'quote':
        return (
          <UnderConstruction
            title="Request a Quote"
            description="Custom pricing and quote generation for your pad configuration is coming soon. Contact your Service Compression representative in the meantime."
            onBack={() => setPage('home')}
          />
        )

      case 'simulator':
        return (
          <>
            <Header onReconfigure={() => { setConfig(null); setPage('simulator') }} tutorialMode={tutorialMode}
              onTutorialToggle={() => setTutorialMode(t => !t)} showTutorial={!!config}
              user={user} onLogout={() => { logout(); setPage('home') }} />
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
      {/* Header for landing page */}
      {(page === 'home' || page === 'technical' || page === 'quote' || page === 'admin') && (
        <header className="flex items-center justify-between px-5 py-2.5 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0" style={{ minHeight: 48 }}>
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setPage('home'); setConfig(null) }}>
            <span className="text-lg tracking-tight" style={{ fontFamily: "'Arial Black'", fontStyle: 'italic', color: '#E8200C' }}>FieldTune™</span>
            <div className="w-px h-6 bg-[#333]" />
            <span className="text-sm text-[#ccc] tracking-wide" style={{ fontFamily: "'Arial Black'" }}>WellLogic™</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-[10px] text-[#888]">👤 {user.name || user.username}</span>
                {isTech && <button onClick={() => navigate('simulator')} className="text-[10px] text-[#4fc3f7] hover:text-white">Simulator</button>}
                {isAdmin && <button onClick={() => navigate('admin')} className="text-[10px] text-[#f97316] hover:text-white">Admin</button>}
                <button onClick={() => { logout(); setPage('home') }} className="text-[10px] text-[#888] hover:text-white">Logout</button>
              </>
            ) : (
              <button onClick={() => setShowLogin({ target: 'general' })}
                className="px-3 py-1.5 text-[10px] font-bold text-[#888] border border-[#333] rounded hover:text-white hover:border-[#E8200C]">
                Login
              </button>
            )}
          </div>
        </header>
      )}

      {renderPage()}

      {/* Forum floating button — visible on every page */}
      <ForumButton onClick={() => setShowForum(true)} />
      {showForum && <ForumPanel onClose={() => setShowForum(false)} />}

      {/* Login modal */}
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
