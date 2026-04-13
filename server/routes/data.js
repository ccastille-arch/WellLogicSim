// Quotes, settings, activity — all in one file since they're small
import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireAdmin, getUserFromToken, extractToken } from '../auth.js'

const router = Router()

// ─── Settings ───────────────────────────────────────────────

// GET /api/settings
router.get('/settings', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT key, value FROM settings')
  const settings = {}
  for (const row of rows) {
    try { settings[row.key] = JSON.parse(row.value) }
    catch { settings[row.key] = row.value }
  }
  res.json(settings)
})

// PATCH /api/settings — admin only
router.patch('/settings', requireAdmin, async (req, res) => {
  const updates = req.body
  for (const [key, value] of Object.entries(updates)) {
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, JSON.stringify(value)]
    )
  }
  res.json({ ok: true })
})

// ─── Quotes / CRM ───────────────────────────────────────────

async function canViewQuotes(user) {
  if (user.role === 'admin') return true
  const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'quoteViewers'")
  if (!rows.length) return false
  const viewers = JSON.parse(rows[0].value || '[]')
  return viewers.includes(user.username)
}

// GET /api/quotes
router.get('/quotes', requireAuth, async (req, res) => {
  const allowed = await canViewQuotes(req.user)
  if (!allowed) return res.status(403).json({ error: 'Access denied' })
  const { rows } = await pool.query('SELECT * FROM quotes ORDER BY created_at DESC')
  res.json(rows.map(r => ({ ...r.data, id: r.id, createdAt: r.created_at, updatedAt: r.updated_at })))
})

// POST /api/quotes
router.post('/quotes', requireAuth, async (req, res) => {
  const quote = req.body
  const { rows } = await pool.query(
    'INSERT INTO quotes (data, created_by) VALUES ($1, $2) RETURNING id, created_at',
    [JSON.stringify({ ...quote, history: [{ action: 'Quote created', by: req.user.name, at: new Date().toISOString() }] }), req.user.name]
  )
  await pool.query(
    'INSERT INTO activity (username, user_name, action) VALUES ($1, $2, $3)',
    [req.user.username, req.user.name, `Created quote for ${quote.customerName}`]
  )
  res.status(201).json({ ...quote, id: rows[0].id, createdAt: rows[0].created_at })
})

// PATCH /api/quotes/:id
router.patch('/quotes/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const updates = req.body
  const { rows } = await pool.query('SELECT data FROM quotes WHERE id = $1', [id])
  if (!rows.length) return res.status(404).json({ error: 'Not found' })
  const existing = rows[0].data
  const historyEntry = { action: `Updated: ${Object.keys(updates).join(', ')}`, by: req.user.name, at: new Date().toISOString() }
  const newData = { ...existing, ...updates, history: [...(existing.history || []), historyEntry] }
  await pool.query(
    'UPDATE quotes SET data = $1, updated_at = NOW() WHERE id = $2',
    [JSON.stringify(newData), id]
  )
  await pool.query(
    'INSERT INTO activity (username, user_name, action) VALUES ($1, $2, $3)',
    [req.user.username, req.user.name, `Updated quote #${id}`]
  )
  res.json({ ok: true })
})

// DELETE /api/quotes/:id
router.delete('/quotes/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  await pool.query('DELETE FROM quotes WHERE id = $1', [id])
  await pool.query(
    'INSERT INTO activity (username, user_name, action) VALUES ($1, $2, $3)',
    [req.user.username, req.user.name, `Deleted quote #${id}`]
  )
  res.json({ ok: true })
})

// ─── Activity log ────────────────────────────────────────────

// GET /api/activity — admin only
router.get('/activity', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT user_name AS "user", action, created_at AS timestamp FROM activity ORDER BY created_at DESC LIMIT 500'
  )
  res.json(rows)
})

// POST /api/activity — any authenticated user can log
router.post('/activity', requireAuth, async (req, res) => {
  const { action } = req.body
  if (!action) return res.status(400).json({ error: 'action required' })
  await pool.query(
    'INSERT INTO activity (username, user_name, action) VALUES ($1, $2, $3)',
    [req.user.username, req.user.name, action]
  )
  res.json({ ok: true })
})

// ─── Logo Voting ─────────────────────────────────────────────

// GET /api/votes/logo — returns vote tallies + current user's vote
router.get('/votes/logo', requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'logoVotes'")
  const votes = rows.length ? JSON.parse(rows[0].value) : {}
  const myVote = Object.keys(votes).find(k => votes[k].includes(req.user.username)) || null
  // Return counts, not usernames
  const counts = {}
  for (const [k, v] of Object.entries(votes)) counts[k] = v.length
  res.json({ counts, myVote })
})

// POST /api/votes/logo — any authenticated user can cast or change their vote
router.post('/votes/logo', requireAuth, async (req, res) => {
  const { logoId } = req.body
  if (!logoId) return res.status(400).json({ error: 'logoId required' })

  const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'logoVotes'")
  const votes = rows.length ? JSON.parse(rows[0].value) : {}

  // Remove user from any existing vote
  for (const key of Object.keys(votes)) {
    votes[key] = votes[key].filter(u => u !== req.user.username)
  }

  // Add to selected logo
  if (!votes[logoId]) votes[logoId] = []
  votes[logoId].push(req.user.username)

  await pool.query(
    "INSERT INTO settings (key, value) VALUES ('logoVotes', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
    [JSON.stringify(votes)]
  )

  const counts = {}
  for (const [k, v] of Object.entries(votes)) counts[k] = v.length
  res.json({ ok: true, counts, myVote: logoId })
})

export default router
