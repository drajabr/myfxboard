import { Router, Request, Response } from 'express';
import { validateRequestBody, ingestPayloadSchema } from '../middleware/validation.js';
import { validateIngestionAuth } from '../middleware/auth.js';
import { accountQueries, positionQueries, tradeQueries, snapshotQueries } from '../db/queries.js';
import { Trade } from '../types/index.js';

const router = Router();
const DEFAULT_MIN_INGEST_INTERVAL_MS = 3000;

const resolveAccountId = (req: Request) => String(req.accountId || req.body?.account_number || '').trim();

const assertSharedSecret = (res: Response) => {
  const sharedSecret = process.env.CONNECTOR_SHARED_SECRET;
  if (!sharedSecret) {
    res.status(500).json({ status: 'error', error: 'CONNECTOR_SHARED_SECRET is not configured' });
    return null;
  }
  return sharedSecret;
};

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
      const sharedSecret = assertSharedSecret(res);
      if (!sharedSecret) {
        return;
      }

      const account = await accountQueries.ensureByAccountNumber(accountId, sharedSecret);
      const nowMs = Date.now();
      const minIngestIntervalMs = Math.max(
        parseInt(process.env.SYNC_MIN_INGEST_INTERVAL_MS || `${DEFAULT_MIN_INGEST_INTERVAL_MS}`, 10) || DEFAULT_MIN_INGEST_INTERVAL_MS,
        0
      );
      const sinceLastIngestMs = account.last_ingest_received_at ? (nowMs - Number(account.last_ingest_received_at)) : Number.MAX_SAFE_INTEGER;
      const serverHistoryHash = String(account.last_history_hash || '');
      const clientHistoryHash = String(req.body.history_hash || '').trim();

      if (sinceLastIngestMs < minIngestIntervalMs) {
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

      console.log(`[INGEST] Account: ${accountId}, positions: ${req.body.positions?.length || 0}, closed_trades: ${req.body.closed_trades?.length || 0}`);

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

      // Positions payload is a full snapshot; clear stale rows first.
      await positionQueries.deleteByAccount(accountId);

      // Reinsert current open positions.
      for (const pos of positions) {
        await positionQueries.upsertPosition({
          account_id: accountId,
          symbol: pos.symbol,
          size: pos.volume,
          direction: pos.pnl >= 0 ? 'BUY' : 'SELL',
          entry_price: pos.open_price,
          current_price: pos.open_price,
          avg_sl: pos.avg_sl,
          avg_tp: pos.avg_tp,
          unrealized_pnl: pos.pnl,
          open_time_ms: pos.open_time_ms,
        });
      }

      // Closed trades are append-only per account; duplicates are ignored by DB constraint.
      // Never delete here because payloads may be partial (multi-account sync cadence).
      if (shouldIncludeHistory) {
        for (const trade of closed_trades) {
          const tradeRecord: Omit<Trade, 'id'> = {
            account_id: accountId,
            symbol: trade.symbol,
            size: trade.volume,
            entry_price: trade.entry,
            exit_price: trade.exit,
            profit: trade.profit,
            profit_pct: trade.volume > 0 ? (trade.profit / (trade.volume * trade.entry)) * 100 : 0,
            entry_time_ms: trade.entry_time_ms,
            exit_time_ms: trade.exit_time_ms,
            duration_sec: trade.duration_sec,
            result: trade.profit > 0 ? 'win' : trade.profit < 0 ? 'loss' : 'breakeven',
            close_method: trade.method,
          };
          await tradeQueries.insertTrade(tradeRecord);
        }
      }

      // Create daily snapshot
      const today = new Date().toISOString().split('T')[0];
      await snapshotQueries.insertSnapshot({
        account_id: accountId,
        date: today,
        snapshot_time_ms: Date.now(),
        equity: accountData.equity,
        balance: accountData.balance,
        return_pct: accountData.equity > 0 ? ((accountData.equity - accountData.balance) / accountData.balance) * 100 : 0,
        trades_count: closed_trades.length,
        wins: closed_trades.filter(t => t.profit > 0).length,
        losses: closed_trades.filter(t => t.profit < 0).length,
      });

      // Update account watermarks
      await accountQueries.updateWatermarks(
        accountId,
        ea_latest_closed_deal_id,
        ea_latest_closed_time_ms
      );

      const savedIngestion = await accountQueries.updateIngestionState(
        accountId,
        nowMs,
        shouldIncludeHistory && clientHistoryHash.length > 0 ? clientHistoryHash : undefined
      );

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
        chunk_size: parseInt(process.env.SYNC_HISTORY_CHUNK_SIZE || '100'),
        min_ingest_interval_ms: minIngestIntervalMs,
        server_history_hash: effectiveServerHistoryHash,
        history_sync_required: clientHistoryHash.length > 0 && effectiveServerHistoryHash !== clientHistoryHash,
      });
    } catch (error) {
      console.error('Ingestion endpoint error:', error);
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
      const sharedSecret = assertSharedSecret(res);
      if (!sharedSecret) {
        return;
      }
      await accountQueries.ensureByAccountNumber(accountId, sharedSecret);
      const { closed_trades, sync_id } = req.body;

      // Insert closed trades (idempotent -- duplicates rejected)
      for (const trade of closed_trades) {
        const tradeRecord: Omit<Trade, 'id'> = {
          account_id: accountId,
          symbol: trade.symbol,
          size: trade.volume,
          entry_price: trade.entry,
          exit_price: trade.exit,
          profit: trade.profit,
          profit_pct: trade.volume > 0 ? (trade.profit / (trade.volume * trade.entry)) * 100 : 0,
          entry_time_ms: trade.entry_time_ms,
          exit_time_ms: trade.exit_time_ms,
          duration_sec: trade.duration_sec,
          result: trade.profit > 0 ? 'win' : trade.profit < 0 ? 'loss' : 'breakeven',
          close_method: trade.method,
        };
        await tradeQueries.insertTrade(tradeRecord);
      }

      res.status(200).json({
        status: 'ok',
        sync_id,
        trades_inserted: closed_trades.length,
      });
    } catch (error) {
      console.error('Backfill endpoint error:', error);
      res.status(500).json({ status: 'error', error: 'Backfill failed' });
    }
  }
);

export default router;
