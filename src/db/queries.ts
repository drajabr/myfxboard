import { query } from './connection.js';
import { Account, Position, Trade, DailySnapshot } from '../types/index.js';
import crypto from 'crypto';
import pg from 'pg';

type QueryFn = (text: string, params?: any[]) => Promise<any>;

const getQueryFn = (client?: pg.PoolClient): QueryFn => {
  if (client) {
    return client.query.bind(client);
  }
  return query;
};

export const accountQueries = {
  async findById(account_id: string): Promise<Account | null> {
    const result = await query('SELECT * FROM accounts WHERE account_id = $1', [account_id]);
    return result.rows[0] || null;
  },

  async create(account_id: string, account_name: string, secret_key: string, broker: string = 'MT5') {
    const secret_hash = crypto.createHash('sha256').update(secret_key).digest('hex');
    const now = Date.now();
    const result = await query(
      `INSERT INTO accounts (account_id, account_name, secret_hash, broker, created_at, last_sync_at, history_in_sync)
       VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING *`,
      [account_id, account_name, secret_hash, broker, now, now]
    );
    return result.rows[0];
  },

  async ensureByAccountNumber(account_id: string, shared_secret: string, broker: string = 'MT5') {
    const now = Date.now();
    const account_name = `MT5 ${account_id}`;
    const secret_hash = crypto.createHash('sha256').update(shared_secret).digest('hex');
    const existing = await query('SELECT * FROM accounts WHERE account_id = $1', [account_id]);
    if (existing.rows[0]) {
      if (existing.rows[0].secret_hash !== secret_hash) {
        const err = new Error('Shared secret mismatch for existing account');
        (err as any).code = 'ACCOUNT_SECRET_MISMATCH';
        throw err;
      }

      const updated = await query(
        `UPDATE accounts
           SET last_sync_at = $2
         WHERE account_id = $1
         RETURNING *`,
        [account_id, now]
      );
      return updated.rows[0];
    }

    const inserted = await query(
      `INSERT INTO accounts (account_id, account_name, secret_hash, broker, created_at, last_sync_at, history_in_sync)
       VALUES ($1, $2, $3, $4, $5, $6, false)
       RETURNING *`,
      [account_id, account_name, secret_hash, broker, now, now]
    );
    return inserted.rows[0];
  },

  async updateWatermarks(
    account_id: string,
    last_closed_deal_id: string,
    last_closed_time_ms: number,
    client?: pg.PoolClient
  ) {
    const q = getQueryFn(client);
    const now = Date.now();
    const result = await q(
      `UPDATE accounts
          SET last_closed_deal_id = CASE
                WHEN COALESCE(last_closed_deal_id, '') = '' THEN $1
                WHEN $1 ~ '^[0-9]+$' AND COALESCE(last_closed_deal_id, '0') ~ '^[0-9]+$' AND ($1::numeric >= last_closed_deal_id::numeric) THEN $1
                ELSE last_closed_deal_id
              END,
              last_closed_time_ms = GREATEST(COALESCE(last_closed_time_ms, 0), $2),
              last_sync_at = $3
       WHERE account_id = $4 RETURNING *`,
      [last_closed_deal_id, last_closed_time_ms, now, account_id]
    );
    return result.rows[0];
  },

  async updateIngestionState(
    account_id: string,
    last_ingest_received_at: number,
    last_history_hash?: string,
    client?: pg.PoolClient
  ) {
    const q = getQueryFn(client);
    const result = await q(
      `UPDATE accounts
         SET last_sync_at = $2,
             last_ingest_received_at = $2,
             last_history_hash = COALESCE($3, last_history_hash)
       WHERE account_id = $1
       RETURNING *`,
      [account_id, last_ingest_received_at, last_history_hash ?? null]
    );
    return result.rows[0] || null;
  },

  async list() {
    const result = await query('SELECT * FROM accounts ORDER BY created_at DESC');
    return result.rows;
  },
};

export const positionQueries = {
  async upsertPosition(position: Omit<Position, 'id' | 'updated_at_ms'>, client?: pg.PoolClient) {
    const q = getQueryFn(client);
    const now = Date.now();
    const result = await q(
      `INSERT INTO positions (account_id, symbol, size, direction, entry_price, current_price, avg_sl, avg_tp, unrealized_pnl, open_time_ms, updated_at_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (account_id, symbol, direction, entry_price, open_time_ms) DO UPDATE SET
         current_price = $6, avg_sl = $7, avg_tp = $8, unrealized_pnl = $9, updated_at_ms = $11
       RETURNING *`,
      [position.account_id, position.symbol, position.size, position.direction, position.entry_price,
       position.current_price, position.avg_sl, position.avg_tp, position.unrealized_pnl, position.open_time_ms, now]
    );
    return result.rows[0];
  },

  async findByAccount(account_id: string): Promise<Position[]> {
    const result = await query('SELECT * FROM positions WHERE account_id = $1 ORDER BY open_time_ms DESC', [account_id]);
    return result.rows;
  },

  async deleteByAccount(account_id: string, client?: pg.PoolClient) {
    const q = getQueryFn(client);
    await q('DELETE FROM positions WHERE account_id = $1', [account_id]);
  },
};

export const tradeQueries = {
  async deleteByAccount(account_id: string) {
    await query('DELETE FROM trades WHERE account_id = $1', [account_id]);
  },

  async insertTrade(trade: Omit<Trade, 'id'>, client?: pg.PoolClient) {
    const q = getQueryFn(client);
    const result = await q(
      `INSERT INTO trades (account_id, symbol, size, entry_price, exit_price, profit, profit_pct, entry_time_ms, exit_time_ms, duration_sec, result, close_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT ON CONSTRAINT trades_unique_trade_event DO NOTHING
       RETURNING *`,
      [trade.account_id, trade.symbol, trade.size, trade.entry_price, trade.exit_price, trade.profit, 
       trade.profit_pct, trade.entry_time_ms, trade.exit_time_ms, trade.duration_sec, trade.result, trade.close_method]
    );
    return result.rows[0] || null;
  },

  async findRecentByAccount(account_id: string, limit: number = 50): Promise<Trade[]> {
    const result = await query(
      'SELECT * FROM trades WHERE account_id = $1 ORDER BY entry_time_ms DESC LIMIT $2',
      [account_id, limit]
    );
    return result.rows;
  },

  async findAfterTime(account_id: string, from_time_ms: number, limit: number = 100): Promise<Trade[]> {
    const result = await query(
      'SELECT * FROM trades WHERE account_id = $1 AND entry_time_ms >= $2 ORDER BY entry_time_ms ASC LIMIT $3',
      [account_id, from_time_ms, limit]
    );
    return result.rows;
  },

  async findAllByAccount(account_id: string): Promise<Trade[]> {
    const result = await query(
      'SELECT * FROM trades WHERE account_id = $1 ORDER BY entry_time_ms DESC',
      [account_id]
    );
    return result.rows;
  },

  async findByExitRange(account_id: string, from_time_ms: number, to_time_ms: number): Promise<Trade[]> {
    const result = await query(
      `SELECT *
         FROM trades
        WHERE account_id = $1
          AND exit_time_ms IS NOT NULL
          AND exit_time_ms BETWEEN $2 AND $3
        ORDER BY exit_time_ms DESC`,
      [account_id, from_time_ms, to_time_ms]
    );
    return result.rows;
  },

  async summarizeByExitRange(
    account_id: string,
    from_time_ms: number,
    to_time_ms: number,
    client?: pg.PoolClient
  ): Promise<{ trades_count: number; wins: number; losses: number }> {
    const q = getQueryFn(client);
    const result = await q(
      `SELECT
          COUNT(*)::int AS trades_count,
          COUNT(*) FILTER (WHERE profit > 0)::int AS wins,
          COUNT(*) FILTER (WHERE profit < 0)::int AS losses
         FROM trades
        WHERE account_id = $1
          AND exit_time_ms IS NOT NULL
          AND exit_time_ms BETWEEN $2 AND $3`,
      [account_id, from_time_ms, to_time_ms]
    );
    return result.rows[0] || { trades_count: 0, wins: 0, losses: 0 };
  },
};

export const snapshotQueries = {
  async insertSnapshot(snapshot: Omit<DailySnapshot, 'id'>, client?: pg.PoolClient) {
    const q = getQueryFn(client);
    const result = await q(
      `INSERT INTO daily_snapshots (account_id, date, snapshot_time_ms, equity, balance, return_pct, trades_count, wins, losses)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (account_id, date) DO UPDATE SET
         snapshot_time_ms = $3, equity = $4, balance = $5, return_pct = $6, trades_count = $7, wins = $8, losses = $9
       RETURNING *`,
      [snapshot.account_id, snapshot.date, snapshot.snapshot_time_ms, snapshot.equity, snapshot.balance,
       snapshot.return_pct, snapshot.trades_count, snapshot.wins, snapshot.losses]
    );
    return result.rows[0];
  },

  async findByAccountAndRange(account_id: string, from_ms: number, to_ms: number): Promise<DailySnapshot[]> {
    const result = await query(
      'SELECT * FROM daily_snapshots WHERE account_id = $1 AND snapshot_time_ms BETWEEN $2 AND $3 ORDER BY snapshot_time_ms ASC',
      [account_id, from_ms, to_ms]
    );
    return result.rows;
  },

  async findLatestByAccount(account_id: string): Promise<DailySnapshot | null> {
    const result = await query(
      'SELECT * FROM daily_snapshots WHERE account_id = $1 ORDER BY snapshot_time_ms DESC LIMIT 1',
      [account_id]
    );
    return result.rows[0] || null;
  },
};
