// Auth middleware + helper to get current user from token
import { pool } from './db.js'

export async function getUserFromToken(token) {
  if (!token) return null
  const { rows } = await pool.query(
    `SELECT u.username, u.role, u.name
     FROM sessions s JOIN users u ON s.username = u.username
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  )
  return rows[0] || null
}

export function extractToken(req) {
  const auth = req.headers.authorization || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return req.headers['x-session-token'] || null
}

// Express middleware — attaches req.user if token valid
export async function requireAuth(req, res, next) {
  const token = extractToken(req)
  const user = await getUserFromToken(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  req.user = user
  next()
}

export async function requireAdmin(req, res, next) {
  const token = extractToken(req)
  const user = await getUserFromToken(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
  req.user = user
  next()
}
