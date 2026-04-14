import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { requirePermission } from '../auth.js'

const router = Router()

// GET /api/users — returns all users (no passwords)
router.get('/', requirePermission('manage:users'), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.username, u.role, u.role_id, u.name, u.created_at, r.name as role_name
       FROM users u LEFT JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at`
    )
    res.json(rows)
  } catch (err) {
    console.error('List users error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/users — create a user
router.post('/', requirePermission('manage:users'), async (req, res) => {
  const { username, password, role_id, name } = req.body
  if (!username || !password) return res.status(400).json({ error: 'username and password required' })

  const existing = await pool.query('SELECT username FROM users WHERE LOWER(username) = LOWER($1)', [username])
  if (existing.rows.length) return res.status(409).json({ error: 'Username already exists' })

  const roleId = role_id || 'viewer'
  const hash = await bcrypt.hash(password, 10)
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (username, password, role, role_id, name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING username, role, role_id, name, created_at`,
      [username.toLowerCase(), hash, roleId, roleId, name || username]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    console.error('Create user error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/users/:username/role — update user's role
router.patch('/:username/role', requirePermission('manage:users'), async (req, res) => {
  const { username } = req.params
  const { role_id } = req.body
  if (username === 'cody') return res.status(403).json({ error: 'Cannot modify owner account' })
  if (!role_id) return res.status(400).json({ error: 'role_id required' })

  try {
    await pool.query('UPDATE users SET role_id = $1, role = $2 WHERE username = $3', [role_id, role_id, username])
    res.json({ ok: true })
  } catch (err) {
    console.error('Update role error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /api/users/:username/name — edit display name
router.patch('/:username/name', requirePermission('manage:users'), async (req, res) => {
  const { username } = req.params
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })

  try {
    const { rowCount } = await pool.query('UPDATE users SET name = $1 WHERE username = $2', [name, username])
    if (!rowCount) return res.status(404).json({ error: 'User not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error('Update name error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/users/:username/reset-password — reset password + invalidate sessions
router.post('/:username/reset-password', requirePermission('manage:users'), async (req, res) => {
  const { username } = req.params
  const { password } = req.body
  if (!password) return res.status(400).json({ error: 'password required' })

  // Only cody can reset cody's password
  if (username === 'cody' && req.user.username !== 'cody') {
    return res.status(403).json({ error: 'Only the owner can reset their own password' })
  }

  try {
    const hash = await bcrypt.hash(password, 10)
    const { rowCount } = await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hash, username])
    if (!rowCount) return res.status(404).json({ error: 'User not found' })

    // Invalidate all sessions for that user
    await pool.query('DELETE FROM sessions WHERE username = $1', [username])
    res.json({ ok: true })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/users/:username — remove user
router.delete('/:username', requirePermission('manage:users'), async (req, res) => {
  const { username } = req.params
  if (username === 'cody') return res.status(403).json({ error: 'Cannot delete owner account' })

  try {
    await pool.query('DELETE FROM users WHERE username = $1', [username])
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
