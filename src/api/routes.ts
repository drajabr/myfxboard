import { Router, Request, Response } from 'express';
import { accountQueries, positionQueries, tradeQueries, snapshotQueries } from '../db/queries.js';
import { DashboardSummary } from '../types/index.js';

const router = Router();

/**
 * GET /api/account/:accountId/dashboard
 * Readonly endpoint - returns aggregated dashboard data
 */
router.get('/:accountId/dashboard', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    const account = await accountQueries.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const positions = await positionQueries.findByAccount(accountId);
    const recentTrades = await tradeQueries.findRecentByAccount(accountId, 20);
    const latestSnapshot = await snapshotQueries.findLatestByAccount(accountId);

    // Calculate aggregates
    let totalEquity = account.equity || 0;
    const floatingPnL = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
    const todaysPnL = latestSnapshot?.losses ? (latestSnapshot.wins || 0) - Math.abs(latestSnapshot.losses || 0) : 0;

    const dashboard: DashboardSummary = {
      summary: {
        equity: totalEquity,
        balance: latestSnapshot?.balance || 0,
        free_margin: Math.max(0, totalEquity - (positions.length > 0 ? floatingPnL : 0)),
        used_margin: positions.length > 0 ? floatingPnL : 0,
        current_pnl: floatingPnL,
        current_return_pct: totalEquity > 0 ? (floatingPnL / totalEquity) * 100 : 0,
        risk_reward_ratio: 1.5,
      },
      positions,
      todays_stats: {
        trades_count: latestSnapshot?.trades_count || 0,
        wins: latestSnapshot?.wins || 0,
        losses: latestSnapshot?.losses || 0,
        win_rate_pct: latestSnapshot?.trades_count ? ((latestSnapshot.wins || 0) / latestSnapshot.trades_count) * 100 : 0,
        daily_pnl: todaysPnL,
        largest_win: Math.max(...recentTrades.map(t => t.profit || 0), 0),
        largest_loss: Math.min(...recentTrades.map(t => t.profit || 0), 0),
      },
      charts: {
        equity_curve: [], // TODO: fetch from snapshots table
        returns: { daily: [], weekly: [], monthly: [] },
      },
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/account/:accountId/positions
 * Returns open positions
 */
router.get('/:accountId/positions', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const positions = await positionQueries.findByAccount(accountId);
    res.json(positions);
  } catch (error) {
    console.error('Positions endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

/**
 * GET /api/account/:accountId/trades
 * Returns recent closed trades with pagination
 */
router.get('/:accountId/trades', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const trades = await tradeQueries.findRecentByAccount(accountId, limit);
    res.json(trades);
  } catch (error) {
    console.error('Trades endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

/**
 * GET /api/account/:accountId/equity-curve
 * Returns daily equity snapshots for charting
 */
router.get('/:accountId/equity-curve', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const fromDays = parseInt(req.query.days as string) || 90;
    const toMs = Date.now();
    const fromMs = toMs - (fromDays * 24 * 60 * 60 * 1000);

    const snapshots = await snapshotQueries.findByAccountAndRange(accountId, fromMs, toMs);
    const curveData = snapshots.map(s => ({ ts: s.snapshot_time_ms, equity: s.equity }));

    res.json({ data: curveData, period_days: fromDays });
  } catch (error) {
    console.error('Equity curve endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch equity curve' });
  }
});

/**
 * GET /api/accounts
 * List all linked accounts (readonly)
 */
router.get('', async (_req: Request, res: Response) => {
  try {
    const accounts = await accountQueries.list();
    // Strip secret hashes
    const safe = accounts.map(a => ({
      account_id: a.account_id,
      account_name: a.account_name,
      created_at: a.created_at,
      last_sync_at: a.last_sync_at,
    }));
    res.json(safe);
  } catch (error) {
    console.error('Accounts list error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

export default router;
