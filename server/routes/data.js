// Quotes, settings, activity, analytics — all in one file since they're small
import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireAdmin, requirePermission, userHasPermission } from '../auth.js'

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

// PATCH /api/settings — requires manage:settings
router.patch('/settings', requirePermission('manage:settings'), async (req, res) => {
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

// GET /api/quotes
router.get('/quotes', requireAuth, async (req, res) => {
  if (!userHasPermission(req.user, 'tile:pipeline') && !userHasPermission(req.user, 'manage:quotes')) {
    return res.status(403).json({ error: 'Access denied' })
  }
  const { rows } = await pool.query('SELECT * FROM quotes ORDER BY created_at DESC')
  res.json(rows.map(r => ({ ...r.data, id: r.id, createdAt: r.created_at, updatedAt: r.updated_at })))
})

// POST /api/quotes
router.post('/quotes', requirePermission('manage:quotes'), async (req, res) => {
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
router.patch('/quotes/:id', requirePermission('manage:quotes'), async (req, res) => {
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
router.delete('/quotes/:id', requirePermission('manage:quotes'), async (req, res) => {
  const { id } = req.params
  await pool.query('DELETE FROM quotes WHERE id = $1', [id])
  await pool.query(
    'INSERT INTO activity (username, user_name, action) VALUES ($1, $2, $3)',
    [req.user.username, req.user.name, `Deleted quote #${id}`]
  )
  res.json({ ok: true })
})

// ─── Activity log ────────────────────────────────────────────

// GET /api/activity — requires view:analytics
router.get('/activity', requirePermission('view:analytics'), async (req, res) => {
  const { rows } = await pool.query(
    'SELECT user_name AS "user", action, tile_id, created_at AS timestamp FROM activity ORDER BY created_at DESC LIMIT 500'
  )
  res.json(rows)
})

// POST /api/activity — any authenticated user can log (with optional tile_id)
router.post('/activity', requireAuth, async (req, res) => {
  const { action, tile_id } = req.body
  if (!action) return res.status(400).json({ error: 'action required' })
  await pool.query(
    'INSERT INTO activity (username, user_name, action, tile_id) VALUES ($1, $2, $3, $4)',
    [req.user.username, req.user.name, action, tile_id || null]
  )
  res.json({ ok: true })
})

// ─── Analytics ──────────────────────────────────────────────

// GET /api/analytics/summary
router.get('/analytics/summary', requirePermission('view:analytics'), async (req, res) => {
  try {
    const [usersR, quotesR, activeR, pipelineR] = await Promise.all([
      pool.query('SELECT count(*) FROM users'),
      pool.query('SELECT count(*) FROM quotes'),
      pool.query(`SELECT count(DISTINCT username) FROM activity WHERE created_at > NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT COALESCE(SUM((data->>'estimatedValue')::numeric), 0) as total FROM quotes WHERE data->>'status' NOT IN ('Lost')`),
    ])
    res.json({
      totalUsers: parseInt(usersR.rows[0].count),
      totalQuotes: parseInt(quotesR.rows[0].count),
      activeUsers7d: parseInt(activeR.rows[0].count),
      pipelineValue: parseFloat(pipelineR.rows[0].total),
    })
  } catch (err) {
    console.error('Analytics summary error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/analytics/tile-usage?days=30
router.get('/analytics/tile-usage', requirePermission('view:analytics'), async (req, res) => {
  const days = parseInt(req.query.days) || 30
  try {
    const { rows } = await pool.query(
      `SELECT tile_id, count(*) as visits, count(DISTINCT username) as unique_users
       FROM activity
       WHERE tile_id IS NOT NULL AND created_at > NOW() - ($1 || ' days')::INTERVAL
       GROUP BY tile_id
       ORDER BY visits DESC`,
      [days.toString()]
    )
    res.json(rows)
  } catch (err) {
    console.error('Tile usage error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/analytics/user-activity
router.get('/analytics/user-activity', requirePermission('view:analytics'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         a.username,
         MAX(u.name) as name,
         MAX(u.role_id) as role_id,
         count(*) as total_actions,
         MAX(a.created_at) as last_active,
         MODE() WITHIN GROUP (ORDER BY a.tile_id) as top_tile
       FROM activity a
       LEFT JOIN users u ON a.username = u.username
       GROUP BY a.username
       ORDER BY last_active DESC`
    )
    res.json(rows)
  } catch (err) {
    console.error('User activity error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ─── Logo Voting ─────────────────────────────────────────────

// GET /api/votes/logo
router.get('/votes/logo', requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'logoVotes'")
  const votes = rows.length ? JSON.parse(rows[0].value) : {}
  const myVote = Object.keys(votes).find(k => votes[k].includes(req.user.username)) || null
  const counts = {}
  for (const [k, v] of Object.entries(votes)) counts[k] = v.length
  res.json({ counts, myVote })
})

// POST /api/votes/logo
router.post('/votes/logo', requireAuth, async (req, res) => {
  const { logoId } = req.body
  if (!logoId) return res.status(400).json({ error: 'logoId required' })

  const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'logoVotes'")
  const votes = rows.length ? JSON.parse(rows[0].value) : {}

  for (const key of Object.keys(votes)) {
    votes[key] = votes[key].filter(u => u !== req.user.username)
  }

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
