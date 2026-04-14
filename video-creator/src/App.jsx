import { useState, useEffect } from 'react'
import Login from './components/Login.jsx'
import VideoCreator from './components/VideoCreator.jsx'
import AdminPanel from './components/AdminPanel.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('creator') // 'creator' | 'admin'

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('vc_token')
    if (!token) {
      setLoading(false)
      return
    }
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (u) setUser({ ...u, token })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogin = (userData) => {
    localStorage.setItem('vc_token', userData.token)
    setUser(userData)
  }

  const handleLogout = () => {
    const token = localStorage.getItem('vc_token')
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    localStorage.removeItem('vc_token')
    setUser(null)
    setView('creator')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080810' }}>
        <div className="text-slate-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  if (view === 'admin' && user.role === 'admin') {
    return <AdminPanel user={user} onBack={() => setView('creator')} />
  }

  return <VideoCreator user={user} onLogout={handleLogout} onAdmin={user.role === 'admin' ? () => setView('admin') : null} />
}
