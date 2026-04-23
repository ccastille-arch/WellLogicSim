// Quotes, settings, activity, analytics — all in one file since they're small
import { Router } from 'express'
import { createReadStream, existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { pool } from '../db.js'
import { requireAuth, requirePermission, userHasPermission } from '../auth.js'
import { getStorageStatusDetailed, getUploadsDir, writeBackupSnapshot } from '../storage.js'

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

// GET /api/storage/status - admin/settings visibility into mounted volume state
router.get('/storage/status', requirePermission('manage:settings'), async (_req, res) => {
  try {
    res.json(await getStorageStatusDetailed())
  } catch (err) {
    console.error('Storage status error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/storage/backup - write a JSON snapshot into the mounted data volume
router.post('/storage/backup', requirePermission('manage:settings'), async (req, res) => {
  try {
    const reason = req.body?.reason || 'manual'
    const backup = await writeBackupSnapshot(reason)
    res.status(201).json({ ok: true, backup })
  } catch (err) {
    console.error('Storage backup error:', err)
    res.status(500).json({ error: err.message || 'Backup failed' })
  }
})

// ─── Voiceover ───────────────────────────────────────────────

// GET /api/voiceover/file — serve the uploaded narration MP3
router.get('/voiceover/file', (req, res) => {
  const uploadsDir = getUploadsDir()
  const filePath = join(uploadsDir, 'voiceover.mp3')
  if (!existsSync(filePath)) return res.status(404).json({ error: 'No voiceover uploaded' })
  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  createReadStream(filePath).pipe(res)
})

// POST /api/voiceover — upload MP3 (admin: manage:settings)
// Expects raw binary body (Content-Type: audio/mpeg), max 50 MB
router.post('/voiceover', requirePermission('manage:settings'), async (req, res) => {
  const uploadsDir = getUploadsDir()
  if (!uploadsDir) return res.status(503).json({ error: 'Storage not available' })

  const chunks = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', async () => {
    try {
      const buf = Buffer.concat(chunks)
      if (buf.length < 4) return res.status(400).json({ error: 'File is empty' })
      if (buf.length > 50 * 1024 * 1024) return res.status(413).json({ error: 'File exceeds 50 MB limit' })

      // Validate MP3: ID3 header (0x49 0x44 0x33) or MPEG sync word (0xFF 0xEx)
      const isValidMp3 = (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) ||
                         (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0)
      if (!isValidMp3) return res.status(400).json({ error: 'File does not appear to be a valid MP3' })

      await writeFile(join(uploadsDir, 'voiceover.mp3'), buf)
      await pool.query(
        "INSERT INTO settings (key, value) VALUES ('presentationVoiceover', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
        [JSON.stringify({ url: '/api/voiceover/file', updatedAt: new Date().toISOString() })]
      )
      res.json({ ok: true, url: '/api/voiceover/file', size: buf.length })
    } catch (err) {
      console.error('Voiceover upload error:', err)
      res.status(500).json({ error: 'Upload failed' })
    }
  })
  req.on('error', () => res.status(400).json({ error: 'Upload interrupted' }))
})

// ─── Per-clip voiceover ──────────────────────────────────────

const VALID_CLIP_IDS = new Set(['well-pad-optimizer', 'what-is-welllogic', 'trip-sidebyside'])

// GET /api/voiceover/clip/:clipId
router.get('/voiceover/clip/:clipId', (req, res) => {
  const { clipId } = req.params
  if (!VALID_CLIP_IDS.has(clipId)) return res.status(404).json({ error: 'Unknown clip' })
  const uploadsDir = getUploadsDir()
  const filePath = join(uploadsDir, `voiceover-clip-${clipId}.mp3`)
  if (!existsSync(filePath)) return res.status(404).json({ error: 'No voiceover uploaded for this clip' })
  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  createReadStream(filePath).pipe(res)
})

// POST /api/voiceover/clip/:clipId
router.post('/voiceover/clip/:clipId', requirePermission('manage:settings'), async (req, res) => {
  const { clipId } = req.params
  if (!VALID_CLIP_IDS.has(clipId)) return res.status(404).json({ error: 'Unknown clip' })
  const uploadsDir = getUploadsDir()
  if (!uploadsDir) return res.status(503).json({ error: 'Storage not available' })

  const chunks = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', async () => {
    try {
      const buf = Buffer.concat(chunks)
      if (buf.length < 4) return res.status(400).json({ error: 'File is empty' })
      if (buf.length > 50 * 1024 * 1024) return res.status(413).json({ error: 'File exceeds 50 MB limit' })
      const isValidMp3 = (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) ||
                         (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0)
      if (!isValidMp3) return res.status(400).json({ error: 'File does not appear to be a valid MP3' })
      await writeFile(join(uploadsDir, `voiceover-clip-${clipId}.mp3`), buf)
      const settingsKey = `clipVoiceover_${clipId}`
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        [settingsKey, JSON.stringify({ url: `/api/voiceover/clip/${clipId}`, updatedAt: new Date().toISOString() })]
      )
      res.json({ ok: true, url: `/api/voiceover/clip/${clipId}`, size: buf.length })
    } catch (err) {
      console.error('Clip voiceover upload error:', err)
      res.status(500).json({ error: 'Upload failed' })
    }
  })
  req.on('error', () => res.status(400).json({ error: 'Upload interrupted' }))
})

// ─── Public pad visibility (no auth) ─────────────────────────

// GET /api/public/pad-visibility — returns which live data pads are visible
router.get('/public/pad-visibility', async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'liveDataPadVisibility'")
    const visibility = rows.length ? JSON.parse(rows[0].value) : {}
    res.json({
      klondike: visibility.klondike !== false,
      halfmann: visibility.halfmann !== false,
    })
  } catch {
    res.json({ klondike: true, halfmann: true })
  }
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
