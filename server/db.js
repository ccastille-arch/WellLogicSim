import pg from 'pg'

const { Pool } = pg

// Railway provides DATABASE_URL automatically when PostgreSQL is linked
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
})

// Initialize schema — runs once on startup
export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      username    VARCHAR(50) PRIMARY KEY,
      password    VARCHAR(100) NOT NULL,
      role        VARCHAR(20) NOT NULL DEFAULT 'viewer',
      name        VARCHAR(100),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token       VARCHAR(64) PRIMARY KEY,
      username    VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
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
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    -- Index for session lookups
    CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);
    -- Index for activity feed
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);
  `)
}
