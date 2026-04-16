-- Covering index for queries that filter/sort by entry_time_ms per account.
-- Used by findRecentByAccount, findAfterTime, and other entry-time range queries.
CREATE INDEX IF NOT EXISTS idx_trades_account_entry_time
  ON trades (account_id, entry_time_ms DESC);
