// Auth middleware + helper to get current user from token
import { pool } from './db.js'

export async function getUserFromToken(token) {
  if (!token) return null
  try {
    // Try JOIN with roles table first (new schema)
    const { rows } = await pool.query(
      `SELECT
         u.username,
         COALESCE(u.role, u.role_id, 'viewer') AS role,
         COALESCE(u.role_id, u.role, 'viewer') AS role_id,
         u.name,
         r.permissions
       FROM sessions s
       JOIN users u ON s.username = u.username
       LEFT JOIN roles r ON COALESCE(u.role_id, u.role, 'viewer') = r.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    )
    if (!rows[0]) return null
    const user = rows[0]
    // Parse permissions — admin always has all, fallback to empty
    user.permissions = user.permissions || []
    if (user.role_id === 'admin' || user.role === 'admin') {
      user.permissions = ['*'] // wildcard = all permissions
    }
    return user
  } catch {
    // Fallback if roles table doesn't exist yet
    const { rows } = await pool.query(
      `SELECT
         u.username,
         COALESCE(u.role, u.role_id, 'viewer') AS role,
         COALESCE(u.role_id, u.role, 'viewer') AS role_id,
         u.name
       FROM sessions s JOIN users u ON s.username = u.username
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    )
    if (!rows[0]) return null
    rows[0].permissions = rows[0].role === 'admin' ? ['*'] : []
    return rows[0]
  }
}

export function extractToken(req) {
  const auth = req.headers.authorization || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return req.headers['x-session-token'] || null
}

// Check if a user has a specific permission
export function userHasPermission(user, permission) {
  if (!user || !user.permissions) return false
  if (user.permissions.includes('*')) return true // admin wildcard
  return user.permissions.includes(permission)
}

// Express middleware — attaches req.user if token valid
export async function requireAuth(req, res, next) {
  const token = extractToken(req)
  const user = await getUserFromToken(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  req.user = user
  next()
}

// Backward-compat admin middleware
export async function requireAdmin(req, res, next) {
  const token = extractToken(req)
  const user = await getUserFromToken(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  if (user.role_id !== 'admin' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' })
  }
  req.user = user
  next()
}

// Permission-based middleware factory
export function requirePermission(permission) {
  return async (req, res, next) => {
    const token = extractToken(req)
    const user = await getUserFromToken(token)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if (!userHasPermission(user, permission)) {
      return res.status(403).json({ error: `Permission required: ${permission}` })
    }
    req.user = user
    next()
  }
}
