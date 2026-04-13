import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [users, setUsers]     = useState([])
  const [settings, setSettings] = useState({ forumPublic: true, quoteViewers: [] })
  const [activity, setActivity] = useState([])
  const [quotes, setQuotes]   = useState([])
  const [loading, setLoading] = useState(true) // true while restoring session

  // ─── Restore session on mount ───────────────────────────────────
  useEffect(() => {
    const token = api.token.get()
    if (!token) { setLoading(false); return }

    api.auth.me()
      .then(({ user }) => {
        setUser(user)
        // Prefetch shared data now that we're logged in
        return Promise.all([
          api.settings.get().then(setSettings).catch(() => {}),
        ])
      })
      .catch(() => {
        // Token expired / invalid — clear it
        api.token.set(null)
      })
      .finally(() => setLoading(false))
  }, [])

  // ─── Load admin data when user becomes admin/tech ───────────────
  useEffect(() => {
    if (!user) return
    if (user.role === 'admin') {
      api.users.list().then(setUsers).catch(() => {})
      api.activity.list().then(setActivity).catch(() => {})
      api.quotes.list().then(setQuotes).catch(() => {})
    } else if (user.role === 'tech') {
      api.quotes.list().then(setQuotes).catch(() => {})
    }
  }, [user?.role])

  // ─── Auth actions ────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    try {
      const { token, user } = await api.auth.login(username, password)
      api.token.set(token)
      setUser(user)
      if (user.role === 'admin') {
        api.settings.get().then(setSettings).catch(() => {})
        api.users.list().then(setUsers).catch(() => {})
        api.activity.list().then(setActivity).catch(() => {})
        api.quotes.list().then(setQuotes).catch(() => {})
      }
      return { success: true, user }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const signup = useCallback(async (firstName, lastName) => {
    try {
      const { token, user } = await api.auth.signup(firstName, lastName)
      api.token.set(token)
      setUser(user)
      api.settings.get().then(setSettings).catch(() => {})
      return { success: true, user }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => {})
    api.token.set(null)
    setUser(null)
    setUsers([])
    setActivity([])
    setQuotes([])
  }, [])

  // ─── Track activity ──────────────────────────────────────────────
  const trackActivity = useCallback((action) => {
    if (!user) return
    api.activity.log(action).catch(() => {})
    // Optimistically update local list (admin sees it immediately)
    if (user.role === 'admin') {
      const entry = { user: user.name, action, timestamp: new Date().toISOString() }
      setActivity(prev => [entry, ...prev].slice(0, 500))
    }
  }, [user])

  // ─── User management (admin) ─────────────────────────────────────
  const addUser = useCallback(async (newUser) => {
    try {
      await api.users.create(newUser)
      const updated = await api.users.list()
      setUsers(updated)
      return true
    } catch { return false }
  }, [])

  const removeUser = useCallback(async (username) => {
    if (username === 'cody') return false
    try {
      await api.users.remove(username)
      setUsers(prev => prev.filter(u => u.username !== username))
      return true
    } catch { return false }
  }, [])

  const updateUserRole = useCallback(async (username, role) => {
    if (username === 'cody') return
    try {
      await api.users.updateRole(username, role)
      setUsers(prev => prev.map(u => u.username === username ? { ...u, role } : u))
    } catch {}
  }, [])

  // ─── Settings ────────────────────────────────────────────────────
  const updateSettings = useCallback(async (key, value) => {
    const update = { [key]: value }
    setSettings(prev => ({ ...prev, ...update }))
    await api.settings.update(update).catch(() => {})
  }, [])

  // ─── Quotes ──────────────────────────────────────────────────────
  const addQuote = useCallback(async (quote) => {
    try {
      const newQuote = await api.quotes.create(quote)
      setQuotes(prev => [newQuote, ...prev])
      trackActivity(`Created quote for ${quote.customerName}`)
      return newQuote
    } catch { return null }
  }, [trackActivity])

  const updateQuote = useCallback(async (id, updates) => {
    try {
      await api.quotes.update(id, updates)
      setQuotes(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q))
      trackActivity(`Updated quote #${id}`)
    } catch {}
  }, [trackActivity])

  const deleteQuote = useCallback(async (id) => {
    try {
      await api.quotes.remove(id)
      setQuotes(prev => prev.filter(q => q.id !== id))
      trackActivity(`Deleted quote #${id}`)
    } catch {}
  }, [trackActivity])

  // ─── Derived permissions ─────────────────────────────────────────
  const isAdmin = user?.role === 'admin'
  const isTech  = user?.role === 'tech' || isAdmin
  const canViewQuotes = isAdmin || (settings.quoteViewers || []).includes(user?.username)

  return (
    <AuthContext.Provider value={{
      user, users, settings, activity, quotes,
      isAdmin, isTech, isLoggedIn: !!user, canViewQuotes,
      loading,
      login, signup, logout,
      addUser, removeUser, updateUserRole,
      updateSettings, trackActivity,
      addQuote, updateQuote, deleteQuote,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
