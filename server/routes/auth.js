import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { pool } from '../db.js'
import { getUserFromToken, extractToken } from '../auth.js'

const router = Router()

function makeToken() {
  return randomBytes(32).toString('hex')
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase()
}

function platformRoleFor(roleId) {
  if (roleId === 'admin') return 'admin'
  if (roleId === 'tech') return 'tech'
  return 'viewer'
}

function buildIdentityFields(username, name, roleId, firstName = null, lastName = null) {
  const normalizedUsername = normalizeUsername(username)
  return {
    email: `${normalizedUsername || 'user'}@localhost`,
    ssoSub: `local:${normalizedUsername || randomBytes(6).toString('hex')}`,
    ssoRole: roleId === 'admin' ? 'admin' : 'user',
    platformRole: platformRoleFor(roleId),
    firstName,
    lastName,
    name,
  }
}

async function createSession(token, username) {
  await pool.query(
    `INSERT INTO sessions (token, username, session_id, data, expires_at, updated_at)
     VALUES ($1, $2, $1, '{}'::jsonb, NOW() + INTERVAL '30 days', NOW())`,
    [token, username]
  )
}

// Helper: build user response with permissions
function userResponse(user) {
  return {
    username: user.username,
    role: user.role,
    role_id: user.role_id || user.role,
    name: user.name,
    permissions: user.permissions || [],
  }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

  const { rows } = await pool.query(
    `SELECT
       username,
       password,
       password_hash,
       COALESCE(role, role_id, 'viewer') AS role,
       COALESCE(role_id, role, 'viewer') AS role_id,
       name
     FROM users
     WHERE LOWER(username) = LOWER($1) AND COALESCE(is_active, TRUE) = TRUE`,
    [username]
  )
  const user = rows[0]
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const passwordHash = user.password || user.password_hash
  if (!passwordHash) return res.status(401).json({ error: 'Invalid credentials' })

  const match = await bcrypt.compare(password, passwordHash)
  if (!match) return res.status(401).json({ error: 'Invalid credentials' })

  const token = makeToken()
  await createSession(token, user.username)
  await pool.query(
    'UPDATE users SET last_login_at = NOW(), login_attempts = 0, updated_at = NOW() WHERE username = $1',
    [user.username]
  ).catch(() => {})
  await pool.query(
    "INSERT INTO activity (username, user_name, action) VALUES ($1, $2, 'Logged in')",
    [user.username, user.name]
  )

  const fullUser = await getUserFromToken(token)
  res.json({ token, user: userResponse(fullUser || user) })
})

// POST /api/auth/signup  (first name + last name as password)
router.post('/signup', async (req, res) => {
  const { firstName, lastName } = req.body
  const fn = (firstName || '').trim()
  const ln = (lastName || '').trim()
  if (!fn || !ln) return res.status(400).json({ error: 'First and last name required' })

  const username = normalizeUsername(fn)
  const name = `${fn} ${ln}`

  const { rows } = await pool.query(
    `SELECT
       username,
       password,
       password_hash,
       COALESCE(role, role_id, 'viewer') AS role,
       COALESCE(role_id, role, 'viewer') AS role_id,
       name
     FROM users
     WHERE LOWER(username) = LOWER($1)`,
    [username]
  )
  const existing = rows[0]

  if (existing) {
    const existingHash = existing.password || existing.password_hash
    const match = existingHash ? await bcrypt.compare(ln.toLowerCase(), existingHash) : false
    if (!match) return res.status(409).json({ error: 'Username taken. Try logging in instead.' })
    const token = makeToken()
    await createSession(token, existing.username)
    const fullUser = await getUserFromToken(token)
    return res.json({ token, user: userResponse(fullUser || existing) })
  }

  const hash = await bcrypt.hash(ln.toLowerCase(), 10)
  const identity = buildIdentityFields(username, name, 'viewer', fn, ln)
  await pool.query(
    `INSERT INTO users (
       username, password, password_hash, role, role_id, name, email,
       sso_sub, sso_role, platform_role, is_active, first_name, last_name, updated_at
     ) VALUES ($1, $2, $2, $3, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, NOW())`,
    [
      username,
      hash,
      'viewer',
      identity.name,
      identity.email,
      identity.ssoSub,
      identity.ssoRole,
      identity.platformRole,
      identity.firstName,
      identity.lastName,
    ]
  )
  const token = makeToken()
  await createSession(token, username)
  await pool.query(
    "INSERT INTO activity (username, user_name, action) VALUES ($1, $2, 'Created account & logged in')",
    [username, name]
  )

  const fullUser = await getUserFromToken(token)
  res.status(201).json({ token, user: userResponse(fullUser || { username, role: 'viewer', role_id: 'viewer', name, permissions: [] }) })
})

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = extractToken(req)
  if (token) {
    const user = await getUserFromToken(token)
    if (user) {
      await pool.query(
        "INSERT INTO activity (username, user_name, action) VALUES ($1, $2, 'Logged out')",
        [user.username, user.name]
      )
    }
    await pool.query('DELETE FROM sessions WHERE token = $1', [token])
  }
  res.json({ ok: true })
})

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const token = extractToken(req)
  const user = await getUserFromToken(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  res.json({ user: userResponse(user) })
})

export default router
