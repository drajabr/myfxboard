import { Router, Request, Response } from 'express';
import { accountQueries, positionQueries, tradeQueries, snapshotQueries } from '../db/queries.js';
import { DashboardSummary } from '../types/index.js';

const router = Router();

const toNum = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizePosition = (p: any) => ({
  ...p,
  size: toNum(p.size),
  direction: toNum(p.direction),
  entry_price: toNum(p.entry_price),
  current_price: p.current_price === null ? null : toNum(p.current_price),
  avg_sl: p.avg_sl === null ? null : toNum(p.avg_sl),
  avg_tp: p.avg_tp === null ? null : toNum(p.avg_tp),
  unrealized_pnl: toNum(p.unrealized_pnl),
  open_time_ms: toNum(p.open_time_ms),
  updated_at_ms: toNum(p.updated_at_ms),
});

const normalizeTrade = (t: any) => ({
  ...t,
  size: toNum(t.size),
  entry_price: toNum(t.entry_price),
  exit_price: t.exit_price === null ? null : toNum(t.exit_price),
  profit: toNum(t.profit),
  profit_pct: toNum(t.profit_pct),
  entry_time_ms: toNum(t.entry_time_ms),
  exit_time_ms: t.exit_time_ms === null ? null : toNum(t.exit_time_ms),
  duration_sec: toNum(t.duration_sec),
});

const normalizeSnapshot = (s: any) => ({
  ...s,
  snapshot_time_ms: toNum(s.snapshot_time_ms),
  equity: toNum(s.equity),
  balance: toNum(s.balance),
  return_pct: toNum(s.return_pct),
  trades_count: toNum(s.trades_count),
  wins: toNum(s.wins),
  losses: toNum(s.losses),
});

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

const buildEmptyAnalyticsResponse = (
  accountIdParam: string,
  nowMs: number,
  monthShift: number,
  yearShift: number
) => {
  const monthBase = new Date(nowMs);
  monthBase.setMonth(monthBase.getMonth() + monthShift);
  const monthYear = monthBase.getFullYear();
  const monthIdx = monthBase.getMonth();
  const daysInMonth = new Date(monthYear, monthIdx + 1, 0).getDate();

  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => ({
    day,
    pnl: 0,
    trades: 0,
  }));

  const yearBase = new Date(nowMs);
  yearBase.setFullYear(yearBase.getFullYear() + yearShift);
  const targetYear = yearBase.getFullYear();
  const yearMonths = Array.from({ length: 12 }, (_, i) => i + 1).map((month) => ({
    month,
    pnl: 0,
    trades: 0,
  }));

  const zeroPeriod = {
    pnl: 0,
    trades_count: 0,
    wins: 0,
    losses: 0,
    win_rate_pct: 0,
  };

  return {
    scope: 'all',
    account_id: accountIdParam,
    summary: {
      accounts_count: 0,
      open_positions: 0,
      equity: 0,
      balance: 0,
      floating_pnl: 0,
    },
    periods: {
      today: zeroPeriod,
      last7d: zeroPeriod,
      last30d: zeroPeriod,
      ytd: zeroPeriod,
      all_time: zeroPeriod,
    },
    trade_metrics: {
      win_rate_pct: 0,
      avg_win: 0,
      avg_loss: 0,
      max_win: 0,
      max_loss: 0,
      avg_hold_seconds: 0,
    },
    positions: [],
    recent_trades: [],
    trades_total_matching: 0,
    trades_returned: 0,
    filtered_distribution: { wins: 0, losses: 0, neutral: 0 },
    filtered_daily_pnl: [],
    equity_curve: [],
    symbol_exposure: [],
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
  };
};

router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const accountIdParam = (req.query.accountId as string) || 'all';
    const curveDays = Math.min(parseInt(req.query.days as string, 10) || 90, 3650);
    const recentTradesLimit = Math.min(Math.max(parseInt(req.query.recentTradesLimit as string, 10) || 10, 1), 500);
    const monthShift = parseInt(req.query.monthShift as string, 10) || 0;
    const yearShift = parseInt(req.query.yearShift as string, 10) || 0;
    const tradeFromMs = Number(req.query.tradeFromMs);
    const tradeToMs = Number(req.query.tradeToMs);
    const hasTradeFilter = Number.isFinite(tradeFromMs) || Number.isFinite(tradeToMs);
    const nowMs = Date.now();

    const allAccounts = await accountQueries.list();
    const accountIds = accountIdParam === 'all'
      ? allAccounts.map((a) => a.account_id)
      : allAccounts.filter((a) => a.account_id === accountIdParam).map((a) => a.account_id);

    if (accountIds.length === 0) {
      if (accountIdParam === 'all') {
        return res.json(buildEmptyAnalyticsResponse(accountIdParam, nowMs, monthShift, yearShift));
      }
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
      const [accPositionsRaw, accTradesRaw, latestSnapshotRaw, snapshotsRaw] = await Promise.all([
        positionQueries.findByAccount(accountId),
        tradeQueries.findAllByAccount(accountId),
        snapshotQueries.findLatestByAccount(accountId),
        snapshotQueries.findByAccountAndRange(accountId, fromMs, toMs),
      ]);

      const accPositions = accPositionsRaw.map(normalizePosition);
      const accTrades = accTradesRaw.map(normalizeTrade);
      const latestSnapshot = latestSnapshotRaw ? normalizeSnapshot(latestSnapshotRaw) : null;
      const snapshots = snapshotsRaw.map(normalizeSnapshot);

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
    const sortedTrades = trades
      .slice()
      .sort((a, b) => (b.exit_time_ms || b.entry_time_ms) - (a.exit_time_ms || a.entry_time_ms));

    const filteredTrades = sortedTrades.filter((t) => {
      const ts = t.exit_time_ms || t.entry_time_ms || 0;
      if (Number.isFinite(tradeFromMs) && ts < tradeFromMs) {
        return false;
      }
      if (Number.isFinite(tradeToMs) && ts > tradeToMs) {
        return false;
      }
      return true;
    });
    const recentTrades = filteredTrades.slice(0, recentTradesLimit);
    const distribution = {
      wins: filteredTrades.filter((t) => (t.profit || 0) > 0).length,
      losses: filteredTrades.filter((t) => (t.profit || 0) < 0).length,
      neutral: filteredTrades.filter((t) => (t.profit || 0) === 0).length,
    };

    const dailySource = hasTradeFilter
      ? filteredTrades
      : filteredTrades.filter((t) => {
          const ts = t.exit_time_ms || t.entry_time_ms || 0;
          return ts >= (nowMs - (30 * 24 * 60 * 60 * 1000));
        });

    const filteredDailyMap = new Map<string, number>();
    dailySource.forEach((t) => {
      const ts = t.exit_time_ms || t.entry_time_ms || 0;
      if (!ts) {
        return;
      }
      const key = dayKey(ts);
      filteredDailyMap.set(key, (filteredDailyMap.get(key) || 0) + (t.profit || 0));
    });
    const filteredDailyPnl = Array.from(filteredDailyMap.entries())
      .map(([date, pnl]) => ({ date, pnl }))
      .sort((a, b) => a.date.localeCompare(b.date));

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
      },
      periods,
      trade_metrics: tradeMetrics,
      positions,
      recent_trades: recentTrades,
      trades_total_matching: filteredTrades.length,
      trades_returned: recentTrades.length,
      filtered_distribution: distribution,
      filtered_daily_pnl: filteredDailyPnl,
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

    const positionsRaw = await positionQueries.findByAccount(accountId);
    const recentTradesRaw = await tradeQueries.findRecentByAccount(accountId, 20);
    const latestSnapshotRaw = await snapshotQueries.findLatestByAccount(accountId);

    const positions = positionsRaw.map(normalizePosition);
    const recentTrades = recentTradesRaw.map(normalizeTrade);
    const latestSnapshot = latestSnapshotRaw ? normalizeSnapshot(latestSnapshotRaw) : null;

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
    res.json(positions.map(normalizePosition));
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
    res.json(trades.map(normalizeTrade));
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

    const snapshots = (await snapshotQueries.findByAccountAndRange(accountId, fromMs, toMs)).map(normalizeSnapshot);
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
