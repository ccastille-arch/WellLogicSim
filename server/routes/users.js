import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { requireAuth, requireAdmin } from '../auth.js'

const router = Router()

// GET /api/users — admin only, returns all users (no passwords)
router.get('/', requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT username, role, name, created_at FROM users ORDER BY created_at'
  )
  res.json(rows)
})

// POST /api/users — admin creates a user
router.post('/', requireAdmin, async (req, res) => {
  const { username, password, role, name } = req.body
  if (!username || !password) return res.status(400).json({ error: 'username and password required' })

  const existing = await pool.query('SELECT username FROM users WHERE LOWER(username) = LOWER($1)', [username])
  if (existing.rows.length) return res.status(409).json({ error: 'Username already exists' })

  const hash = await bcrypt.hash(password, 10)
  const { rows } = await pool.query(
    'INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4) RETURNING username, role, name, created_at',
    [username.toLowerCase(), hash, role || 'viewer', name || username]
  )
  res.status(201).json(rows[0])
})

// PATCH /api/users/:username/role — admin updates role
router.patch('/:username/role', requireAdmin, async (req, res) => {
  const { username } = req.params
  const { role } = req.body
  if (username === 'cody') return res.status(403).json({ error: 'Cannot modify owner account' })
  await pool.query('UPDATE users SET role = $1 WHERE username = $2', [role, username])
  res.json({ ok: true })
})

// DELETE /api/users/:username — admin removes user
router.delete('/:username', requireAdmin, async (req, res) => {
  const { username } = req.params
  if (username === 'cody') return res.status(403).json({ error: 'Cannot delete owner account' })
  await pool.query('DELETE FROM users WHERE username = $1', [username])
  res.json({ ok: true })
})

export default router
