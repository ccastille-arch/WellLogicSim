import pg from 'pg'

const { Pool } = pg

// Railway provides DATABASE_URL automatically when PostgreSQL is linked
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
})

// Canonical list of all permissions in the system
export const ALL_PERMISSIONS = [
  'tile:admin', 'tile:livedata', 'tile:autopilot', 'tile:marketing',
  'tile:sales', 'tile:technical', 'tile:quote', 'tile:detechtion_launchpad',
  'tile:mlink_connect', 'tile:vote', 'tile:simulator', 'tile:pipeline',
  'manage:users', 'manage:roles', 'manage:settings', 'view:analytics', 'manage:quotes',
]

function qident(name) {
  return `"${String(name).replace(/"/g, '""')}"`
}

async function columnExists(tableName, columnName) {
  const { rows } = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [tableName, columnName]
  )
  return rows.length > 0
}

async function ensureColumn(tableName, columnName, definition) {
  await pool.query(`ALTER TABLE ${qident(tableName)} ADD COLUMN IF NOT EXISTS ${qident(columnName)} ${definition}`)
}

// Initialize schema. It must tolerate both a fresh app DB and the pre-existing
// Railway auth schema that already has users/sessions tables with different columns.
export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id          VARCHAR(50) PRIMARY KEY,
      name        VARCHAR(100) NOT NULL,
      permissions JSONB NOT NULL DEFAULT '[]',
      is_system   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      username      VARCHAR(50) PRIMARY KEY,
      password      VARCHAR(100),
      password_hash VARCHAR(100),
      role          VARCHAR(20) NOT NULL DEFAULT 'viewer',
      role_id       VARCHAR(50),
      email         VARCHAR(255) NOT NULL DEFAULT '',
      name          VARCHAR(100) NOT NULL,
      sso_sub       VARCHAR(100) NOT NULL DEFAULT '',
      sso_role      VARCHAR(50) NOT NULL DEFAULT 'user',
      platform_role VARCHAR(50) NOT NULL DEFAULT 'tech',
      is_active     BOOLEAN NOT NULL DEFAULT TRUE,
      last_login_at TIMESTAMPTZ,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW(),
      login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until  TIMESTAMPTZ,
      phone         VARCHAR(50),
      first_name    VARCHAR(100),
      last_name     VARCHAR(100)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token       VARCHAR(64) PRIMARY KEY,
      username    VARCHAR(50),
      session_id  VARCHAR(64),
      data        JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id          BIGSERIAL PRIMARY KEY,
      data        JSONB NOT NULL,
      created_by  VARCHAR(100),
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activity (
      id          BIGSERIAL PRIMARY KEY,
      username    VARCHAR(100),
      user_name   VARCHAR(100),
      action      TEXT NOT NULL,
      tile_id     VARCHAR(50),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_tile ON activity(tile_id) WHERE tile_id IS NOT NULL;
  `)

  // Idempotent compatibility migrations for pre-existing Railway auth tables.
  await ensureColumn('users', 'password', `VARCHAR(100)`)
  await ensureColumn('users', 'password_hash', `VARCHAR(100)`)
  await ensureColumn('users', 'role', `VARCHAR(20) NOT NULL DEFAULT 'viewer'`)
  await ensureColumn('users', 'role_id', `VARCHAR(50)`)
  await ensureColumn('users', 'email', `VARCHAR(255) NOT NULL DEFAULT ''`)
  await ensureColumn('users', 'name', `VARCHAR(100)`)
  await ensureColumn('users', 'sso_sub', `VARCHAR(100) NOT NULL DEFAULT ''`)
  await ensureColumn('users', 'sso_role', `VARCHAR(50) NOT NULL DEFAULT 'user'`)
  await ensureColumn('users', 'platform_role', `VARCHAR(50) NOT NULL DEFAULT 'tech'`)
  await ensureColumn('users', 'is_active', `BOOLEAN NOT NULL DEFAULT TRUE`)
  await ensureColumn('users', 'last_login_at', `TIMESTAMPTZ`)
  await ensureColumn('users', 'updated_at', `TIMESTAMPTZ DEFAULT NOW()`)
  await ensureColumn('users', 'login_attempts', `INTEGER NOT NULL DEFAULT 0`)
  await ensureColumn('users', 'locked_until', `TIMESTAMPTZ`)
  await ensureColumn('users', 'phone', `VARCHAR(50)`)
  await ensureColumn('users', 'first_name', `VARCHAR(100)`)
  await ensureColumn('users', 'last_name', `VARCHAR(100)`)
  await ensureColumn('sessions', 'token', `VARCHAR(64)`)
  await ensureColumn('sessions', 'username', `VARCHAR(50)`)
  await ensureColumn('sessions', 'session_id', `VARCHAR(64)`)
  await ensureColumn('sessions', 'data', `JSONB NOT NULL DEFAULT '{}'::jsonb`)
  await ensureColumn('sessions', 'updated_at', `TIMESTAMPTZ DEFAULT NOW()`)
  await pool.query(`ALTER TABLE activity ADD COLUMN IF NOT EXISTS tile_id VARCHAR(50)`).catch(() => {})

  await pool.query(`UPDATE users SET password = password_hash WHERE password IS NULL AND password_hash IS NOT NULL`).catch(() => {})
  await pool.query(`
    UPDATE users
    SET name = COALESCE(
      NULLIF(name, ''),
      NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), ''),
      NULLIF(username, ''),
      NULLIF(email, ''),
      'User'
    )
    WHERE name IS NULL OR name = ''
  `).catch(() => {})
  await pool.query(`
    UPDATE users
    SET email = COALESCE(
      NULLIF(email, ''),
      CASE
        WHEN username IS NOT NULL AND username <> '' THEN LOWER(username) || '@localhost'
        ELSE 'user-' || substr(md5(random()::text), 1, 12) || '@localhost'
      END
    )
    WHERE email IS NULL OR email = ''
  `).catch(() => {})
  await pool.query(`
    UPDATE users
    SET sso_sub = COALESCE(
      NULLIF(sso_sub, ''),
      CASE
        WHEN username IS NOT NULL AND username <> '' THEN 'local:' || LOWER(username)
        ELSE 'local:' || substr(md5(random()::text), 1, 12)
      END
    )
    WHERE sso_sub IS NULL OR sso_sub = ''
  `).catch(() => {})
  await pool.query(`
    UPDATE users
    SET role = CASE
      WHEN LOWER(COALESCE(platform_role, '')) IN ('super_admin', 'admin') THEN 'admin'
      WHEN LOWER(COALESCE(platform_role, '')) IN ('tech', 'technical') THEN 'tech'
      WHEN LOWER(COALESCE(role_id, '')) IN ('admin', 'tech', 'viewer') THEN LOWER(role_id)
      WHEN LOWER(COALESCE(role, '')) IN ('admin', 'tech', 'viewer') THEN LOWER(role)
      ELSE 'viewer'
    END
  `).catch(() => {})
  await pool.query(`
    UPDATE users
    SET role_id = CASE
      WHEN LOWER(COALESCE(platform_role, '')) IN ('super_admin', 'admin') THEN 'admin'
      WHEN LOWER(COALESCE(platform_role, '')) IN ('tech', 'technical') THEN 'tech'
      WHEN LOWER(COALESCE(role, '')) IN ('admin', 'tech', 'viewer') THEN LOWER(role)
      WHEN LOWER(COALESCE(role_id, '')) IN ('admin', 'tech', 'viewer') THEN LOWER(role_id)
      ELSE 'viewer'
    END
  `).catch(() => {})
  await pool.query(`
    UPDATE users
    SET platform_role = CASE
      WHEN LOWER(COALESCE(role_id, role, 'viewer')) = 'admin' THEN 'admin'
      WHEN LOWER(COALESCE(role_id, role, 'viewer')) = 'tech' THEN 'tech'
      ELSE 'viewer'
    END
    WHERE platform_role IS NULL OR platform_role = ''
  `).catch(() => {})
  await pool.query(`
    UPDATE users
    SET sso_role = CASE
      WHEN LOWER(COALESCE(role_id, role, 'viewer')) = 'admin' THEN 'admin'
      ELSE 'user'
    END
    WHERE sso_role IS NULL OR sso_role = ''
  `).catch(() => {})
  await pool.query(`UPDATE sessions SET token = COALESCE(token, session_id) WHERE token IS NULL AND session_id IS NOT NULL`).catch(() => {})
  await pool.query(`UPDATE sessions SET session_id = COALESCE(session_id, token) WHERE session_id IS NULL AND token IS NOT NULL`).catch(() => {})
  await pool.query(`UPDATE sessions SET data = '{}'::jsonb WHERE data IS NULL`).catch(() => {})
  await pool.query(`UPDATE sessions SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL`).catch(() => {})
  await pool.query(`ALTER TABLE sessions ALTER COLUMN data SET DEFAULT '{}'::jsonb`).catch(() => {})
  await pool.query(`ALTER TABLE sessions ALTER COLUMN updated_at SET DEFAULT NOW()`).catch(() => {})
  await pool.query(`ALTER TABLE sessions ALTER COLUMN created_at SET DEFAULT NOW()`).catch(() => {})
  await pool.query(`ALTER TABLE sessions ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '30 days'`).catch(() => {})
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`).catch(() => {})
  if (await columnExists('sessions', 'username')) {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username)`).catch(() => {})
  }
  if (await columnExists('users', 'username')) {
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)`).catch(() => {})
  }
}
