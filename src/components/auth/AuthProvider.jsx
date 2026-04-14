import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [users, setUsers]       = useState([])
  const [roles, setRoles]       = useState([])
  const [allPermissions, setAllPermissions] = useState([])
  const [settings, setSettings] = useState({ forumPublic: true, quoteViewers: [] })
  const [activity, setActivity] = useState([])
  const [quotes, setQuotes]     = useState([])
  const [loading, setLoading]   = useState(true)

  // ─── Permission helpers ──────────────────────────────────────────
  const permissions = useMemo(() => user?.permissions || [], [user])

  const hasPermission = useCallback((perm) => {
    if (!user) return false
    if (permissions.includes('*')) return true // admin wildcard
    return permissions.includes(perm)
  }, [user, permissions])

  const canAccess = useCallback((tileId) => {
    if (!user) return false
    if (permissions.includes('*')) return true
    return permissions.includes(`tile:${tileId}`)
  }, [user, permissions])

  // Backward compat aliases
  const isAdmin = hasPermission('tile:admin')
  const isTech = canAccess('simulator')
  const canViewQuotes = canAccess('pipeline')

  // ─── Restore session on mount ───────────────────────────────────
  useEffect(() => {
    const token = api.token.get()
    if (!token) { setLoading(false); return }

    api.auth.me()
      .then(({ user: u }) => {
        setUser(u)
        return api.settings.get().then(setSettings).catch(() => {})
      })
      .catch(() => { api.token.set(null) })
      .finally(() => setLoading(false))
  }, [])

  // ─── Load admin/role data when user has permissions ─────────────
  useEffect(() => {
    if (!user) return
    // Load roles for everyone (needed for UI)
    api.roles.list().then(({ roles: r, allPermissions: ap }) => {
      setRoles(r)
      setAllPermissions(ap)
    }).catch(() => {})

    if (hasPermission('manage:users') || hasPermission('view:analytics')) {
      api.users.list().then(setUsers).catch(() => {})
      api.activity.list().then(setActivity).catch(() => {})
    }
    if (hasPermission('tile:pipeline') || hasPermission('manage:quotes')) {
      api.quotes.list().then(setQuotes).catch(() => {})
    }
  }, [user?.username, user?.permissions?.length])

  // ─── Auth actions ────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    try {
      const { token, user: u } = await api.auth.login(username, password)
      api.token.set(token)
      setUser(u)
      api.settings.get().then(setSettings).catch(() => {})
      return { success: true, user: u }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const signup = useCallback(async (firstName, lastName) => {
    try {
      const { token, user: u } = await api.auth.signup(firstName, lastName)
      api.token.set(token)
      setUser(u)
      api.settings.get().then(setSettings).catch(() => {})
      return { success: true, user: u }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => {})
    api.token.set(null)
    setUser(null)
    setUsers([])
    setRoles([])
    setActivity([])
    setQuotes([])
  }, [])

  // ─── Track activity (with tile_id) ──────────────────────────────
  const trackActivity = useCallback((action, tileId) => {
    if (!user) return
    api.activity.log(action, tileId || null).catch(() => {})
    if (hasPermission('view:analytics')) {
      const entry = { user: user.name, action, tile_id: tileId, timestamp: new Date().toISOString() }
      setActivity(prev => [entry, ...prev].slice(0, 500))
    }
  }, [user, hasPermission])

  // ─── User management ─────────────────────────────────────────────
  const addUser = useCallback(async (newUser) => {
    try {
      await api.users.create(newUser)
      const updated = await api.users.list()
      setUsers(updated)
      return true
    } catch (err) { throw err }
  }, [])

  const removeUser = useCallback(async (username) => {
    if (username === 'cody') return false
    await api.users.remove(username)
    setUsers(prev => prev.filter(u => u.username !== username))
    return true
  }, [])

  const updateUserRole = useCallback(async (username, role_id) => {
    if (username === 'cody') return
    await api.users.updateRole(username, role_id)
    setUsers(prev => prev.map(u => u.username === username ? { ...u, role_id, role: role_id } : u))
  }, [])

  const updateUserName = useCallback(async (username, name) => {
    await api.users.updateName(username, name)
    setUsers(prev => prev.map(u => u.username === username ? { ...u, name } : u))
  }, [])

  const resetUserPassword = useCallback(async (username, password) => {
    await api.users.resetPassword(username, password)
  }, [])

  // ─── Role management ─────────────────────────────────────────────
  const createRole = useCallback(async (role) => {
    await api.roles.create(role)
    const { roles: r } = await api.roles.list()
    setRoles(r)
  }, [])

  const updateRole = useCallback(async (id, data) => {
    await api.roles.update(id, data)
    const { roles: r } = await api.roles.list()
    setRoles(r)
  }, [])

  const deleteRole = useCallback(async (id) => {
    await api.roles.remove(id)
    const { roles: r } = await api.roles.list()
    setRoles(r)
    // Reload users since affected users got reassigned
    api.users.list().then(setUsers).catch(() => {})
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

  return (
    <AuthContext.Provider value={{
      user, users, roles, allPermissions, settings, activity, quotes,
      permissions, hasPermission, canAccess,
      isAdmin, isTech, isLoggedIn: !!user, canViewQuotes,
      loading,
      login, signup, logout,
      addUser, removeUser, updateUserRole, updateUserName, resetUserPassword,
      createRole, updateRole, deleteRole,
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
