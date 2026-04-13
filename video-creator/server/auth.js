import { pool } from './db.js'

export async function getUserFromToken(token) {
  if (!token) return null
  try {
    const { rows } = await pool.query(
      `SELECT u.username, u.role, u.name
       FROM sessions s JOIN users u ON s.username = u.username
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    )
    return rows[0] || null
  } catch {
    return null
  }
}

export function extractToken(req) {
  const auth = req.headers.authorization || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return req.headers['x-session-token'] || null
}

// Require tech or admin role
export async function requireTechOrAdmin(req, res, next) {
  const token = extractToken(req)
  const user = await getUserFromToken(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  if (user.role !== 'admin' && user.role !== 'tech') {
    return res.status(403).json({ error: 'Requires tech or admin role' })
  }
  req.user = user
  next()
}
