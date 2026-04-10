import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const DEFAULT_USERS = [
  { username: 'cody', password: 'Brayden25!', role: 'admin', name: 'Cody Castille', createdAt: new Date().toISOString() },
  { username: 'techteam', password: '123', role: 'tech', name: 'Tech Team', createdAt: new Date().toISOString() },
]

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => load('welllogic_session', null))
  const [users, setUsers] = useState(() => load('welllogic_users', DEFAULT_USERS))
  const [settings, setSettings] = useState(() => load('welllogic_settings', { forumPublic: true, quoteViewers: [] }))
  const [activity, setActivity] = useState(() => load('welllogic_activity', []))
  const [quotes, setQuotes] = useState(() => load('welllogic_quotes', []))

  useEffect(() => { save('welllogic_users', users) }, [users])
  useEffect(() => { save('welllogic_settings', settings) }, [settings])
  useEffect(() => { save('welllogic_activity', activity) }, [activity])
  useEffect(() => { save('welllogic_quotes', quotes) }, [quotes])

  // Track user activity
  const trackActivity = useCallback((action) => {
    if (!user) return
    const entry = { user: user.name || user.username, action, timestamp: new Date().toISOString() }
    setActivity(prev => [entry, ...prev].slice(0, 500)) // keep last 500
  }, [user])

  // Login
  const login = (username, password) => {
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password)
    if (found) {
      const session = { username: found.username, role: found.role, name: found.name }
      setUser(session)
      save('welllogic_session', session)
      // Track login
      const entry = { user: found.name, action: 'Logged in', timestamp: new Date().toISOString() }
      setActivity(prev => [entry, ...prev].slice(0, 500))
      return { success: true, user: session }
    }
    return { success: false, error: 'Invalid credentials' }
  }

  // Self-signup — first name + last name
  const signup = (firstName, lastName) => {
    const fn = firstName.trim()
    const ln = lastName.trim()
    if (!fn || !ln) return { success: false, error: 'First and last name required' }
    const username = fn.toLowerCase()
    const password = ln.toLowerCase()
    const name = `${fn} ${ln}`
    // Check if already exists
    const existing = users.find(u => u.username.toLowerCase() === username && u.password === password)
    if (existing) {
      // Just log them in
      const session = { username: existing.username, role: existing.role, name: existing.name }
      setUser(session)
      save('welllogic_session', session)
      return { success: true, user: session }
    }
    // Create new viewer account
    const newUser = { username, password, role: 'viewer', name, createdAt: new Date().toISOString() }
    setUsers(prev => [...prev, newUser])
    const session = { username, role: 'viewer', name }
    setUser(session)
    save('welllogic_session', session)
    const entry = { user: name, action: 'Created account & logged in', timestamp: new Date().toISOString() }
    setActivity(prev => [entry, ...prev].slice(0, 500))
    return { success: true, user: session }
  }

  const logout = () => {
    if (user) {
      const entry = { user: user.name, action: 'Logged out', timestamp: new Date().toISOString() }
      setActivity(prev => [entry, ...prev].slice(0, 500))
    }
    setUser(null)
    localStorage.removeItem('welllogic_session')
  }

  const isAdmin = user?.role === 'admin'
  const isTech = user?.role === 'tech' || isAdmin
  const isLoggedIn = !!user
  const canViewQuotes = isAdmin || (settings.quoteViewers || []).includes(user?.username)

  const addUser = (newUser) => {
    if (users.find(u => u.username === newUser.username)) return false
    setUsers(prev => [...prev, { ...newUser, createdAt: new Date().toISOString() }])
    return true
  }

  const removeUser = (username) => {
    if (username === 'cody') return false
    setUsers(prev => prev.filter(u => u.username !== username))
    return true
  }

  const updateUserRole = (username, role) => {
    if (username === 'cody') return
    setUsers(prev => prev.map(u => u.username === username ? { ...u, role } : u))
  }

  const updateSettings = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  // Quote / CRM functions
  const addQuote = (quote) => {
    const newQuote = {
      ...quote,
      id: Date.now(),
      createdBy: user?.name || 'Unknown',
      createdAt: new Date().toISOString(),
      status: 'New',
      history: [{ action: 'Quote created', by: user?.name, at: new Date().toISOString() }],
    }
    setQuotes(prev => [newQuote, ...prev])
    trackActivity(`Created quote for ${quote.customerName}`)
    return newQuote
  }

  const updateQuote = (id, updates) => {
    setQuotes(prev => prev.map(q => {
      if (q.id !== id) return q
      const historyEntry = { action: `Updated: ${Object.keys(updates).join(', ')}`, by: user?.name, at: new Date().toISOString() }
      return { ...q, ...updates, history: [...(q.history || []), historyEntry] }
    }))
    trackActivity(`Updated quote #${id}`)
  }

  const deleteQuote = (id) => {
    setQuotes(prev => prev.filter(q => q.id !== id))
    trackActivity(`Deleted quote #${id}`)
  }

  return (
    <AuthContext.Provider value={{
      user, users, settings, activity, quotes, isAdmin, isTech, isLoggedIn, canViewQuotes,
      login, signup, logout, addUser, removeUser, updateUserRole, updateSettings, trackActivity,
      addQuote, updateQuote, deleteQuote,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
