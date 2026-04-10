import { Router, Request, Response } from 'express';
import { accountQueries, positionQueries, tradeQueries, snapshotQueries } from '../db/queries.js';
import { DashboardSummary } from '../types/index.js';

const router = Router();
const DEFAULT_BREAKEVEN_TOLERANCE_FLOOR = 1.0;
const DEFAULT_BREAKEVEN_TOLERANCE_MAX = 5.0;

const resolveBreakevenToleranceFloor = () => {
  const configured = Number(process.env.BREAKEVEN_TOLERANCE_FLOOR);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_BREAKEVEN_TOLERANCE_FLOOR;
};

const resolveBreakevenToleranceMax = (floor: number) => {
  const configured = Number(process.env.BREAKEVEN_TOLERANCE_MAX);
  const effective = Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_BREAKEVEN_TOLERANCE_MAX;
  return Math.max(effective, floor);
};

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
  direction: String(p.direction || ''),
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

const buildFlatZeroCurve = (days: number, nowMs: number) => {
  const totalDays = Math.min(Math.max(days, 2), 3650);
  const points: Array<{ ts: number; equity: number }> = [];
  for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
    const ts = new Date(nowMs - (offset * 24 * 60 * 60 * 1000)).setHours(0, 0, 0, 0);
    points.push({ ts, equity: 0 });
  }
  return points;
};

const buildFlatZeroBalanceCurve = (days: number, nowMs: number) => {
  const totalDays = Math.min(Math.max(days, 2), 3650);
  const points: Array<{ ts: number; balance: number }> = [];
  for (let offset = totalDays - 1; offset >= 0; offset -= 1) {
    const ts = new Date(nowMs - (offset * 24 * 60 * 60 * 1000)).setHours(0, 0, 0, 0);
    points.push({ ts, balance: 0 });
  }
  return points;
};

const buildEmptyAnalyticsResponse = (
  accountIdParam: string,
  nowMs: number,
  monthShift: number,
  yearShift: number,
  curveDays: number
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
      expectancy: 0,
      profit_factor: 0,
      avg_hold_seconds: 0,
    },
    positions: [],
    recent_trades: [],
    trades_total_matching: 0,
    trades_returned: 0,
    filtered_summary: { pnl: 0, trades_count: 0, wins: 0, losses: 0, neutral: 0, breakeven: 0 },
    filtered_distribution: { wins: 0, losses: 0, neutral: 0, breakeven: 0 },
    filtered_direction_distribution: { longs: 0, shorts: 0, unknown: 0 },
    filtered_direction_outcome_distribution: {
      long_wins: 0,
      long_losses: 0,
      long_neutral: 0,
      short_wins: 0,
      short_losses: 0,
      short_neutral: 0,
    },
    filtered_daily_pnl: [],
    alltime_daily_pnl: [],
    pnl_by_day_of_week: [],
    pnl_by_hour_of_day: [],
    trade_pnl_curve: [],
    equity_curve: buildFlatZeroCurve(curveDays, nowMs),
    balance_curve: buildFlatZeroBalanceCurve(curveDays, nowMs),
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

    let accountIds: string[] = [];
    if (accountIdParam === 'all') {
      const allAccounts = await accountQueries.list();
      accountIds = allAccounts.map((a) => a.account_id);
    } else {
      const account = await accountQueries.findById(accountIdParam);
      accountIds = account ? [account.account_id] : [];
    }

    if (accountIds.length === 0) {
      if (accountIdParam === 'all') {
        return res.json(buildEmptyAnalyticsResponse(accountIdParam, nowMs, monthShift, yearShift, curveDays));
      }
      return res.status(404).json({ error: 'No matching accounts found' });
    }

    let positions: any[] = [];
    let recentTradesPool: any[] = [];
    let equity = 0;
    let balance = 0;
    const tradeCurveEvents: Array<{ ts: number; pnl: number }> = [];

    const filteredDailyMap = new Map<string, number>();
    const allTimeDailyMap = new Map<string, number>();
    const dayOfWeekMap = new Map<number, number>();
    const hourOfDayMap = new Map<number, number>();
    const monthDayMap = new Map<number, { pnl: number; trades: number }>();
    const yearMonthMap = new Map<number, { pnl: number; trades: number }>();

    const filterStartMs = Number.isFinite(tradeFromMs) ? tradeFromMs : 0;
    const filterEndMs = Number.isFinite(tradeToMs) ? tradeToMs : nowMs;
    const breakevenToleranceFloor = resolveBreakevenToleranceFloor();
    const breakevenToleranceMax = resolveBreakevenToleranceMax(breakevenToleranceFloor);
    const dailyPnlStartMs = hasTradeFilter ? filterStartMs : Math.max(nowMs - (30 * 24 * 60 * 60 * 1000), 0);
    const dailyPnlEndMs = hasTradeFilter ? filterEndMs : nowMs;
    const groupedPnlStartMs = hasTradeFilter ? filterStartMs : 0;
    const groupedPnlEndMs = hasTradeFilter ? filterEndMs : nowMs;
    const todayStartMs = getRangeStart('today', nowMs);
    const last7dStartMs = getRangeStart('last7d', nowMs);
    const last30dStartMs = getRangeStart('last30d', nowMs);
    const ytdStartMs = getRangeStart('ytd', nowMs);

    const periodBuckets = {
      today: { pnl: 0, trades_count: 0, wins: 0, losses: 0 },
      last7d: { pnl: 0, trades_count: 0, wins: 0, losses: 0 },
      last30d: { pnl: 0, trades_count: 0, wins: 0, losses: 0 },
      ytd: { pnl: 0, trades_count: 0, wins: 0, losses: 0 },
      all_time: { pnl: 0, trades_count: 0, wins: 0, losses: 0 },
    };
    const metricsTotals = {
      trade_count: 0,
      win_count: 0,
      loss_count: 0,
      avg_win_sum: 0,
      avg_win_count: 0,
      avg_loss_sum: 0,
      avg_loss_count: 0,
      max_win: 0,
      max_loss: 0,
      expectancy_sum: 0,
      gross_profit: 0,
      gross_loss: 0,
      hold_sum: 0,
      hold_count: 0,
    };
    let filteredTradesTotal = 0;
    const filteredSummaryTotals = { pnl: 0, trades_count: 0, wins: 0, losses: 0, neutral: 0 };
    const distribution = { wins: 0, losses: 0, neutral: 0 };
    const directionDistribution = { longs: 0, shorts: 0, unknown: 0 };
    const directionOutcomeDistribution = {
      long_wins: 0,
      long_losses: 0,
      long_neutral: 0,
      short_wins: 0,
      short_losses: 0,
      short_neutral: 0,
    };

    const monthBase = new Date();
    monthBase.setMonth(monthBase.getMonth() + monthShift);
    const monthYear = monthBase.getFullYear();
    const monthIdx = monthBase.getMonth();
    const monthStart = new Date(monthYear, monthIdx, 1).getTime();
    const monthEnd = new Date(monthYear, monthIdx + 1, 0, 23, 59, 59, 999).getTime();
    const daysInMonth = new Date(monthYear, monthIdx + 1, 0).getDate();

    const yearBase = new Date();
    yearBase.setFullYear(yearBase.getFullYear() + yearShift);
    const targetYear = yearBase.getFullYear();

    for (const accountId of accountIds) {
      const breakevenTolerance = await tradeQueries.getBreakevenTolerance(accountId, breakevenToleranceFloor, breakevenToleranceMax);
      const [
        accPositionsRaw,
        latestSnapshotRaw,
        recentTradesRaw,
        curveTradesRaw,
        filteredCount,
        filteredSummary,
        filteredDirectionSummary,
        filteredDirectionOutcomeSummary,
        filteredDailyRows,
        allTimeDailyRows,
        dayOfWeekRows,
        hourOfDayRows,
        monthRows,
        yearRows,
        metricsRow,
        todayStats,
        last7dStats,
        last30dStats,
        ytdStats,
        allTimeStats,
      ] = await Promise.all([
        positionQueries.findByAccount(accountId),
        snapshotQueries.findLatestByAccount(accountId),
        tradeQueries.findWindowedByEventTime(accountId, filterStartMs, filterEndMs, recentTradesLimit),
        tradeQueries.findByEventTimeRange(accountId, filterStartMs, filterEndMs),
        tradeQueries.countByEventTimeRange(accountId, filterStartMs, filterEndMs),
        tradeQueries.summarizeByEventTimeRange(accountId, filterStartMs, filterEndMs, breakevenTolerance),
        tradeQueries.summarizeDirectionDistributionByEventTimeRange(accountId, filterStartMs, filterEndMs),
        tradeQueries.summarizeDirectionOutcomeDistributionByEventTimeRange(accountId, filterStartMs, filterEndMs, breakevenTolerance),
        tradeQueries.summarizeDailyPnlByEventTimeRange(accountId, dailyPnlStartMs, dailyPnlEndMs),
        tradeQueries.summarizeDailyPnlAllTimeByEventTime(accountId),
        tradeQueries.summarizePnlByDayOfWeekByEventTimeRange(accountId, groupedPnlStartMs, groupedPnlEndMs),
        tradeQueries.summarizePnlByHourOfDayByEventTimeRange(accountId, groupedPnlStartMs, groupedPnlEndMs),
        tradeQueries.summarizeMonthCalendar(accountId, monthStart, monthEnd),
        tradeQueries.summarizeYearCalendar(accountId, targetYear),
        tradeQueries.summarizeMetrics(accountId, breakevenTolerance),
        tradeQueries.summarizeByEventTimeRange(accountId, todayStartMs, nowMs, breakevenTolerance),
        tradeQueries.summarizeByEventTimeRange(accountId, last7dStartMs, nowMs, breakevenTolerance),
        tradeQueries.summarizeByEventTimeRange(accountId, last30dStartMs, nowMs, breakevenTolerance),
        tradeQueries.summarizeByEventTimeRange(accountId, ytdStartMs, nowMs, breakevenTolerance),
        tradeQueries.summarizeByEventTimeRange(accountId, 0, nowMs, breakevenTolerance),
      ]);

      const accPositions = accPositionsRaw.map(normalizePosition);
      const accRecentTrades = recentTradesRaw.map(normalizeTrade);
  const curveTrades = curveTradesRaw.map(normalizeTrade);
      const latestSnapshot = latestSnapshotRaw ? normalizeSnapshot(latestSnapshotRaw) : null;

      positions = positions.concat(accPositions);
      recentTradesPool = recentTradesPool.concat(accRecentTrades);
      equity += latestSnapshot?.equity || latestSnapshot?.balance || 0;
      balance += latestSnapshot?.balance || 0;
      filteredTradesTotal += filteredCount;
      filteredSummaryTotals.pnl += toNum(filteredSummary.pnl);
      filteredSummaryTotals.trades_count += toNum(filteredSummary.trades_count);
      filteredSummaryTotals.wins += toNum(filteredSummary.wins);
      filteredSummaryTotals.losses += toNum(filteredSummary.losses);
      filteredSummaryTotals.neutral += toNum(filteredSummary.neutral);
      distribution.wins += filteredSummary.wins || 0;
      distribution.losses += filteredSummary.losses || 0;
      distribution.neutral += filteredSummary.neutral || 0;
      directionDistribution.longs += filteredDirectionSummary.longs || 0;
      directionDistribution.shorts += filteredDirectionSummary.shorts || 0;
      directionDistribution.unknown += filteredDirectionSummary.unknown || 0;
      directionOutcomeDistribution.long_wins += filteredDirectionOutcomeSummary.long_wins || 0;
      directionOutcomeDistribution.long_losses += filteredDirectionOutcomeSummary.long_losses || 0;
      directionOutcomeDistribution.long_neutral += filteredDirectionOutcomeSummary.long_neutral || 0;
      directionOutcomeDistribution.short_wins += filteredDirectionOutcomeSummary.short_wins || 0;
      directionOutcomeDistribution.short_losses += filteredDirectionOutcomeSummary.short_losses || 0;
      directionOutcomeDistribution.short_neutral += filteredDirectionOutcomeSummary.short_neutral || 0;

      metricsTotals.trade_count += metricsRow.trade_count || 0;
      metricsTotals.win_count += metricsRow.win_count || 0;
      metricsTotals.loss_count += metricsRow.loss_count || 0;
      metricsTotals.avg_win_sum += (metricsRow.avg_win || 0) * (metricsRow.win_count || 0);
      metricsTotals.avg_win_count += metricsRow.win_count || 0;
      metricsTotals.avg_loss_sum += (metricsRow.avg_loss || 0) * (metricsRow.loss_count || 0);
      metricsTotals.avg_loss_count += metricsRow.loss_count || 0;
      metricsTotals.max_win = Math.max(metricsTotals.max_win, metricsRow.max_win || 0);
      metricsTotals.max_loss = metricsTotals.trade_count === (metricsRow.trade_count || 0)
        ? (metricsRow.max_loss || 0)
        : Math.min(metricsTotals.max_loss, metricsRow.max_loss || 0);
      metricsTotals.expectancy_sum += (metricsRow.expectancy || 0) * (metricsRow.trade_count || 0);
      metricsTotals.gross_profit += metricsRow.gross_profit || 0;
      metricsTotals.gross_loss += metricsRow.gross_loss || 0;
      metricsTotals.hold_sum += (metricsRow.avg_hold_seconds || 0) * (metricsRow.trade_count || 0);
      metricsTotals.hold_count += metricsRow.trade_count || 0;

      periodBuckets.today.pnl += todayStats.pnl || 0;
      periodBuckets.today.trades_count += todayStats.trades_count || 0;
      periodBuckets.today.wins += todayStats.wins || 0;
      periodBuckets.today.losses += todayStats.losses || 0;

      periodBuckets.last7d.pnl += last7dStats.pnl || 0;
      periodBuckets.last7d.trades_count += last7dStats.trades_count || 0;
      periodBuckets.last7d.wins += last7dStats.wins || 0;
      periodBuckets.last7d.losses += last7dStats.losses || 0;

      periodBuckets.last30d.pnl += last30dStats.pnl || 0;
      periodBuckets.last30d.trades_count += last30dStats.trades_count || 0;
      periodBuckets.last30d.wins += last30dStats.wins || 0;
      periodBuckets.last30d.losses += last30dStats.losses || 0;

      periodBuckets.ytd.pnl += ytdStats.pnl || 0;
      periodBuckets.ytd.trades_count += ytdStats.trades_count || 0;
      periodBuckets.ytd.wins += ytdStats.wins || 0;
      periodBuckets.ytd.losses += ytdStats.losses || 0;

      periodBuckets.all_time.pnl += allTimeStats.pnl || 0;
      periodBuckets.all_time.trades_count += allTimeStats.trades_count || 0;
      periodBuckets.all_time.wins += allTimeStats.wins || 0;
      periodBuckets.all_time.losses += allTimeStats.losses || 0;

      filteredDailyRows.forEach((row) => {
        filteredDailyMap.set(row.date, (filteredDailyMap.get(row.date) || 0) + toNum(row.pnl));
      });

      allTimeDailyRows.forEach((row) => {
        allTimeDailyMap.set(row.date, (allTimeDailyMap.get(row.date) || 0) + toNum(row.pnl));
      });

      dayOfWeekRows.forEach((row) => {
        const key = toNum(row.day_of_week);
        dayOfWeekMap.set(key, (dayOfWeekMap.get(key) || 0) + toNum(row.pnl));
      });

      hourOfDayRows.forEach((row) => {
        const key = toNum(row.hour_of_day);
        hourOfDayMap.set(key, (hourOfDayMap.get(key) || 0) + toNum(row.pnl));
      });

      monthRows.forEach((row) => {
        const existing = monthDayMap.get(row.day) || { pnl: 0, trades: 0 };
        existing.pnl += toNum(row.pnl);
        existing.trades += toNum(row.trades);
        monthDayMap.set(row.day, existing);
      });

      yearRows.forEach((row) => {
        const existing = yearMonthMap.get(row.month) || { pnl: 0, trades: 0 };
        existing.pnl += toNum(row.pnl);
        existing.trades += toNum(row.trades);
        yearMonthMap.set(row.month, existing);
      });

      curveTrades.forEach((trade) => {
        const ts = toNum(trade.exit_time_ms || trade.entry_time_ms, 0);
        if (!ts) {
          return;
        }
        tradeCurveEvents.push({
          ts,
          pnl: toNum(trade.profit),
        });
      });
    }

    const floatingPnl = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
    const recentTrades = recentTradesPool
      .slice()
      .sort((a, b) => (b.exit_time_ms || b.entry_time_ms) - (a.exit_time_ms || a.entry_time_ms))
      .slice(0, recentTradesLimit);
    const filteredDailyPnl = Array.from(filteredDailyMap.entries())
      .map(([date, pnl]) => ({ date, pnl }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const allTimeDailyPnl = Array.from(allTimeDailyMap.entries())
      .map(([date, pnl]) => ({ date, pnl }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const pnlByDayOfWeek = Array.from(dayOfWeekMap.entries())
      .map(([day_of_week, pnl]) => ({ day_of_week, pnl }))
      .sort((a, b) => a.day_of_week - b.day_of_week);
    const pnlByHourOfDay = Array.from(hourOfDayMap.entries())
      .map(([hour_of_day, pnl]) => ({ hour_of_day, pnl }))
      .sort((a, b) => a.hour_of_day - b.hour_of_day);

    const periods = {
      today: {
        ...periodBuckets.today,
        win_rate_pct: periodBuckets.today.trades_count > 0 ? (periodBuckets.today.wins / periodBuckets.today.trades_count) * 100 : 0,
      },
      last7d: {
        ...periodBuckets.last7d,
        win_rate_pct: periodBuckets.last7d.trades_count > 0 ? (periodBuckets.last7d.wins / periodBuckets.last7d.trades_count) * 100 : 0,
      },
      last30d: {
        ...periodBuckets.last30d,
        win_rate_pct: periodBuckets.last30d.trades_count > 0 ? (periodBuckets.last30d.wins / periodBuckets.last30d.trades_count) * 100 : 0,
      },
      ytd: {
        ...periodBuckets.ytd,
        win_rate_pct: periodBuckets.ytd.trades_count > 0 ? (periodBuckets.ytd.wins / periodBuckets.ytd.trades_count) * 100 : 0,
      },
      all_time: {
        ...periodBuckets.all_time,
        win_rate_pct: periodBuckets.all_time.trades_count > 0 ? (periodBuckets.all_time.wins / periodBuckets.all_time.trades_count) * 100 : 0,
      },
    };

    const tradeMetrics = metricsTotals.trade_count > 0 ? {
      win_rate_pct: (metricsTotals.win_count / metricsTotals.trade_count) * 100,
      avg_win: metricsTotals.avg_win_count > 0 ? metricsTotals.avg_win_sum / metricsTotals.avg_win_count : 0,
      avg_loss: metricsTotals.avg_loss_count > 0 ? metricsTotals.avg_loss_sum / metricsTotals.avg_loss_count : 0,
      max_win: metricsTotals.max_win,
      max_loss: metricsTotals.max_loss,
      expectancy: metricsTotals.expectancy_sum / metricsTotals.trade_count,
      profit_factor: metricsTotals.gross_loss > 0 ? metricsTotals.gross_profit / metricsTotals.gross_loss : (metricsTotals.gross_profit > 0 ? 999 : 0),
      avg_hold_seconds: metricsTotals.hold_count > 0 ? metricsTotals.hold_sum / metricsTotals.hold_count : 0,
    } : {
      win_rate_pct: 0,
      avg_win: 0,
      avg_loss: 0,
      max_win: 0,
      max_loss: 0,
      expectancy: 0,
      profit_factor: 0,
      avg_hold_seconds: 0,
    };

    const exposureMap = new Map<string, number>();
    positions.forEach((p) => {
      exposureMap.set(p.symbol, (exposureMap.get(p.symbol) || 0) + Math.abs(p.size || 0));
    });
    const symbolExposure = Array.from(exposureMap.entries())
      .map(([symbol, size]) => ({ symbol, size }))
      .sort((a, b) => b.size - a.size);

    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => ({
      day,
      pnl: monthDayMap.get(day)?.pnl || 0,
      trades: monthDayMap.get(day)?.trades || 0,
    }));

    const yearMonths = Array.from({ length: 12 }, (_, i) => i + 1).map((month) => ({
      month,
      pnl: yearMonthMap.get(month)?.pnl || 0,
      trades: yearMonthMap.get(month)?.trades || 0,
    }));

    const tradePnlCurve = tradeCurveEvents
      .slice()
      .sort((a, b) => a.ts - b.ts)
      .reduce<Array<{ ts: number; pnl: number; cumulative_pnl: number }>>((acc, point) => {
        const previous = acc.length > 0 ? acc[acc.length - 1].cumulative_pnl : 0;
        acc.push({
          ts: point.ts,
          pnl: point.pnl,
          cumulative_pnl: previous + point.pnl,
        });
        return acc;
      }, []);

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
      trades_total_matching: filteredTradesTotal,
      trades_returned: recentTrades.length,
      filtered_summary: {
        pnl: toNum(filteredSummaryTotals.pnl),
        trades_count: toNum(filteredSummaryTotals.trades_count),
        wins: toNum(filteredSummaryTotals.wins),
        losses: toNum(filteredSummaryTotals.losses),
        neutral: toNum(filteredSummaryTotals.neutral),
        breakeven: toNum(filteredSummaryTotals.neutral),
      },
      filtered_distribution: {
        ...distribution,
        breakeven: toNum(distribution.neutral),
      },
      filtered_direction_distribution: directionDistribution,
      filtered_direction_outcome_distribution: directionOutcomeDistribution,
      filtered_daily_pnl: filteredDailyPnl,
      alltime_daily_pnl: allTimeDailyPnl,
      pnl_by_day_of_week: pnlByDayOfWeek,
      pnl_by_hour_of_day: pnlByHourOfDay,
      trade_pnl_curve: tradePnlCurve,
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

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [positionsRaw, recentTradesRaw, latestSnapshotRaw, todayTradesRaw] = await Promise.all([
      positionQueries.findByAccount(accountId),
      tradeQueries.findRecentByAccount(accountId, 20),
      snapshotQueries.findLatestByAccount(accountId),
      tradeQueries.findByExitRange(accountId, startOfDay.getTime(), Date.now()),
    ]);

    const positions = positionsRaw.map(normalizePosition);
    const recentTrades = recentTradesRaw.map(normalizeTrade);
    const latestSnapshot = latestSnapshotRaw ? normalizeSnapshot(latestSnapshotRaw) : null;

    const todaysTrades = todayTradesRaw.map(normalizeTrade);
    const todaysPnL = todaysTrades
      .reduce((sum, t) => sum + (t.profit || 0), 0);

    // Calculate aggregates
    const totalEquity = latestSnapshot?.equity || latestSnapshot?.balance || 0;
    const floatingPnL = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);

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
      last_ingest_received_at: a.last_ingest_received_at,
      history_in_sync: a.history_in_sync,
    }));
    res.json(safe);
  } catch (error) {
    console.error('Accounts list error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

export default router;
