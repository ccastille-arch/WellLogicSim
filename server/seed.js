// Seeds default roles + users on first run
import bcrypt from 'bcryptjs'
import { pool, ALL_PERMISSIONS } from './db.js'

const SYSTEM_ROLES = [
  {
    id: 'admin', name: 'Admin', is_system: true,
    permissions: ALL_PERMISSIONS,
  },
  {
    id: 'tech', name: 'Tech', is_system: true,
    permissions: [
      'tile:livedata', 'tile:autopilot', 'tile:marketing', 'tile:sales',
      'tile:technical', 'tile:quote', 'tile:detechtion_launchpad',
      'tile:mlink_connect', 'tile:vote', 'tile:simulator', 'tile:pipeline',
      'manage:quotes',
    ],
  },
  {
    id: 'viewer', name: 'Viewer', is_system: true,
    permissions: [
      'tile:livedata', 'tile:autopilot', 'tile:marketing', 'tile:sales',
      'tile:technical', 'tile:quote', 'tile:detechtion_launchpad',
      'tile:mlink_connect', 'tile:vote',
    ],
  },
]

const DEFAULT_USERS = [
  { username: 'cody',     password: 'Brayden25!', role: 'admin',  name: 'Cody Castille' },
  { username: 'techteam', password: '123',         role: 'tech',   name: 'Tech Team' },
  { username: 'don',      password: '12345678',    role: 'viewer', name: 'Don' },
]

export async function seedDefaults() {
  // 1. Seed system roles (upsert permissions for system roles)
  for (const r of SYSTEM_ROLES) {
    await pool.query(
      `INSERT INTO roles (id, name, permissions, is_system)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET permissions = $3, name = $2`,
      [r.id, r.name, JSON.stringify(r.permissions), r.is_system]
    )
  }
  console.log('Seeded system roles')

  // 2. Seed default users
  for (const u of DEFAULT_USERS) {
    const { rows } = await pool.query('SELECT username FROM users WHERE username = $1', [u.username])
    if (rows.length) continue
    const hash = await bcrypt.hash(u.password, 10)
    await pool.query(
      'INSERT INTO users (username, password, role, role_id, name) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
      [u.username, hash, u.role, u.role, u.name]
    )
  }
  console.log('Seeded default users')

  // 3. Backfill role_id for any existing users missing it
  await pool.query(`UPDATE users SET role_id = role WHERE role_id IS NULL AND role IN ('admin', 'tech', 'viewer')`)

  // 4. Default settings
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ('forumPublic', 'true'), ('quoteViewers', '[]')
     ON CONFLICT DO NOTHING`
  )
  console.log('Seeded default settings')
}
