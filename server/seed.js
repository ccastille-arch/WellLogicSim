// Seeds default users on first run (only if users table is empty)
import bcrypt from 'bcryptjs'
import { pool } from './db.js'

const DEFAULT_USERS = [
  { username: 'cody',     password: 'Brayden25!', role: 'admin',  name: 'Cody Castille' },
  { username: 'techteam', password: '123',         role: 'tech',   name: 'Tech Team' },
  { username: 'don',      password: '12345678',    role: 'viewer', name: 'Don' },
]

export async function seedDefaults() {
  // Always upsert default users so credentials are never lost after a failed seed
  for (const u of DEFAULT_USERS) {
    const { rows } = await pool.query('SELECT username FROM users WHERE username = $1', [u.username])
    if (rows.length) continue // already exists, don't overwrite
    const hash = await bcrypt.hash(u.password, 10)
    await pool.query(
      'INSERT INTO users (username, password, role, name) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [u.username, hash, u.role, u.name]
    )
  }
  console.log('Seeded default users')

  // Default settings
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ('forumPublic', 'true'), ('quoteViewers', '[]')
     ON CONFLICT DO NOTHING`
  )
  console.log('Seeded default settings')
}
