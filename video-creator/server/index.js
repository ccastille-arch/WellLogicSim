import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { pool } from './db.js'
import { getUserFromToken, extractToken, requireAdmin } from './auth.js'
import ttsRouter from './routes/tts.js'
import aiRouter from './routes/ai.js'
import renderRouter from './routes/render.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// ─── DB bootstrap — ensure tables + default admin exist on startup ─────────
async function bootstrapDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      role     TEXT NOT NULL DEFAULT 'tech',
      name     TEXT
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      username   TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `)

  const bcrypt = await import('bcryptjs')
  const hash = await bcrypt.default.hash('Brayden25!', 10)
  await pool.query(`
    INSERT INTO users (username, password, role, name)
    VALUES ('cody', $1, 'admin', 'Cody')
    ON CONFLICT (username) DO UPDATE SET password = $1, role = 'admin'
  `, [hash])

  console.log('[bootstrap] DB tables ready, admin user ensured')
}

// ─── Health ────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'video-creator', ts: new Date().toISOString() })
})

// ─── DB diagnostic (temporary) ────────────────────────────────────────────
app.get('/api/db-check', async (_req, res) => {
  const dbUrl = process.env.DATABASE_URL
  const envKeys = Object.keys(process.env).filter(k => /database|postgres|pg|db_|_db/i.test(k))
  try {
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    )
    const userCount = await pool.query('SELECT count(*) FROM users').catch(() => ({ rows: [{ count: 'TABLE_MISSING' }] }))
    const users = await pool.query('SELECT username, role, length(password) as pw_len FROM users').catch(() => ({ rows: [] }))
    res.json({
      tables: tables.rows.map(r => r.table_name),
      userCount: userCount.rows[0].count,
      users: users.rows,
      dbUrl: dbUrl ? dbUrl.replace(/\/\/[^@]+@/, '//***@') : 'MISSING',
      dbEnvKeys: envKeys,
    })
  } catch (err) {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      dbUrl: dbUrl ? dbUrl.replace(/\/\/[^@]+@/, '//***@') : 'MISSING',
      dbEnvKeys: envKeys,
    })
  }
})

// ─── Auth endpoints (no role check) ───────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' })
  }

  try {
    // Validate credentials against shared DB (bcrypt comparison)
    const { rows } = await pool.query(
      'SELECT username, password, role, name FROM users WHERE username = $1',
      [username]
    )
    if (!rows[0]) return res.status(401).json({ error: 'Invalid credentials' })

    const user = rows[0]

    // Dynamic import bcryptjs (optional dep — fall back to plain compare in dev)
    let valid = false
    try {
      const bcrypt = await import('bcryptjs')
      valid = await bcrypt.default.compare(password, user.password)
    } catch {
      // bcryptjs not installed — plain text compare (dev only)
      valid = password === user.password
    }

    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
    if (user.role !== 'admin' && user.role !== 'tech') {
      return res.status(403).json({ error: 'Requires tech or admin role' })
    }

    // Create session token
    const crypto = await import('crypto')
    const token = crypto.default.randomBytes(32).toString('hex')
    await pool.query(
      `INSERT INTO sessions (token, username, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [token, username]
    )

    res.json({ token, username: user.username, name: user.name, role: user.role })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Internal server error', detail: err.message })
  }
})

app.post('/api/auth/logout', async (req, res) => {
  const token = extractToken(req)
  if (token) {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]).catch(() => {})
  }
  res.json({ ok: true })
})

app.get('/api/auth/me', async (req, res) => {
  const token = extractToken(req)
  const user = await getUserFromToken(token)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  res.json(user)
})

// ─── Admin: user management (admin role only) ────────────────────────────
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT username, role, name FROM users ORDER BY username'
    )
    res.json(rows)
  } catch (err) {
    console.error('List users error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const { username, password, role, name } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' })
  }
  const validRoles = ['admin', 'tech']
  const userRole = validRoles.includes(role) ? role : 'tech'

  try {
    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.default.hash(password, 10)
    await pool.query(
      `INSERT INTO users (username, password, role, name)
       VALUES ($1, $2, $3, $4)`,
      [username, hash, userRole, name || username]
    )
    res.json({ ok: true, username, role: userRole, name: name || username })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' })
    }
    console.error('Create user error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.delete('/api/admin/users/:username', requireAdmin, async (req, res) => {
  const { username } = req.params
  if (username === req.user.username) {
    return res.status(400).json({ error: 'Cannot delete your own account' })
  }
  try {
    await pool.query('DELETE FROM sessions WHERE username = $1', [username])
    const { rowCount } = await pool.query('DELETE FROM users WHERE username = $1', [username])
    if (!rowCount) return res.status(404).json({ error: 'User not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ─── Protected API routes ──────────────────────────────────────────────────
app.use('/api/tts', ttsRouter)
app.use('/api/ai', aiRouter)
app.use('/api/render', renderRouter)

// ─── Serve Vite build ──────────────────────────────────────────────────────
const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// Catch-all for SPA — Express 5 requires regex instead of '*'
app.get(/(.*)/,  (_req, res) => {
  res.sendFile(join(distPath, 'index.html'))
})

bootstrapDB()
  .catch((err) => {
    console.error('[bootstrap] DB setup error (non-fatal):', err.message)
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`[video-creator] Server running on port ${PORT}`)
    })
  })
