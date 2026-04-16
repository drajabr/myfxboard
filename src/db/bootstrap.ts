import pool from './connection.js';

const MIGRATION_LOCK_KEY = 109948321;
const MIGRATION_LOCK_WAIT_TIMEOUT_MS = 15000;
const MIGRATION_LOCK_POLL_INTERVAL_MS = 200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS accounts (
  account_id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  broker TEXT DEFAULT 'MT5',
  created_at BIGINT NOT NULL,
  last_sync_at BIGINT,
  last_ingest_received_at BIGINT,
  last_closed_deal_id TEXT,
  last_closed_time_ms BIGINT,
  last_history_hash TEXT,
  history_sync_cursor TEXT,
  history_in_sync BOOLEAN DEFAULT false,
  equity NUMERIC(20, 2),
  balance NUMERIC(20, 2),
  nickname TEXT DEFAULT '',
  updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

CREATE INDEX IF NOT EXISTS idx_accounts_created ON accounts(created_at DESC);

CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  size NUMERIC(20, 8) NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  entry_price NUMERIC(20, 8) NOT NULL,
  current_price NUMERIC(20, 8),
  avg_sl NUMERIC(20, 8),
  avg_tp NUMERIC(20, 8),
  unrealized_pnl NUMERIC(20, 2),
  open_time_ms BIGINT NOT NULL,
  updated_at_ms BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  UNIQUE(account_id, symbol, direction, entry_price, open_time_ms)
);

CREATE INDEX IF NOT EXISTS idx_positions_account ON positions(account_id, updated_at_ms DESC);

CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  size NUMERIC(20, 8) NOT NULL,
  entry_price NUMERIC(20, 8) NOT NULL,
  exit_price NUMERIC(20, 8),
  profit NUMERIC(20, 2),
  profit_pct NUMERIC(10, 2),
  entry_time_ms BIGINT NOT NULL,
  exit_time_ms BIGINT,
  duration_sec INTEGER,
  result TEXT CHECK (result IN ('win', 'loss', 'breakeven', 'open')),
  close_method TEXT,
  CONSTRAINT trades_unique_trade_event UNIQUE(account_id, symbol, entry_time_ms, exit_time_ms, size)
);

CREATE INDEX IF NOT EXISTS idx_trades_account_time ON trades(account_id, entry_time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_trades_result ON trades(account_id, result);

CREATE TABLE IF NOT EXISTS account_settings (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE REFERENCES accounts(account_id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  refresh_interval_ms INTEGER DEFAULT 3000,
  api_token TEXT,
  token_expires_at BIGINT,
  readonly_until_unlock BOOLEAN DEFAULT true,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_snapshots (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  snapshot_time_ms BIGINT NOT NULL,
  equity NUMERIC(20, 2),
  balance NUMERIC(20, 2),
  return_pct NUMERIC(10, 2),
  trades_count INTEGER,
  wins INTEGER,
  losses INTEGER,
  UNIQUE(account_id, date)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_account ON daily_snapshots(account_id, snapshot_time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_account_date ON daily_snapshots(account_id, date);

CREATE TABLE IF NOT EXISTS sync_log (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  sync_timestamp_ms BIGINT NOT NULL,
  sync_id TEXT,
  position_count INTEGER,
  trade_count INTEGER,
  data_hash TEXT,
  status TEXT CHECK (status IN ('ok', 'error')),
  error_msg TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_log_account ON sync_log(account_id, sync_timestamp_ms DESC);

CREATE TABLE IF NOT EXISTS unlock_sessions (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_unlock_sessions_token ON unlock_sessions(token);
CREATE INDEX IF NOT EXISTS idx_unlock_sessions_expires ON unlock_sessions(expires_at);

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_ingest_received_at BIGINT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_history_hash TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS balance NUMERIC(20, 2);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trades_account_id_symbol_entry_time_ms_key'
  ) THEN
    ALTER TABLE trades DROP CONSTRAINT trades_account_id_symbol_entry_time_ms_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trades_unique_trade_event'
  ) THEN
    ALTER TABLE trades
      ADD CONSTRAINT trades_unique_trade_event
      UNIQUE(account_id, symbol, entry_time_ms, exit_time_ms, size);
  END IF;
END $$;
`;

async function bootstrapSchema() {
  const client = await pool.connect();
  let lockHeld = false;
  try {
    const lockStartAt = Date.now();
    while (!lockHeld) {
      const lockResult = await client.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [MIGRATION_LOCK_KEY]
      );
      lockHeld = Boolean(lockResult.rows[0]?.locked);
      if (lockHeld) {
        break;
      }

      if (Date.now() - lockStartAt >= MIGRATION_LOCK_WAIT_TIMEOUT_MS) {
        throw new Error(`Timed out acquiring migration lock after ${MIGRATION_LOCK_WAIT_TIMEOUT_MS}ms`);
      }

      await sleep(MIGRATION_LOCK_POLL_INTERVAL_MS);
    }

    await client.query('BEGIN');
    try {
      await client.query(SCHEMA_SQL);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    if (lockHeld) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
      } catch {
        // Ignore unlock failures on broken connections.
      }
    }
    client.release();
  }
}

export async function ensureDatabaseSchema(maxAttempts: number = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await bootstrapSchema();

      console.log('Database schema is ready');
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      console.warn(`Database schema bootstrap attempt ${attempt} failed; retrying...`, error);
      const retryDelayMs = Math.min(250 * attempt, 2000);
      await sleep(retryDelayMs);
    }
  }
}