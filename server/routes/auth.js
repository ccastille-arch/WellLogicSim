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

// POST /api/auth/signup  (first name + last name)
//
// The signup UX uses first name as the username field and last name as
// the "password" field, but per the product decision this is for
// AUDITING, not protection — two people named "Cody" working in two
// different basins must each be able to have their own account.
//
// The unique identity is therefore the {firstName, lastName} pair. We
// key users by a composite username (`firstname.lastname`, lowercased
// and whitespace-collapsed) so Cody Smith and Cody Jones coexist. The
// bare-firstName collision path the prior implementation used is gone.
//
// Legacy accounts (pre-composite) are still supported: if we don't find
// the composite username but we DO find a bare firstName account whose
// stored last name matches the submitted last name, we log them into
// that legacy account. Same person, continuous history.
router.post('/signup', async (req, res) => {
  const { firstName, lastName } = req.body
  const fn = (firstName || '').trim()
  const ln = (lastName || '').trim()
  if (!fn || !ln) return res.status(400).json({ error: 'First and last name required' })

  const composite = `${fn.toLowerCase()}.${ln.toLowerCase()}`.replace(/\s+/g, '-')
  const legacyUsername = normalizeUsername(fn)
  const name = `${fn} ${ln}`

  // ── Path 1: exact composite match → log into that account ──
  const { rows: compRows } = await pool.query(
    `SELECT
       username,
       password,
       password_hash,
       COALESCE(role, role_id, 'viewer') AS role,
       COALESCE(role_id, role, 'viewer') AS role_id,
       name
     FROM users
     WHERE LOWER(username) = LOWER($1)`,
    [composite]
  )
  if (compRows[0]) {
    const existing = compRows[0]
    const token = makeToken()
    await createSession(token, existing.username)
    await pool.query(
      "INSERT INTO activity (username, user_name, action) VALUES ($1, $2, 'Logged in')",
      [existing.username, existing.name]
    ).catch(() => {})
    const fullUser = await getUserFromToken(token)
    return res.json({ token, user: userResponse(fullUser || existing) })
  }

  // ── Path 2: legacy first-name-only account with matching last name ──
  // Accepts either stored first_name/last_name columns OR the old
  // bcrypt(lastName) password as evidence of the same person.
  const { rows: legacyRows } = await pool.query(
    `SELECT
       username,
       password,
       password_hash,
       first_name,
       last_name,
       COALESCE(role, role_id, 'viewer') AS role,
       COALESCE(role_id, role, 'viewer') AS role_id,
       name
     FROM users
     WHERE LOWER(username) = LOWER($1)`,
    [legacyUsername]
  )
  if (legacyRows[0]) {
    const legacy = legacyRows[0]
    const legacyLast = (legacy.last_name || '').toLowerCase()
    const legacyHash = legacy.password || legacy.password_hash
    const bcryptMatch = legacyHash ? await bcrypt.compare(ln.toLowerCase(), legacyHash) : false
    if (legacyLast === ln.toLowerCase() || bcryptMatch) {
      const token = makeToken()
      await createSession(token, legacy.username)
      await pool.query(
        "INSERT INTO activity (username, user_name, action) VALUES ($1, $2, 'Logged in')",
        [legacy.username, legacy.name]
      ).catch(() => {})
      const fullUser = await getUserFromToken(token)
      return res.json({ token, user: userResponse(fullUser || legacy) })
    }
    // Legacy user exists but last name doesn't match. That's a
    // DIFFERENT person who shares the first name — fall through and
    // create a new composite-username account for them below. We do
    // NOT reject here; allowing duplicates is the whole point.
  }

  // ── Path 3: create a fresh account on the composite username ──
  const hash = await bcrypt.hash(ln.toLowerCase(), 10)
  const identity = buildIdentityFields(composite, name, 'viewer', fn, ln)
  await pool.query(
    `INSERT INTO users (
       username, password, password_hash, role, role_id, name, email,
       sso_sub, sso_role, platform_role, is_active, first_name, last_name, updated_at
     ) VALUES ($1, $2, $2, $3, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, NOW())`,
    [
      composite,
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
  await createSession(token, composite)
  await pool.query(
    "INSERT INTO activity (username, user_name, action) VALUES ($1, $2, 'Created account & logged in')",
    [composite, name]
  )

  const fullUser = await getUserFromToken(token)
  res.status(201).json({ token, user: userResponse(fullUser || { username: composite, role: 'viewer', role_id: 'viewer', name, permissions: [] }) })
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
