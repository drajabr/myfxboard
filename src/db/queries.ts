import { query } from './connection.js';
import { Account, Position, Trade, DailySnapshot } from '../types/index.js';
import crypto from 'crypto';
import pg from 'pg';

type QueryFn = (text: string, params?: any[]) => Promise<any>;

// ── Breakeven tolerance in-memory cache ──────────────────────────────────────
// PERCENTILE_CONT over all trades is expensive. The result changes only when
// new trades are inserted, so cache it per account and invalidate on insert.
const beToleranceCache = new Map<string, { value: number; expiresAt: number }>();
const beInFlightQueries = new Map<string, Promise<number>>();
const BE_CACHE_TTL_MS = 10 * 60 * 1000; // 10-minute safety TTL

export function invalidateBreakevenCache(account_id: string): void {
  beToleranceCache.delete(account_id);
}

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

  async findAllBalances(): Promise<{ account_id: string; balance: number }[]> {
    const result = await query(
      'SELECT account_id, balance FROM accounts WHERE balance IS NOT NULL',
      []
    );
    return result.rows.map((r: any) => ({ account_id: r.account_id, balance: Number(r.balance) }));
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
    accountMetrics?: { balance?: number | null },
    client?: pg.PoolClient
  ) {
    const q = getQueryFn(client);
    const balance = accountMetrics?.balance ?? null;
    const result = await q(
      `UPDATE accounts
         SET last_sync_at = $2,
             last_ingest_received_at = $2,
             last_history_hash = COALESCE($3, last_history_hash),
             balance = COALESCE($4, balance)
       WHERE account_id = $1
       RETURNING *`,
      [account_id, last_ingest_received_at, last_history_hash ?? null, balance]
    );
    return result.rows[0] || null;
  },

  async updateNickname(account_id: string, nickname: string, client?: pg.PoolClient) {
    const q = getQueryFn(client);
    await q(
      `UPDATE accounts SET nickname = $2 WHERE account_id = $1`,
      [account_id, nickname]
    );
  },

  async updateIdentity(
    account_id: string,
    identity: { account_name?: string; broker?: string; nickname?: string; category?: string },
    client?: pg.PoolClient
  ) {
    const q = getQueryFn(client);
    const accountName = String(identity.account_name || '').trim();
    const broker = String(identity.broker || '').trim();
    const nickname = String(identity.nickname || '').trim();
    const category = typeof identity.category === 'string' ? identity.category.trim() : null;

    const result = await q(
      `UPDATE accounts
          SET account_name = CASE WHEN COALESCE(NULLIF($2, ''), '') <> '' THEN $2 ELSE account_name END,
              broker = CASE WHEN COALESCE(NULLIF($3, ''), '') <> '' THEN $3 ELSE broker END,
              nickname = CASE WHEN COALESCE(NULLIF($4, ''), '') <> '' THEN $4 ELSE nickname END,
              category = CASE WHEN $5 IS NOT NULL THEN $5 ELSE category END
       WHERE account_id = $1
       RETURNING *`,
      [account_id, accountName, broker, nickname, category]
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
      `INSERT INTO positions (account_id, symbol, size, direction, entry_price, current_price, avg_sl, avg_tp, tick_size, tick_value, margin, unrealized_pnl, open_time_ms, updated_at_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (account_id, symbol, direction, entry_price, open_time_ms) DO UPDATE SET
         current_price = $6, avg_sl = $7, avg_tp = $8, tick_size = $9, tick_value = $10, margin = $11, unrealized_pnl = $12, updated_at_ms = $14
       RETURNING *`,
      [position.account_id, position.symbol, position.size, position.direction, position.entry_price,
       position.current_price, position.avg_sl, position.avg_tp, position.tick_size, position.tick_value, position.margin, position.unrealized_pnl, position.open_time_ms, now]
    );
    return result.rows[0];
  },

  async findByAccount(account_id: string): Promise<Position[]> {
    const result = await query('SELECT * FROM positions WHERE account_id = $1 ORDER BY open_time_ms DESC', [account_id]);
    return result.rows;
  },

  async findAll(): Promise<Position[]> {
    const result = await query('SELECT * FROM positions ORDER BY account_id, open_time_ms DESC');
    return result.rows;
  },

  async deleteByAccount(account_id: string, client?: pg.PoolClient) {
    const q = getQueryFn(client);
    await q('DELETE FROM positions WHERE account_id = $1', [account_id]);
  },
};

export const tradeQueries = {
  async getBreakevenTolerance(account_id: string, floor: number = 1.0, maxTolerance: number = 5.0): Promise<number> {
    const safeFloor = Number.isFinite(floor) && floor >= 0 ? floor : 1.0;
    const safeMax = Number.isFinite(maxTolerance) && maxTolerance >= safeFloor ? maxTolerance : 5.0;

    const cached = beToleranceCache.get(account_id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Deduplicate concurrent queries for the same account
    const inFlight = beInFlightQueries.get(account_id);
    if (inFlight) {
      return inFlight;
    }

    const promise = (async () => {
      const result = await query(
        `SELECT
            COALESCE(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ABS(profit)) FILTER (WHERE profit < 0), 0)::float8 AS be_abs_loss_percentile
           FROM trades
          WHERE account_id = $1`,
        [account_id]
      );
      const percentileTolerance = Number(result.rows[0]?.be_abs_loss_percentile || 0);
      const boundedPercentile = Math.min(Number.isFinite(percentileTolerance) ? percentileTolerance : 0, safeMax);
      const value = Math.max(safeFloor, boundedPercentile);
      beToleranceCache.set(account_id, { value, expiresAt: Date.now() + BE_CACHE_TTL_MS });
      return value;
    })();

    beInFlightQueries.set(account_id, promise);
    try {
      return await promise;
    } finally {
      beInFlightQueries.delete(account_id);
    }
  },

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

  async insertTradeBatch(trades: Array<Omit<Trade, 'id'>>, client?: pg.PoolClient): Promise<void> {
    if (trades.length === 0) return;
    const q = getQueryFn(client);
    const COLS = 12;
    const valuesClauses = trades.map((_, i) => {
      const b = i * COLS;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11},$${b+12})`;
    });
    const params = trades.flatMap(t => [
      t.account_id, t.symbol, t.size, t.entry_price, t.exit_price, t.profit,
      t.profit_pct, t.entry_time_ms, t.exit_time_ms, t.duration_sec, t.result, t.close_method,
    ]);
    await q(
      `INSERT INTO trades (account_id, symbol, size, entry_price, exit_price, profit, profit_pct, entry_time_ms, exit_time_ms, duration_sec, result, close_method)
       VALUES ${valuesClauses.join(',')}
       ON CONFLICT ON CONSTRAINT trades_unique_trade_event DO NOTHING`,
      params
    );
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

  async findWindowedByEventTime(
    account_id: string,
    from_time_ms: number,
    to_time_ms: number,
    limit: number
  ): Promise<Trade[]> {
    const result = await query(
      `SELECT *
         FROM trades
        WHERE account_id = $1
          AND COALESCE(exit_time_ms, entry_time_ms) BETWEEN $2 AND $3
        ORDER BY COALESCE(exit_time_ms, entry_time_ms) DESC
        LIMIT $4`,
      [account_id, from_time_ms, to_time_ms, limit]
    );
    return result.rows;
  },

  async findByEventTimeRange(
    account_id: string,
    from_time_ms: number,
    to_time_ms: number
  ): Promise<Trade[]> {
    const result = await query(
      `SELECT *
         FROM trades
        WHERE account_id = $1
          AND COALESCE(exit_time_ms, entry_time_ms) BETWEEN $2 AND $3
        ORDER BY COALESCE(exit_time_ms, entry_time_ms) ASC, id ASC`,
      [account_id, from_time_ms, to_time_ms]
    );
    return result.rows;
  },

  async countByEventTimeRange(account_id: string, from_time_ms: number, to_time_ms: number): Promise<number> {
    const result = await query(
      `SELECT COUNT(*)::int AS total
         FROM trades
        WHERE account_id = $1
          AND COALESCE(exit_time_ms, entry_time_ms) BETWEEN $2 AND $3`,
      [account_id, from_time_ms, to_time_ms]
    );
    return result.rows[0]?.total || 0;
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
    breakeven_tolerance: number,
    client?: pg.PoolClient
  ): Promise<{ trades_count: number; wins: number; losses: number }> {
    const q = getQueryFn(client);
    const result = await q(
      `SELECT
          COUNT(*)::int AS trades_count,
          COUNT(*) FILTER (WHERE profit > $4)::int AS wins,
          COUNT(*) FILTER (WHERE profit < -$4)::int AS losses
         FROM trades
        WHERE account_id = $1
          AND exit_time_ms IS NOT NULL
          AND exit_time_ms BETWEEN $2 AND $3`,
      [account_id, from_time_ms, to_time_ms, breakeven_tolerance]
    );
    return result.rows[0] || { trades_count: 0, wins: 0, losses: 0 };
  },

  async summarizeByEventTimeRange(
    account_id: string,
    from_time_ms: number,
    to_time_ms: number,
    breakeven_tolerance: number
  ): Promise<{ pnl: number; trades_count: number; wins: number; losses: number; neutral: number }> {
    const result = await query(
      `SELECT
          COALESCE(SUM(profit), 0)::float8 AS pnl,
          COUNT(*)::int AS trades_count,
          COUNT(*) FILTER (WHERE profit > $4)::int AS wins,
          COUNT(*) FILTER (WHERE profit < -$4)::int AS losses,
          COUNT(*) FILTER (WHERE ABS(profit) <= $4)::int AS neutral
         FROM trades
        WHERE account_id = $1
          AND COALESCE(exit_time_ms, entry_time_ms) BETWEEN $2 AND $3`,
      [account_id, from_time_ms, to_time_ms, breakeven_tolerance]
    );
    return result.rows[0] || { pnl: 0, trades_count: 0, wins: 0, losses: 0, neutral: 0 };
  },

  async summarizeDirectionDistributionByEventTimeRange(
    account_id: string,
    from_time_ms: number,
    to_time_ms: number
  ): Promise<{ longs: number; shorts: number; unknown: number }> {
    const result = await query(
      `SELECT
          COUNT(*) FILTER (
            WHERE exit_price IS NOT NULL
              AND profit IS NOT NULL
              AND ((exit_price - entry_price) * profit) > 0
          )::int AS longs,
          COUNT(*) FILTER (
            WHERE exit_price IS NOT NULL
              AND profit IS NOT NULL
              AND ((exit_price - entry_price) * profit) < 0
          )::int AS shorts,
          COUNT(*) FILTER (
            WHERE exit_price IS NULL
               OR profit IS NULL
               OR ((exit_price - entry_price) * profit) = 0
          )::int AS unknown
         FROM trades
        WHERE account_id = $1
          AND COALESCE(exit_time_ms, entry_time_ms) BETWEEN $2 AND $3`,
      [account_id, from_time_ms, to_time_ms]
    );
    return result.rows[0] || { longs: 0, shorts: 0, unknown: 0 };
  },

  async summarizeDirectionOutcomeDistributionByEventTimeRange(
    account_id: string,
    from_time_ms: number,
    to_time_ms: number,
    breakeven_tolerance: number
  ): Promise<{
    long_wins: number;
    long_losses: number;
    long_neutral: number;
    short_wins: number;
    short_losses: number;
    short_neutral: number;
  }> {
    const result = await query(
      `WITH scoped AS (
          SELECT
            profit,
            CASE
              WHEN exit_price IS NULL OR profit IS NULL THEN 'unknown'
              WHEN ((exit_price - entry_price) * profit) > 0 THEN 'long'
              WHEN ((exit_price - entry_price) * profit) < 0 THEN 'short'
              ELSE 'unknown'
            END AS direction
          FROM trades
          WHERE account_id = $1
            AND COALESCE(exit_time_ms, entry_time_ms) BETWEEN $2 AND $3
      )
      SELECT
        COUNT(*) FILTER (WHERE direction = 'long' AND profit > $4)::int AS long_wins,
        COUNT(*) FILTER (WHERE direction = 'long' AND profit < -$4)::int AS long_losses,
        COUNT(*) FILTER (WHERE direction = 'long' AND ABS(profit) <= $4)::int AS long_neutral,
        COUNT(*) FILTER (WHERE direction = 'short' AND profit > $4)::int AS short_wins,
        COUNT(*) FILTER (WHERE direction = 'short' AND profit < -$4)::int AS short_losses,
        COUNT(*) FILTER (WHERE direction = 'short' AND ABS(profit) <= $4)::int AS short_neutral
      FROM scoped`,
      [account_id, from_time_ms, to_time_ms, breakeven_tolerance]
    );
    return result.rows[0] || {
      long_wins: 0,
      long_losses: 0,
      long_neutral: 0,
      short_wins: 0,
      short_losses: 0,
      short_neutral: 0,
    };
  },

  async summarizeAllTimeStats(
    account_id: string,
    breakeven_tolerance: number
  ): Promise<{ pnl: number; trades_count: number; wins: number; losses: number; neutral: number }> {
    const result = await query(
      `SELECT
          COALESCE(SUM(profit), 0)::float8 AS pnl,
          COUNT(*)::int AS trades_count,
          COUNT(*) FILTER (WHERE profit > $2)::int AS wins,
          COUNT(*) FILTER (WHERE profit < -$2)::int AS losses,
          COUNT(*) FILTER (WHERE ABS(profit) <= $2)::int AS neutral
         FROM trades
        WHERE account_id = $1`,
      [account_id, breakeven_tolerance]
    );
    return result.rows[0] || { pnl: 0, trades_count: 0, wins: 0, losses: 0, neutral: 0 };
  },

  // Single-scan replacement for 5 separate summarizeByEventTimeRange calls (today / 7d / 30d / ytd / all-time).
  // One table scan, conditional FILTER aggregation — 5× fewer DB round-trips per account per analytics request.
  async summarizeAllPeriodStats(
    account_id: string,
    todayStartMs: number,
    last7dStartMs: number,
    last30dStartMs: number,
    ytdStartMs: number,
    upperBoundMs: number,
    breakeven_tolerance: number
  ): Promise<{
    today: { pnl: number; trades_count: number; wins: number; losses: number; neutral: number };
    last7d: { pnl: number; trades_count: number; wins: number; losses: number; neutral: number };
    last30d: { pnl: number; trades_count: number; wins: number; losses: number; neutral: number };
    ytd: { pnl: number; trades_count: number; wins: number; losses: number; neutral: number };
    all_time: { pnl: number; trades_count: number; wins: number; losses: number; neutral: number };
  }> {
    const result = await query(
      `SELECT
          /* today */
          COALESCE(SUM(profit) FILTER (WHERE ts BETWEEN $2 AND $6), 0)::float8 AS today_pnl,
          COUNT(*) FILTER (WHERE ts BETWEEN $2 AND $6)::int AS today_trades,
          COUNT(*) FILTER (WHERE ts BETWEEN $2 AND $6 AND profit > $7)::int AS today_wins,
          COUNT(*) FILTER (WHERE ts BETWEEN $2 AND $6 AND profit < -$7)::int AS today_losses,
          COUNT(*) FILTER (WHERE ts BETWEEN $2 AND $6 AND ABS(profit) <= $7)::int AS today_neutral,
          /* last 7 days */
          COALESCE(SUM(profit) FILTER (WHERE ts BETWEEN $3 AND $6), 0)::float8 AS last7d_pnl,
          COUNT(*) FILTER (WHERE ts BETWEEN $3 AND $6)::int AS last7d_trades,
          COUNT(*) FILTER (WHERE ts BETWEEN $3 AND $6 AND profit > $7)::int AS last7d_wins,
          COUNT(*) FILTER (WHERE ts BETWEEN $3 AND $6 AND profit < -$7)::int AS last7d_losses,
          COUNT(*) FILTER (WHERE ts BETWEEN $3 AND $6 AND ABS(profit) <= $7)::int AS last7d_neutral,
          /* last 30 days */
          COALESCE(SUM(profit) FILTER (WHERE ts BETWEEN $4 AND $6), 0)::float8 AS last30d_pnl,
          COUNT(*) FILTER (WHERE ts BETWEEN $4 AND $6)::int AS last30d_trades,
          COUNT(*) FILTER (WHERE ts BETWEEN $4 AND $6 AND profit > $7)::int AS last30d_wins,
          COUNT(*) FILTER (WHERE ts BETWEEN $4 AND $6 AND profit < -$7)::int AS last30d_losses,
          COUNT(*) FILTER (WHERE ts BETWEEN $4 AND $6 AND ABS(profit) <= $7)::int AS last30d_neutral,
          /* ytd */
          COALESCE(SUM(profit) FILTER (WHERE ts BETWEEN $5 AND $6), 0)::float8 AS ytd_pnl,
          COUNT(*) FILTER (WHERE ts BETWEEN $5 AND $6)::int AS ytd_trades,
          COUNT(*) FILTER (WHERE ts BETWEEN $5 AND $6 AND profit > $7)::int AS ytd_wins,
          COUNT(*) FILTER (WHERE ts BETWEEN $5 AND $6 AND profit < -$7)::int AS ytd_losses,
          COUNT(*) FILTER (WHERE ts BETWEEN $5 AND $6 AND ABS(profit) <= $7)::int AS ytd_neutral,
          /* all time (no upper bound — fixes broker clock-skew exclusions) */
          COALESCE(SUM(profit), 0)::float8 AS all_time_pnl,
          COUNT(*)::int AS all_time_trades,
          COUNT(*) FILTER (WHERE profit > $7)::int AS all_time_wins,
          COUNT(*) FILTER (WHERE profit < -$7)::int AS all_time_losses,
          COUNT(*) FILTER (WHERE ABS(profit) <= $7)::int AS all_time_neutral
         FROM (
           SELECT profit, COALESCE(exit_time_ms, entry_time_ms) AS ts
             FROM trades
            WHERE account_id = $1
         ) t`,
      [account_id, todayStartMs, last7dStartMs, last30dStartMs, ytdStartMs, upperBoundMs, breakeven_tolerance]
    );
    const r = result.rows[0];
    const empty = { pnl: 0, trades_count: 0, wins: 0, losses: 0, neutral: 0 };
    if (!r) return { today: empty, last7d: empty, last30d: empty, ytd: empty, all_time: empty };
    return {
      today:    { pnl: Number(r.today_pnl),    trades_count: r.today_trades,    wins: r.today_wins,    losses: r.today_losses,    neutral: r.today_neutral },
      last7d:   { pnl: Number(r.last7d_pnl),   trades_count: r.last7d_trades,   wins: r.last7d_wins,   losses: r.last7d_losses,   neutral: r.last7d_neutral },
      last30d:  { pnl: Number(r.last30d_pnl),  trades_count: r.last30d_trades,  wins: r.last30d_wins,  losses: r.last30d_losses,  neutral: r.last30d_neutral },
      ytd:      { pnl: Number(r.ytd_pnl),      trades_count: r.ytd_trades,      wins: r.ytd_wins,      losses: r.ytd_losses,      neutral: r.ytd_neutral },
      all_time: { pnl: Number(r.all_time_pnl), trades_count: r.all_time_trades, wins: r.all_time_wins, losses: r.all_time_losses, neutral: r.all_time_neutral },
    };
  },

  async summarizeMetrics(account_id: string, breakeven_tolerance: number): Promise<{
    trade_count: number;
    win_count: number;
    loss_count: number;
    avg_win: number;
    avg_loss: number;
    max_win: number;
    max_loss: number;
    expectancy: number;
    gross_profit: number;
    gross_loss: number;
    avg_hold_seconds: number;
  }> {
    const result = await query(
      `SELECT
          COUNT(*)::int AS trade_count,
          COUNT(*) FILTER (WHERE profit > $2)::int AS win_count,
          COUNT(*) FILTER (WHERE profit < -$2)::int AS loss_count,
          COALESCE(AVG(profit) FILTER (WHERE profit > $2), 0)::float8 AS avg_win,
          COALESCE(AVG(profit) FILTER (WHERE profit < -$2), 0)::float8 AS avg_loss,
          COALESCE(MAX(profit), 0)::float8 AS max_win,
          COALESCE(MIN(profit), 0)::float8 AS max_loss,
          COALESCE(AVG(profit), 0)::float8 AS expectancy,
          COALESCE(SUM(profit) FILTER (WHERE profit > $2), 0)::float8 AS gross_profit,
          COALESCE(ABS(SUM(profit) FILTER (WHERE profit < -$2)), 0)::float8 AS gross_loss,
          COALESCE(AVG(duration_sec) FILTER (WHERE duration_sec > 0), 0)::float8 AS avg_hold_seconds
         FROM trades
        WHERE account_id = $1
          AND profit IS NOT NULL`,
      [account_id, breakeven_tolerance]
    );
    return result.rows[0] || {
      trade_count: 0,
      win_count: 0,
      loss_count: 0,
      avg_win: 0,
      avg_loss: 0,
      max_win: 0,
      max_loss: 0,
      expectancy: 0,
      gross_profit: 0,
      gross_loss: 0,
      avg_hold_seconds: 0,
    };
  },

  async summarizeDailyPnlByEventTimeRange(
    account_id: string,
    from_time_ms: number,
    to_time_ms: number
  ): Promise<Array<{ date: string; pnl: number }>> {
    const result = await query(
      `SELECT
          TO_CHAR(TO_TIMESTAMP(COALESCE(exit_time_ms, entry_time_ms) / 1000.0), 'YYYY-MM-DD') AS date,
          COALESCE(SUM(profit), 0)::float8 AS pnl
         FROM trades
        WHERE account_id = $1
          AND COALESCE(exit_time_ms, entry_time_ms) BETWEEN $2 AND $3
        GROUP BY 1
        ORDER BY 1 ASC`,
      [account_id, from_time_ms, to_time_ms]
    );
    return result.rows;
  },

  async summarizeDailyPnlAllTimeByEventTime(
    account_id: string
  ): Promise<Array<{ date: string; pnl: number }>> {
    const result = await query(
      `SELECT
          TO_CHAR(TO_TIMESTAMP(COALESCE(exit_time_ms, entry_time_ms) / 1000.0), 'YYYY-MM-DD') AS date,
          COALESCE(SUM(profit), 0)::float8 AS pnl
         FROM trades
        WHERE account_id = $1
        GROUP BY 1
        ORDER BY 1 ASC`,
      [account_id]
    );
    return result.rows;
  },

  async summarizePnlByDayOfWeekByEventTimeRange(
    account_id: string,
    from_time_ms: number,
    to_time_ms: number
  ): Promise<Array<{ day_of_week: number; pnl: number }>> {
    const result = await query(
      `SELECT
          EXTRACT(DOW FROM TO_TIMESTAMP(COALESCE(exit_time_ms, entry_time_ms) / 1000.0) AT TIME ZONE 'UTC')::int AS day_of_week,
          COALESCE(SUM(profit), 0)::float8 AS pnl
         FROM trades
        WHERE account_id = $1
          AND COALESCE(exit_time_ms, entry_time_ms) BETWEEN $2 AND $3
        GROUP BY 1
        ORDER BY 1 ASC`,
      [account_id, from_time_ms, to_time_ms]
    );
    return result.rows;
  },

  async summarizePnlByHourOfDayByEventTimeRange(
    account_id: string,
    from_time_ms: number,
    to_time_ms: number
  ): Promise<Array<{ hour_of_day: number; pnl: number }>> {
    const result = await query(
      `SELECT
          EXTRACT(HOUR FROM TO_TIMESTAMP(COALESCE(exit_time_ms, entry_time_ms) / 1000.0) AT TIME ZONE 'UTC')::int AS hour_of_day,
          COALESCE(SUM(profit), 0)::float8 AS pnl
         FROM trades
        WHERE account_id = $1
          AND COALESCE(exit_time_ms, entry_time_ms) BETWEEN $2 AND $3
        GROUP BY 1
        ORDER BY 1 ASC`,
      [account_id, from_time_ms, to_time_ms]
    );
    return result.rows;
  },

  async summarizeMonthCalendar(
    account_id: string,
    from_time_ms: number,
    to_time_ms: number
  ): Promise<Array<{ day: number; pnl: number; trades: number; wins: number }>> {
    const result = await query(
      `SELECT
          FLOOR((exit_time_ms - $2) / 86400000.0)::int + 1 AS day,
          COALESCE(SUM(profit), 0)::float8 AS pnl,
          COUNT(*)::int AS trades,
          COUNT(*) FILTER (WHERE profit > 0)::int AS wins
         FROM trades
        WHERE account_id = $1
          AND exit_time_ms IS NOT NULL
          AND exit_time_ms BETWEEN $2 AND $3
        GROUP BY 1
        ORDER BY 1 ASC`,
      [account_id, from_time_ms, to_time_ms]
    );
    return result.rows;
  },

  async summarizeYearCalendar(
    account_id: string,
    year: number
  ): Promise<Array<{ month: number; pnl: number; trades: number; wins: number }>> {
    const result = await query(
      `SELECT
          EXTRACT(MONTH FROM TO_TIMESTAMP(exit_time_ms / 1000.0))::int AS month,
          COALESCE(SUM(profit), 0)::float8 AS pnl,
          COUNT(*)::int AS trades,
          COUNT(*) FILTER (WHERE profit > 0)::int AS wins
         FROM trades
        WHERE account_id = $1
          AND exit_time_ms IS NOT NULL
          AND EXTRACT(YEAR FROM TO_TIMESTAMP(exit_time_ms / 1000.0)) = $2
        GROUP BY 1
        ORDER BY 1 ASC`,
      [account_id, year]
    );
    return result.rows;
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
