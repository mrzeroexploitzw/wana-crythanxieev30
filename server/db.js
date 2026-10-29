import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : undefined,
})

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT,
      phone_number TEXT,
      region TEXT DEFAULT 'auto',
      status TEXT NOT NULL DEFAULT 'pairing', -- pairing | online | offline
      pairing_code TEXT,
      connected_at TIMESTAMPTZ,
      last_seen_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Baileys auth-state key/value store, one row set per session.
    CREATE TABLE IF NOT EXISTS auth_state (
      session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      key_type TEXT NOT NULL,   -- 'creds' or the Baileys SignalKeyStore category
      key_id TEXT NOT NULL,     -- 'main' for creds, or the key id for a keystore entry
      value JSONB,
      PRIMARY KEY (session_id, key_type, key_id)
    );
  `)
}
