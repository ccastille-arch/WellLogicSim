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

// ─── Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
}))
app.use(express.json())

// ─── API Routes ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }))
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api', dataRoutes)

// ─── Serve Vite build ─────────────────────────────────────────────
// In production, Express serves the built frontend
const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// SPA fallback — all non-API routes return index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' })
  res.sendFile(join(distPath, 'index.html'))
})

// ─── Start ────────────────────────────────────────────────────────
async function start() {
  try {
    await initSchema()
    console.log('Database schema ready')
    await seedDefaults()
    app.listen(PORT, () => console.log(`WellLogic server running on port ${PORT}`))
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
