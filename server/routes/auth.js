import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { pool } from '../db.js'
import { getUserFromToken, extractToken } from '../auth.js'

const router = Router()

function makeToken() {
  return randomBytes(32).toString('hex')
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

  const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username])
  const user = rows[0]
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })

  const match = await bcrypt.compare(password, user.password)
  if (!match) return res.status(401).json({ error: 'Invalid credentials' })

  const token = makeToken()
  await pool.query(
    'INSERT INTO sessions (token, username) VALUES ($1, $2)',
    [token, user.username]
  )
  await pool.query(
    "INSERT INTO activity (username, user_name, action) VALUES ($1, $2, 'Logged in')",
    [user.username, user.name]
  )

  res.json({ token, user: { username: user.username, role: user.role, name: user.name } })
})

// POST /api/auth/signup  (first name + last name as password)
router.post('/signup', async (req, res) => {
  const { firstName, lastName } = req.body
  const fn = (firstName || '').trim()
  const ln = (lastName || '').trim()
  if (!fn || !ln) return res.status(400).json({ error: 'First and last name required' })

  const username = fn.toLowerCase()
  const name = `${fn} ${ln}`

  // Check if user already exists — try to log them in with the same credentials
  const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(username) = $1', [username])
  const existing = rows[0]

  if (existing) {
    const match = await bcrypt.compare(ln.toLowerCase(), existing.password)
    if (!match) return res.status(409).json({ error: 'Username taken. Try logging in instead.' })
    // Re-login existing user
    const token = makeToken()
    await pool.query('INSERT INTO sessions (token, username) VALUES ($1, $2)', [token, existing.username])
    return res.json({ token, user: { username: existing.username, role: existing.role, name: existing.name } })
  }

  // Create new viewer account
  const hash = await bcrypt.hash(ln.toLowerCase(), 10)
  await pool.query(
    'INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4)',
    [username, hash, 'viewer', name]
  )
  const token = makeToken()
  await pool.query('INSERT INTO sessions (token, username) VALUES ($1, $2)', [token, username])
  await pool.query(
    "INSERT INTO activity (username, user_name, action) VALUES ($1, $2, 'Created account & logged in')",
    [username, name]
  )

  res.status(201).json({ token, user: { username, role: 'viewer', name } })
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
  res.json({ user })
})

export default router
