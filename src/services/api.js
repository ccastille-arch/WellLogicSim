// API client — talks to the Express backend on Railway
// Falls back to relative URLs so it works both locally and in production

const BASE = import.meta.env.VITE_API_URL || ''

function getToken() {
  return localStorage.getItem('welllogic_token') || ''
}

function setToken(token) {
  if (token) localStorage.setItem('welllogic_token', token)
  else localStorage.removeItem('welllogic_token')
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

const get  = (path)        => req('GET',    path)
const post = (path, body)  => req('POST',   path, body)
const patch = (path, body) => req('PATCH',  path, body)
const del  = (path)        => req('DELETE', path)

// ─── Auth ──────────────────────────────────────────────────
export const api = {
  auth: {
    login:  (username, password) => post('/auth/login', { username, password }),
    signup: (firstName, lastName) => post('/auth/signup', { firstName, lastName }),
    logout: () => post('/auth/logout'),
    me:     () => get('/auth/me'),
  },
  users: {
    list:       ()                        => get('/users'),
    create:     (user)                    => post('/users', user),
    updateRole: (username, role)          => patch(`/users/${username}/role`, { role }),
    remove:     (username)                => del(`/users/${username}`),
  },
  settings: {
    get:    ()       => get('/settings'),
    update: (updates) => patch('/settings', updates),
  },
  quotes: {
    list:   ()          => get('/quotes'),
    create: (quote)     => post('/quotes', quote),
    update: (id, data)  => patch(`/quotes/${id}`, data),
    remove: (id)        => del(`/quotes/${id}`),
  },
  activity: {
    list: ()       => get('/activity'),
    log:  (action) => post('/activity', { action }),
  },
  votes: {
    getLogo: ()         => get('/votes/logo'),
    castLogo: (logoId)  => post('/votes/logo', { logoId }),
  },
  token: { get: getToken, set: setToken },
}
