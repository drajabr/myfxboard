-- Initial schema migration

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
