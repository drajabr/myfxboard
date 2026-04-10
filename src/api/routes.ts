import { Router, Request, Response } from 'express';
import { accountQueries, positionQueries, tradeQueries, snapshotQueries } from '../db/queries.js';
import { DashboardSummary } from '../types/index.js';

const router = Router();

const getRangeStart = (label: 'today' | 'last7d' | 'last30d' | 'ytd' | 'all_time', nowMs: number) => {
  const now = new Date(nowMs);
  if (label === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  if (label === 'last7d') {
    return nowMs - (7 * 24 * 60 * 60 * 1000);
  }
  if (label === 'last30d') {
    return nowMs - (30 * 24 * 60 * 60 * 1000);
  }
  if (label === 'ytd') {
    return new Date(now.getFullYear(), 0, 1).getTime();
  }
  return 0;
};

const calcPeriodStats = (
  trades: Array<{ profit: number | null; exit_time_ms: number | null }>,
  fromMs: number,
  toMs: number
) => {
  const inRange = trades.filter((t) => {
    if (t.exit_time_ms === null) {
      return false;
    }
    return t.exit_time_ms >= fromMs && t.exit_time_ms <= toMs;
  });
  const pnl = inRange.reduce((sum, t) => sum + (t.profit || 0), 0);
  const wins = inRange.filter((t) => (t.profit || 0) > 0).length;
  const losses = inRange.filter((t) => (t.profit || 0) < 0).length;
  const tradesCount = inRange.length;
  return {
    pnl,
    trades_count: tradesCount,
    wins,
    losses,
    win_rate_pct: tradesCount > 0 ? (wins / tradesCount) * 100 : 0,
  };
};

const calcTradeMetrics = (
  trades: Array<{ profit: number | null; duration_sec: number | null }>
) => {
  const closed = trades.filter((t) => t.profit !== null);
  const wins = closed.filter((t) => (t.profit || 0) > 0).map((t) => t.profit || 0);
  const losses = closed.filter((t) => (t.profit || 0) < 0).map((t) => t.profit || 0);
  const durations = closed.map((t) => t.duration_sec || 0).filter((d) => d > 0);
  const tradesCount = closed.length;
  const winsCount = wins.length;

  return {
    win_rate_pct: tradesCount > 0 ? (winsCount / tradesCount) * 100 : 0,
    avg_win: wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0,
    avg_loss: losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
    max_win: wins.length > 0 ? Math.max(...wins) : 0,
    max_loss: losses.length > 0 ? Math.min(...losses) : 0,
    avg_hold_seconds: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
  };
};

const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const accountIdParam = (req.query.accountId as string) || 'all';
    const curveDays = Math.min(parseInt(req.query.days as string, 10) || 90, 3650);
    const monthShift = parseInt(req.query.monthShift as string, 10) || 0;
    const yearShift = parseInt(req.query.yearShift as string, 10) || 0;
    const nowMs = Date.now();

    const allAccounts = await accountQueries.list();
    const accountIds = accountIdParam === 'all'
      ? allAccounts.map((a) => a.account_id)
      : allAccounts.filter((a) => a.account_id === accountIdParam).map((a) => a.account_id);

    if (accountIds.length === 0) {
      return res.status(404).json({ error: 'No matching accounts found' });
    }

    let positions: any[] = [];
    let trades: any[] = [];
    let equity = 0;
    let balance = 0;

    const toMs = nowMs;
    const fromMs = toMs - (curveDays * 24 * 60 * 60 * 1000);
    const curveByDay = new Map<string, { ts: number; equity: number }>();

    for (const accountId of accountIds) {
      const [accPositions, accTrades, latestSnapshot, snapshots] = await Promise.all([
        positionQueries.findByAccount(accountId),
        tradeQueries.findAllByAccount(accountId),
        snapshotQueries.findLatestByAccount(accountId),
        snapshotQueries.findByAccountAndRange(accountId, fromMs, toMs),
      ]);

      positions = positions.concat(accPositions);
      trades = trades.concat(accTrades);
      equity += latestSnapshot?.equity || latestSnapshot?.balance || 0;
      balance += latestSnapshot?.balance || 0;

      snapshots.forEach((s) => {
        const key = dayKey(s.snapshot_time_ms);
        const existing = curveByDay.get(key);
        if (!existing) {
          curveByDay.set(key, { ts: s.snapshot_time_ms, equity: s.equity });
        } else {
          existing.equity += s.equity;
          if (s.snapshot_time_ms > existing.ts) {
            existing.ts = s.snapshot_time_ms;
          }
        }
      });
    }

    const floatingPnl = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
    const freeMargin = Math.max(0, equity - Math.max(0, floatingPnl));
    const marginLevelPct = equity > 0 ? (freeMargin / equity) * 100 : 0;
    const recentTrades = trades
      .slice()
      .sort((a, b) => (b.exit_time_ms || b.entry_time_ms) - (a.exit_time_ms || a.entry_time_ms))
      .slice(0, 50);

    const periods = {
      today: calcPeriodStats(trades, getRangeStart('today', nowMs), nowMs),
      last7d: calcPeriodStats(trades, getRangeStart('last7d', nowMs), nowMs),
      last30d: calcPeriodStats(trades, getRangeStart('last30d', nowMs), nowMs),
      ytd: calcPeriodStats(trades, getRangeStart('ytd', nowMs), nowMs),
      all_time: calcPeriodStats(trades, getRangeStart('all_time', nowMs), nowMs),
    };

    const tradeMetrics = calcTradeMetrics(trades);

    const exposureMap = new Map<string, number>();
    positions.forEach((p) => {
      exposureMap.set(p.symbol, (exposureMap.get(p.symbol) || 0) + Math.abs(p.size || 0));
    });
    const symbolExposure = Array.from(exposureMap.entries())
      .map(([symbol, size]) => ({ symbol, size }))
      .sort((a, b) => b.size - a.size);

    const monthBase = new Date();
    monthBase.setMonth(monthBase.getMonth() + monthShift);
    const monthYear = monthBase.getFullYear();
    const monthIdx = monthBase.getMonth();
    const monthStart = new Date(monthYear, monthIdx, 1).getTime();
    const monthEnd = new Date(monthYear, monthIdx + 1, 0, 23, 59, 59, 999).getTime();
    const daysInMonth = new Date(monthYear, monthIdx + 1, 0).getDate();

    const monthDayMap = new Map<number, { pnl: number; trades: number }>();
    trades.forEach((t) => {
      const ts = t.exit_time_ms;
      if (!ts || ts < monthStart || ts > monthEnd) {
        return;
      }
      const d = new Date(ts).getDate();
      const existing = monthDayMap.get(d) || { pnl: 0, trades: 0 };
      existing.pnl += t.profit || 0;
      existing.trades += 1;
      monthDayMap.set(d, existing);
    });

    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => ({
      day,
      pnl: monthDayMap.get(day)?.pnl || 0,
      trades: monthDayMap.get(day)?.trades || 0,
    }));

    const yearBase = new Date();
    yearBase.setFullYear(yearBase.getFullYear() + yearShift);
    const targetYear = yearBase.getFullYear();
    const yearMonthMap = new Map<number, { pnl: number; trades: number }>();
    trades.forEach((t) => {
      const ts = t.exit_time_ms;
      if (!ts) {
        return;
      }
      const d = new Date(ts);
      if (d.getFullYear() !== targetYear) {
        return;
      }
      const m = d.getMonth() + 1;
      const existing = yearMonthMap.get(m) || { pnl: 0, trades: 0 };
      existing.pnl += t.profit || 0;
      existing.trades += 1;
      yearMonthMap.set(m, existing);
    });

    const yearMonths = Array.from({ length: 12 }, (_, i) => i + 1).map((month) => ({
      month,
      pnl: yearMonthMap.get(month)?.pnl || 0,
      trades: yearMonthMap.get(month)?.trades || 0,
    }));

    const equityCurve = Array.from(curveByDay.values()).sort((a, b) => a.ts - b.ts);

    res.json({
      scope: accountIdParam === 'all' ? 'all' : 'single',
      account_id: accountIdParam,
      summary: {
        accounts_count: accountIds.length,
        open_positions: positions.length,
        equity,
        balance,
        floating_pnl: floatingPnl,
        margin_level_pct: marginLevelPct,
      },
      periods,
      trade_metrics: tradeMetrics,
      positions,
      recent_trades: recentTrades,
      equity_curve: equityCurve,
      symbol_exposure: symbolExposure,
      calendars: {
        monthly: {
          title: `${monthBase.toLocaleString('default', { month: 'long' })} ${monthYear}`,
          year: monthYear,
          month: monthIdx + 1,
          first_weekday: new Date(monthYear, monthIdx, 1).getDay(),
          days: monthDays,
        },
        yearly: {
          title: `${targetYear}`,
          year: targetYear,
          months: yearMonths,
        },
      },
    });
  } catch (error) {
    console.error('Analytics endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

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
    const totalEquity = latestSnapshot?.equity || latestSnapshot?.balance || 0;
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
