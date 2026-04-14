import { Router } from 'express'
import { pool, ALL_PERMISSIONS } from '../db.js'
import { requireAuth, requirePermission } from '../auth.js'

const router = Router()

// List all roles (any authenticated user — needed for UI dropdowns)
router.get('/', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, permissions, is_system, created_at FROM roles ORDER BY is_system DESC, name'
    )
    res.json({ roles: rows, allPermissions: ALL_PERMISSIONS })
  } catch (err) {
    console.error('List roles error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create a custom role
router.post('/', requirePermission('manage:roles'), async (req, res) => {
  const { id, name, permissions } = req.body
  if (!id || !name) return res.status(400).json({ error: 'id and name required' })

  const slug = id.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
  const perms = (permissions || []).filter(p => ALL_PERMISSIONS.includes(p))

  try {
    await pool.query(
      `INSERT INTO roles (id, name, permissions, is_system) VALUES ($1, $2, $3, FALSE)`,
      [slug, name, JSON.stringify(perms)]
    )
    res.json({ ok: true, id: slug, name, permissions: perms })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Role ID already exists' })
    console.error('Create role error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update a role
router.patch('/:id', requirePermission('manage:roles'), async (req, res) => {
  const { id } = req.params
  if (id === 'admin') return res.status(403).json({ error: 'Cannot edit the admin role' })

  const { name, permissions } = req.body
  const updates = []
  const values = []
  let idx = 1

  if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name) }
  if (permissions !== undefined) {
    const perms = permissions.filter(p => ALL_PERMISSIONS.includes(p))
    updates.push(`permissions = $${idx++}`)
    values.push(JSON.stringify(perms))
  }

  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' })
  values.push(id)

  try {
    const { rowCount } = await pool.query(
      `UPDATE roles SET ${updates.join(', ')} WHERE id = $${idx}`, values
    )
    if (!rowCount) return res.status(404).json({ error: 'Role not found' })
    res.json({ ok: true })
  } catch (err) {
    console.error('Update role error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete a custom role (reassign users to 'viewer')
router.delete('/:id', requirePermission('manage:roles'), async (req, res) => {
  const { id } = req.params

  try {
    // Check if system role
    const { rows } = await pool.query('SELECT is_system FROM roles WHERE id = $1', [id])
    if (!rows[0]) return res.status(404).json({ error: 'Role not found' })
    if (rows[0].is_system) return res.status(403).json({ error: 'Cannot delete system roles' })

    // Reassign users on this role to viewer
    await pool.query(`UPDATE users SET role_id = 'viewer', role = 'viewer' WHERE role_id = $1`, [id])
    await pool.query('DELETE FROM roles WHERE id = $1', [id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Delete role error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
