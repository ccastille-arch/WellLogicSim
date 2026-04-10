import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// Default users — stored in localStorage, admin can add more
const DEFAULT_USERS = [
  { username: 'cody', password: 'Brayden25!', role: 'admin', name: 'Cody Castille' },
  { username: 'techteam', password: '123', role: 'tech', name: 'Tech Team' },
]

function getUsers() {
  try {
    const stored = localStorage.getItem('welllogic_users')
    if (stored) return JSON.parse(stored)
  } catch {}
  localStorage.setItem('welllogic_users', JSON.stringify(DEFAULT_USERS))
  return DEFAULT_USERS
}

function getSession() {
  try {
    const stored = localStorage.getItem('welllogic_session')
    if (stored) return JSON.parse(stored)
  } catch {}
  return null
}

function getSettings() {
  try {
    const stored = localStorage.getItem('welllogic_settings')
    if (stored) return JSON.parse(stored)
  } catch {}
  return { forumPublic: true }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSession)
  const [users, setUsers] = useState(getUsers)
  const [settings, setSettings] = useState(getSettings)

  useEffect(() => { localStorage.setItem('welllogic_users', JSON.stringify(users)) }, [users])
  useEffect(() => { localStorage.setItem('welllogic_settings', JSON.stringify(settings)) }, [settings])

  const login = (username, password) => {
    const found = users.find(u => u.username === username && u.password === password)
    if (found) {
      const session = { username: found.username, role: found.role, name: found.name }
      setUser(session)
      localStorage.setItem('welllogic_session', JSON.stringify(session))
      return { success: true, user: session }
    }
    return { success: false, error: 'Invalid username or password' }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('welllogic_session')
  }

  const isAdmin = user?.role === 'admin'
  const isTech = user?.role === 'tech' || isAdmin
  const isLoggedIn = !!user

  const addUser = (newUser) => {
    if (!isAdmin) return false
    if (users.find(u => u.username === newUser.username)) return false
    setUsers(prev => [...prev, newUser])
    return true
  }

  const removeUser = (username) => {
    if (!isAdmin || username === 'cody') return false
    setUsers(prev => prev.filter(u => u.username !== username))
    return true
  }

  const updateSettings = (key, value) => {
    if (!isAdmin) return
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <AuthContext.Provider value={{
      user, users, settings, isAdmin, isTech, isLoggedIn,
      login, logout, addUser, removeUser, updateSettings,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
