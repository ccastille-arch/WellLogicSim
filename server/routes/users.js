import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { requirePermission } from '../auth.js'

const router = Router()

function platformRoleFor(roleId) {
  if (roleId === 'admin') return 'admin'
  if (roleId === 'tech') return 'tech'
  return 'viewer'
}

// GET /api/users — returns all users (no passwords)
router.get('/', requirePermission('manage:users'), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         u.username,
         COALESCE(u.role, u.role_id, 'viewer') AS role,
         COALESCE(u.role_id, u.role, 'viewer') AS role_id,
         u.name,
         u.created_at,
         r.name as role_name
       FROM users u
       LEFT JOIN roles r ON COALESCE(u.role_id, u.role, 'viewer') = r.id
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
  const normalizedUsername = username.toLowerCase()
  const hash = await bcrypt.hash(password, 10)
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (
         username, password, password_hash, role, role_id, name, email,
         sso_sub, sso_role, platform_role, is_active, first_name, last_name, updated_at
       )
       VALUES ($1, $2, $2, $3, $3, $4, $5, $6, $7, $8, TRUE, $9, $10, NOW())
       RETURNING username, role, role_id, name, created_at`,
      [
        normalizedUsername,
        hash,
        roleId,
        name || normalizedUsername,
        `${normalizedUsername}@localhost`,
        `local:${normalizedUsername}`,
        roleId === 'admin' ? 'admin' : 'user',
        platformRoleFor(roleId),
        name || normalizedUsername,
        null,
      ]
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
    await pool.query(
      `UPDATE users
       SET role_id = $1, role = $2, platform_role = $3, sso_role = $4, updated_at = NOW()
       WHERE username = $5`,
      [role_id, role_id, platformRoleFor(role_id), role_id === 'admin' ? 'admin' : 'user', username]
    )
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
    const { rowCount } = await pool.query(
      'UPDATE users SET name = $1, first_name = $2, last_name = $3, updated_at = NOW() WHERE username = $4',
      [name, name.trim().split(/\s+/)[0] || name, name.trim().split(/\s+/).slice(1).join(' ') || null, username]
    )
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
    const { rowCount } = await pool.query(
      'UPDATE users SET password = $1, password_hash = $1, updated_at = NOW() WHERE username = $2',
      [hash, username]
    )
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
