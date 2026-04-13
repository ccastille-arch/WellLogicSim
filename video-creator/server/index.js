import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { pool } from './db.js'
import { getUserFromToken, extractToken } from './auth.js'
import ttsRouter from './routes/tts.js'
import aiRouter from './routes/ai.js'
import renderRouter from './routes/render.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// ─── Health ────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'video-creator', ts: new Date().toISOString() })
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
    res.status(500).json({ error: 'Internal server error' })
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

app.listen(PORT, () => {
  console.log(`[video-creator] Server running on port ${PORT}`)
})
