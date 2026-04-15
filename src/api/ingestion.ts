import { Router, Request, Response } from 'express';
import { validateRequestBody, ingestPayloadSchema, ingestHealthPayloadSchema } from '../middleware/validation.js';
import { validateIngestionAuth } from '../middleware/auth.js';
import { accountQueries, tradeQueries, invalidateBreakevenCache } from '../db/queries.js';
import { transaction } from '../db/connection.js';
import { Trade } from '../types/index.js';
import { updateAccountCache } from '../services/positionCache.js';
import { bufferSnapshot } from '../services/writeBuffer.js';
import { emitHistoryUpdate } from '../services/historyEvents.js';

const router = Router();
const MIN_INGEST_INTERVAL_MS = 0;
const HISTORY_CHUNK_SIZE = 200;
const DEFAULT_BREAKEVEN_TOLERANCE_FLOOR = 1.0;
const DEFAULT_BREAKEVEN_TOLERANCE_MAX = 5.0;

const resolveAccountId = (req: Request) => String(req.accountId || req.body?.account_number || '').trim();

const resolveSourceIp = (req: Request) => {
  const forwardedForHeader = req.headers['x-forwarded-for'];
  const forwardedFor = Array.isArray(forwardedForHeader) ? forwardedForHeader[0] : forwardedForHeader;
  return String(forwardedFor || req.ip || req.socket?.remoteAddress || '-').trim();
};

const requireSharedSecret = () => {
  const sharedSecret = process.env.CONNECTOR_SHARED_SECRET;
  if (!sharedSecret) {
    throw new Error('CONNECTOR_SHARED_SECRET is not configured');
  }
  return sharedSecret;
};

const resolveBreakevenToleranceFloor = () => {
  const configured = Number(process.env.BREAKEVEN_TOLERANCE_FLOOR);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_BREAKEVEN_TOLERANCE_FLOOR;
};

const resolveBreakevenToleranceMax = (floor: number) => {
  const configured = Number(process.env.BREAKEVEN_TOLERANCE_MAX);
  const effective = Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_BREAKEVEN_TOLERANCE_MAX;
  return Math.max(effective, floor);
};

const classifyTradeResult = (profit: number, breakevenTolerance: number): Trade['result'] => {
  if (profit > breakevenTolerance) {
    return 'win';
  }
  if (profit < -breakevenTolerance) {
    return 'loss';
  }
  return 'breakeven';
};

const asFiniteNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

router.post(
  '/health',
  validateIngestionAuth,
  validateRequestBody(ingestHealthPayloadSchema),
  async (req: Request, res: Response) => {
    try {
      const accountId = resolveAccountId(req);

      const account = await accountQueries.findById(accountId);
      const serverHistoryHash = String(account?.last_history_hash || '');
      const clientHistoryHash = String(req.body.history_hash || '').trim();
      const historySyncRequired = !account || serverHistoryHash.length === 0 || serverHistoryHash !== clientHistoryHash;

      res.status(200).json({
        status: 'ok',
        sync_id: req.body.sync_id,
        account_id: accountId,
        server_history_hash: serverHistoryHash,
        history_sync_required: historySyncRequired,
      });
    } catch (error) {
      console.error('Ingestion health endpoint error:', error);
      res.status(500).json({ status: 'error', error: 'Ingestion health check failed' });
    }
  }
);

/**
 * POST /api/ingestion
 * EA sends sync data here every N seconds
 * Requires HMAC-SHA256 signed request
 */
router.post(
  '/',
  validateIngestionAuth,
  validateRequestBody(ingestPayloadSchema),
  async (req: Request, res: Response) => {
    try {
      const accountId = resolveAccountId(req);
      const sharedSecret = requireSharedSecret();

      const account = await accountQueries.ensureByAccountNumber(accountId, sharedSecret);
      const nowMs = Date.now();
      const minIngestIntervalMs = MIN_INGEST_INTERVAL_MS;
      const sinceLastIngestMs = account.last_ingest_received_at ? (nowMs - Number(account.last_ingest_received_at)) : Number.MAX_SAFE_INTEGER;
      const serverHistoryHash = String(account.last_history_hash || '');
      const clientHistoryHash = String(req.body.history_hash || '').trim();

      const sourceIp = resolveSourceIp(req);

      if (sinceLastIngestMs < minIngestIntervalMs) {
        console.log(
          `[INGEST] throttled account=${accountId} ip=${sourceIp} retry_after_ms=${minIngestIntervalMs - sinceLastIngestMs}`
        );
        return res.status(200).json({
          status: 'throttled',
          sync_id: req.body.sync_id,
          account_id: accountId,
          min_ingest_interval_ms: minIngestIntervalMs,
          retry_after_ms: minIngestIntervalMs - sinceLastIngestMs,
          server_history_hash: serverHistoryHash,
          history_sync_required: clientHistoryHash.length > 0 && serverHistoryHash !== clientHistoryHash,
        });
      }

      console.log(
        `[INGEST] account=${accountId} sync_id=${req.body.sync_id || '-'} ip=${sourceIp} positions=${req.body.positions?.length || 0} closed_trades=${req.body.closed_trades?.length || 0}`
      );

      const {
        positions,
        closed_trades,
        account: accountData,
        sync_id,
        ea_latest_closed_time_ms,
        ea_latest_closed_deal_id,
        include_history,
      } = req.body;
      const shouldIncludeHistory = include_history !== false;
      const breakevenToleranceFloor = resolveBreakevenToleranceFloor();
      const breakevenToleranceMax = resolveBreakevenToleranceMax(breakevenToleranceFloor);
      const breakevenTolerance = await tradeQueries.getBreakevenTolerance(accountId, breakevenToleranceFloor, breakevenToleranceMax);
      const dayStartMs = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
      const dayEndMs = new Date(new Date().setHours(23, 59, 59, 999)).getTime();

      // ── HOT PATH: purely in-memory, zero I/O ─────────────────────────────
      // Store full position objects in cache; fires SSE push immediately.
      // Positions never touch the DB here — they live in memory until shutdown.
      updateAccountCache(
        accountId,
        positions.map((p: any) => ({
          account_id: accountId,
          symbol: p.symbol,
          size: p.volume,
          direction: p.direction,
          entry_price: p.open_price,
          current_price: p.current_price ?? p.open_price,
          avg_sl: p.avg_sl ?? null,
          avg_tp: p.avg_tp ?? null,
          tick_size: p.tick_size ?? null,
          tick_value: p.tick_value ?? null,
          unrealized_pnl: p.pnl,
          open_time_ms: p.open_time_ms,
        }))
      );

      // Snapshot (daily equity/balance record) — idempotent day-keyed upsert, buffered at 5s.
      // The trade count query is fire-and-forget: the buffer flushes 5s later so the query
      // always completes well before the flush, and we don't need to block the response for it.
      const safeEquity = asFiniteNumber(accountData?.equity, 0);
      const safeBalance = asFiniteNumber(accountData?.balance, 0);
      const snapshotDate = new Date().toISOString().split('T')[0];
      tradeQueries.summarizeByExitRange(accountId, dayStartMs, dayEndMs, breakevenTolerance)
        .then((daySummary) => {
          bufferSnapshot({
            account_id: accountId,
            date: snapshotDate,
            snapshot_time_ms: nowMs,
            equity: safeEquity,
            balance: safeBalance,
            return_pct: safeBalance > 0 ? ((safeEquity - safeBalance) / safeBalance) * 100 : 0,
            trades_count: daySummary.trades_count,
            wins: daySummary.wins,
            losses: daySummary.losses,
          });
        })
        .catch((err) => console.error('[INGEST] snapshot query failed:', err));

      // ── CRITICAL PATH: trades + accounting state (still synchronous) ─────────
      // Closed trades are the permanent record; write them immediately.
      // Transaction is now tiny: just N trade inserts + 2 account row updates.
      const savedIngestion = await transaction(async (client) => {
        if (shouldIncludeHistory) {
          for (const trade of closed_trades) {
            const tradeRecord: Omit<Trade, 'id'> = {
              account_id: accountId,
              symbol: trade.symbol,
              size: trade.volume,
              entry_price: trade.entry,
              exit_price: trade.exit,
              profit: trade.profit,
              profit_pct: trade.volume > 0 && trade.entry > 0 ? (trade.profit / (trade.volume * trade.entry)) * 100 : 0,
              entry_time_ms: trade.entry_time_ms,
              exit_time_ms: trade.exit_time_ms,
              duration_sec: trade.duration_sec,
              result: classifyTradeResult(trade.profit, breakevenTolerance),
              close_method: trade.method,
            };
            await tradeQueries.insertTrade(tradeRecord, client);
          }
        }

        await accountQueries.updateWatermarks(
          accountId,
          ea_latest_closed_deal_id,
          ea_latest_closed_time_ms,
          client
        );

        return accountQueries.updateIngestionState(
          accountId,
          nowMs,
          shouldIncludeHistory && clientHistoryHash.length > 0 ? clientHistoryHash : undefined,
          client
        );
      });

      // Invalidate cached breakeven tolerance when new trades were committed so
      // the next analytics request gets a fresh PERCENTILE_CONT computation.
      if (shouldIncludeHistory && closed_trades.length > 0) {
        invalidateBreakevenCache(accountId);
        emitHistoryUpdate(accountId);
      }

      // Persist identity/display fields for existing accounts.
      const nickname = String(accountData?.nickname || '').trim();
      const accountName = String(accountData?.account_name || nickname).trim();
      const broker = String(accountData?.broker || '').trim();
      if (nickname || accountName || broker) {
        await accountQueries.updateIdentity(accountId, {
          nickname: nickname || undefined,
          account_name: accountName || undefined,
          broker: broker || undefined,
        });
      }

      // Check for history backfill needs
      const accountLastClosedMs = Number(account.last_closed_time_ms || 0);
      const historyStatus = ea_latest_closed_time_ms > accountLastClosedMs ? 'up_to_date' : 'backfill_required';
      const effectiveServerHistoryHash = String(savedIngestion?.last_history_hash || account.last_history_hash || '');

      res.status(200).json({
        status: 'ok',
        sync_id,
        account_id: accountId,
        history_status: historyStatus,
        from_time_ms: historyStatus === 'backfill_required' ? accountLastClosedMs : undefined,
        chunk_size: HISTORY_CHUNK_SIZE,
        min_ingest_interval_ms: minIngestIntervalMs,
        server_history_hash: effectiveServerHistoryHash,
        history_sync_required: clientHistoryHash.length > 0 && effectiveServerHistoryHash !== clientHistoryHash,
      });
    } catch (error) {
      if ((error as any)?.code === 'ACCOUNT_SECRET_MISMATCH') {
        return res.status(403).json({ status: 'error', error: 'Account secret mismatch' });
      }
      console.error(
        `[INGEST] endpoint_error account=${resolveAccountId(req)} sync_id=${req.body?.sync_id || '-'} ip=${resolveSourceIp(req)}`,
        error
      );
      res.status(500).json({ status: 'error', error: 'Ingestion failed' });
    }
  }
);

/**
 * POST /api/ingestion/backfill
 * EA sends closed trade history chunks for backfill
 */
router.post(
  '/backfill',
  validateIngestionAuth,
  validateRequestBody(ingestPayloadSchema),
  async (req: Request, res: Response) => {
    try {
      const accountId = resolveAccountId(req);
      const sharedSecret = requireSharedSecret();
      await accountQueries.ensureByAccountNumber(accountId, sharedSecret);
      const { closed_trades, sync_id } = req.body;
      const breakevenToleranceFloor = resolveBreakevenToleranceFloor();
      const breakevenToleranceMax = resolveBreakevenToleranceMax(breakevenToleranceFloor);
      const breakevenTolerance = await tradeQueries.getBreakevenTolerance(accountId, breakevenToleranceFloor, breakevenToleranceMax);

      // Build all trade records first, then insert in a single batch statement.
      const tradeRecords: Array<Omit<Trade, 'id'>> = closed_trades.map((trade: any) => ({
        account_id: accountId,
        symbol: trade.symbol,
        size: trade.volume,
        entry_price: trade.entry,
        exit_price: trade.exit,
        profit: trade.profit,
        profit_pct: trade.volume > 0 && trade.entry > 0 ? (trade.profit / (trade.volume * trade.entry)) * 100 : 0,
        entry_time_ms: trade.entry_time_ms,
        exit_time_ms: trade.exit_time_ms,
        duration_sec: trade.duration_sec,
        result: classifyTradeResult(trade.profit, breakevenTolerance),
        close_method: trade.method,
      }));
      await tradeQueries.insertTradeBatch(tradeRecords);

      // Invalidate cached tolerance so the next analytics request reflects new history.
      if (tradeRecords.length > 0) {
        invalidateBreakevenCache(accountId);
        emitHistoryUpdate(accountId);
      }

      res.status(200).json({
        status: 'ok',
        sync_id,
        trades_inserted: closed_trades.length,
      });
    } catch (error) {
      if ((error as any)?.code === 'ACCOUNT_SECRET_MISMATCH') {
        return res.status(403).json({ status: 'error', error: 'Account secret mismatch' });
      }
      console.error(
        `[INGEST] backfill_error account=${resolveAccountId(req)} sync_id=${req.body?.sync_id || '-'} ip=${resolveSourceIp(req)}`,
        error
      );
      res.status(500).json({ status: 'error', error: 'Backfill failed' });
    }
  }
);

export default router;
