import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initSchema } from './db.js'
import { seedDefaults } from './seed.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import dataRoutes from './routes/data.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const app = express()

// ─── DB readiness state ────────────────────────────────────────────
let dbReady = false

// ─── Middleware ────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// ─── Health check — responds immediately, reports DB status ────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, db: dbReady, ts: new Date().toISOString() })
})

// ─── API Routes ───────────────────────────────────────────────────
// Return 503 on all data endpoints until DB is ready
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next()
  if (!dbReady) return res.status(503).json({ error: 'Database initializing — please retry in a moment' })
  next()
})

app.use('/api/auth',  authRoutes)
app.use('/api/users', userRoutes)
app.use('/api',       dataRoutes)

// ─── Serve Vite build ─────────────────────────────────────────────
const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get(/(.*)/, (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' })
  res.sendFile(join(distPath, 'index.html'))
})

// ─── Start HTTP server first, then connect to DB ──────────────────
app.listen(PORT, () => {
  console.log(`WellLogic server listening on port ${PORT}`)
  connectWithRetry()
})

async function connectWithRetry(attempt = 1) {
  const MAX = 10
  try {
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set — add a PostgreSQL service in Railway and link it to this service')
      // Retry in 15 s in case it gets set via env var propagation
      if (attempt <= MAX) setTimeout(() => connectWithRetry(attempt + 1), 15_000)
      return
    }
    await initSchema()
    await seedDefaults()
    dbReady = true
    console.log('Database ready')
  } catch (err) {
    console.error(`DB init attempt ${attempt} failed: ${err.message}`)
    if (attempt <= MAX) {
      const delay = Math.min(attempt * 3_000, 30_000)
      console.log(`Retrying in ${delay / 1000}s...`)
      setTimeout(() => connectWithRetry(attempt + 1), delay)
    } else {
      console.error('Giving up on DB init after 10 attempts — API endpoints will return 503')
    }
  }
}
