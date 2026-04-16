import { Router, Request, Response } from 'express';
import { accountQueries, positionQueries, tradeQueries, snapshotQueries } from '../db/queries.js';
import { DashboardSummary } from '../types/index.js';
import { pnlEmitter, getAggregated, getAggregatedPositions, getPositions } from '../services/positionCache.js';
import { historyEmitter } from '../services/historyEvents.js';

const router = Router();
const DEFAULT_BREAKEVEN_TOLERANCE_FLOOR = 1.0;
const DEFAULT_BREAKEVEN_TOLERANCE_MAX = 5.0;
const HISTOGRAM_BIN_COUNT = 30;
const DURATION_BUCKETS = [
  { key: 'lt5m', label: '<5m', minSec: 0, maxSec: 5 * 60 },
  { key: 'm5to15', label: '5m-15m', minSec: 5 * 60, maxSec: 15 * 60 },
  { key: 'm15to60', label: '15m-1h', minSec: 15 * 60, maxSec: 60 * 60 },
  { key: 'h1to4', label: '1h-4h', minSec: 60 * 60, maxSec: 4 * 60 * 60 },
  { key: 'h4to24', label: '4h-24h', minSec: 4 * 60 * 60, maxSec: 24 * 60 * 60 },
  { key: 'gte24h', label: '24h+', minSec: 24 * 60 * 60, maxSec: Number.POSITIVE_INFINITY },
];

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

const normalizeTrade = (t: any) => ({
  ...t,
  symbol: normalizeSymbol(t.symbol),
  size: toNum(t.size),
  entry_price: toNum(t.entry_price),
  exit_price: t.exit_price === null ? null : toNum(t.exit_price),
  profit: toNum(t.profit),
  profit_pct: toNum(t.profit_pct),
  entry_time_ms: toNum(t.entry_time_ms),
  exit_time_ms: t.exit_time_ms === null ? null : toNum(t.exit_time_ms),
  duration_sec: toNum(t.duration_sec),
});


// --- Symbol normalization logic (matches frontend) ---
const SYMBOL_ALIASES: Record<string, string> = {
  // Precious Metals
  'GOLD': 'XAUUSD', 'GLD': 'XAUUSD', 'GC': 'XAUUSD',
  'SILVER': 'XAGUSD', 'SLV': 'XAGUSD', 'SI': 'XAGUSD',
  'PLATINUM': 'XPTUSD', 'PL': 'XPTUSD',
  'PALLADIUM': 'XPDUSD', 'PA': 'XPDUSD',
  'COPPER': 'XCUUSD', 'HG': 'XCUUSD',
  // US Indices
  'DJ30': 'US30', 'DJI30': 'US30', 'DOWJONES30': 'US30', 'DJIA': 'US30', 'WS30': 'US30', 'YM': 'US30', 'DOW30': 'US30', 'USA30': 'US30',
  'USTEC': 'NAS100', 'US100': 'NAS100', 'NDX100': 'NAS100', 'USTECH': 'NAS100', 'NQ100': 'NAS100', 'NSDQ100': 'NAS100', 'NQ': 'NAS100', 'NASDAQ100': 'NAS100', 'NDX': 'NAS100', 'USTEC100': 'NAS100', 'USTECH100': 'NAS100', 'NDAQ': 'NAS100',
  'SP500': 'SPX500', 'US500': 'SPX500', 'ES': 'SPX500', 'SPX': 'SPX500', 'USA500': 'SPX500',
  'RUSS2000': 'US2000', 'RUSSELL2000': 'US2000', 'RTY': 'US2000',
  // EU Indices
  'DE30': 'DE40', 'DAX40': 'DE40', 'DAX30': 'DE40', 'GER40': 'DE40', 'GER30': 'DE40', 'GDAXI': 'DE40', 'GERMANY40': 'DE40', 'GRXEUR': 'DE40',
  'FTSE100': 'UK100', 'FTSE': 'UK100', 'UKX': 'UK100',
  'FRA40': 'FR40', 'CAC40': 'FR40', 'FCHI40': 'FR40', 'FRANCE40': 'FR40',
  'EUSTX50': 'EU50', 'STOX50': 'EU50', 'STOXX50E': 'EU50', 'EURO50': 'EU50', 'SX5E': 'EU50', 'EUROSTOXX50': 'EU50',
  'SPN35': 'ES35', 'IBEX35': 'ES35', 'ESP35': 'ES35', 'SPAIN35': 'ES35',
  'FTMIB': 'IT40', 'ITA40': 'IT40', 'ITALY40': 'IT40',
  // Asia-Pac
  'NI225': 'JP225', 'NIKKEI225': 'JP225', 'NIKKEI': 'JP225', 'NK225': 'JP225', 'JPN225': 'JP225', 'NKD': 'JP225', 'JAPAN225': 'JP225',
  'HSI50': 'HK50', 'HSI': 'HK50', 'HANGSENG': 'HK50', 'HKG33': 'HK50', 'HONGKONG50': 'HK50',
  'AU200': 'AUS200', 'ASX200': 'AUS200', 'AUSTRALIA200': 'AUS200',
  'CN50': 'CHINA50', 'CHINAA50': 'CHINA50', 'FTXIN9': 'CHINA50',
  'NIFTY50': 'INDIA50',
  // Energy
  'WTI': 'USOIL', 'CRUDEOIL': 'USOIL', 'CLOIL': 'USOIL', 'CL': 'USOIL', 'XTIUSD': 'USOIL', 'USCRUDE': 'USOIL', 'WTIUSD': 'USOIL', 'OILUSD': 'USOIL', 'OIL': 'USOIL', 'OILWTI': 'USOIL', 'USOUSD': 'USOIL', 'EXTRALIGHT': 'USOIL',
  'BRENT': 'UKOIL', 'BRN': 'UKOIL', 'XBRUSD': 'UKOIL', 'UKCRUDE': 'UKOIL', 'BRENTOIL': 'UKOIL', 'BRT': 'UKOIL', 'OILBRENT': 'UKOIL', 'BRENTUSD': 'UKOIL',
  'NGAS': 'NATGAS', 'XNGUSD': 'NATGAS', 'NATURALGAS': 'NATGAS', 'NG': 'NATGAS',
  // Crypto
  'BITCOIN': 'BTCUSD', 'BTC': 'BTCUSD', 'XBT': 'BTCUSD', 'XBTUSD': 'BTCUSD',
  'ETHEREUM': 'ETHUSD', 'ETH': 'ETHUSD',
  'LITECOIN': 'LTCUSD', 'LTC': 'LTCUSD',
  'RIPPLE': 'XRPUSD', 'XRP': 'XRPUSD',
  'BITCOINCASH': 'BCHUSD', 'BCH': 'BCHUSD', 'BAB': 'BCHUSD',
  'DOGECOIN': 'DOGEUSD', 'DOGUSD': 'DOGEUSD', 'DOGE': 'DOGEUSD',
  'CARDANO': 'ADAUSD', 'ADA': 'ADAUSD',
  'SOLANA': 'SOLUSD', 'SOL': 'SOLUSD',
  'POLKADOT': 'DOTUSD', 'DOT': 'DOTUSD',
};
const SYMBOL_PREFIX_RE = /^(?:#|!|\.|m\.|c\.|e\.|s\.|FX[_:]|CFD[_:]|IDX[_:])/i;
const SYMBOL_SUFFIX_RE = /(?:\.cash|Cash|_SB|_sb|\.ecn|\.raw|\.stp|\.pro|\.prime|\.ndd|\.std|\.stnd|micro|_micro|_mini|\.fx|\.fs|-OTC|mini|cent|eco|pro|raw|\.[a-z]{1,2}|[+!#.\-_]m$|[+!#.\-_]$|_[mMiz]$)/;
function normalizeSymbol(sym: string): string {
  if (!sym) return '';
  let s = sym.trim();
  s = s.replace(SYMBOL_PREFIX_RE, '');
  s = s.replace(SYMBOL_SUFFIX_RE, '');
  s = s.replace(SYMBOL_SUFFIX_RE, '');
  s = s.replace(/[/._\-\s]/g, '').toUpperCase();
  return SYMBOL_ALIASES[s] || s;
}

const normalizePosition = (p: any) => ({
  ...p,
  symbol: normalizeSymbol(p.symbol),
  size: toNum(p.size),
  direction: String(p.direction || ''),
  entry_price: toNum(p.entry_price),
  current_price: p.current_price === null ? null : toNum(p.current_price),
  avg_sl: p.avg_sl === null ? null : toNum(p.avg_sl),
  avg_tp: p.avg_tp === null ? null : toNum(p.avg_tp),
  tick_size: p.tick_size === null || p.tick_size === undefined ? null : toNum(p.tick_size),
  tick_value: p.tick_value === null || p.tick_value === undefined ? null : toNum(p.tick_value),
  margin: p.margin === null || p.margin === undefined ? null : toNum(p.margin),
  unrealized_pnl: toNum(p.unrealized_pnl),
  open_time_ms: toNum(p.open_time_ms),
  updated_at_ms: toNum(p.updated_at_ms),
});

const getDurationBucket = (durationSec: number) => (
  DURATION_BUCKETS.find((bucket) => durationSec >= bucket.minSec && durationSec < bucket.maxSec) || DURATION_BUCKETS[DURATION_BUCKETS.length - 1]
);

const normalizeSnapshot = (s: any) => ({
  ...s,
  equity: toNum(s.equity),
  balance: toNum(s.balance),
  return_pct: toNum(s.return_pct),
  trades_count: toNum(s.trades_count),
  wins: toNum(s.wins),
  losses: toNum(s.losses),
  snapshot_time_ms: toNum(s.snapshot_time_ms),
});

const buildWinRateByTradeDuration = (trades: any[], breakevenTolerance: number) => {
  const rows = DURATION_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    trades: 0,
    wins: 0,
    losses: 0,
    neutral: 0,
    pnl_sum: 0,
  }));
  const rowMap = new Map(rows.map((row) => [row.key, row]));

  trades.forEach((trade) => {
    const durationSec = Math.max(0, toNum(trade.duration_sec));
    const profit = toNum(trade.profit);
    const bucket = getDurationBucket(durationSec);
    const row = rowMap.get(bucket.key);
    if (!row) {
      return;
    }

    row.trades += 1;
    row.pnl_sum += profit;
    if (profit > breakevenTolerance) {
      row.wins += 1;
      return;
    }
    if (profit < -breakevenTolerance) {
      row.losses += 1;
      return;
    }
    row.neutral += 1;
  });

  return rows.map((row) => ({
    label: row.label,
    trades: row.trades,
    wins: row.wins,
    losses: row.losses,
    neutral: row.neutral,
    win_rate_pct: row.trades > 0 ? (row.wins / row.trades) * 100 : 0,
    avg_pnl: row.trades > 0 ? row.pnl_sum / row.trades : 0,
  }));
};

const buildPnlHistogram = (trades: any[], binCount: number = HISTOGRAM_BIN_COUNT) => {
  const profits = trades.map((trade) => toNum(trade.profit)).filter((v) => Number.isFinite(v));
  if (profits.length === 0) {
    return {
      bins: [],
      normal_curve: [],
      stats: {
        min: 0,
        max: 0,
        mean: 0,
        std_dev: 0,
        total_trades: 0,
        bin_size: 0,
        bin_count: binCount,
      },
    };
  }

  let min = Math.min(...profits);
  let max = Math.max(...profits);
  if (min === max) {
    min -= 0.5;
    max += 0.5;
  }

  const totalTrades = profits.length;
  const binSize = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, idx) => ({
    from: min + (idx * binSize),
    to: min + ((idx + 1) * binSize),
    count: 0,
  }));

  profits.forEach((profit) => {
    const rawIndex = Math.floor((profit - min) / binSize);
    const index = Math.max(0, Math.min(binCount - 1, rawIndex));
    bins[index].count += 1;
  });

  const mean = profits.reduce((sum, value) => sum + value, 0) / totalTrades;
  const variance = profits.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / totalTrades;
  const stdDev = Math.sqrt(Math.max(variance, 0));
  const sqrtTwoPi = Math.sqrt(2 * Math.PI);
  const normalCurve = bins.map((bin) => {
    const center = (bin.from + bin.to) / 2;
    if (stdDev <= 1e-9) {
      return { center, expected_count: 0 };
    }
    const z = (center - mean) / stdDev;
    const pdf = Math.exp(-0.5 * (z ** 2)) / (stdDev * sqrtTwoPi);
    return {
      center,
      expected_count: pdf * binSize * totalTrades,
    };
  });

  return {
    bins,
    normal_curve: normalCurve,
    stats: {
      min,
      max,
      mean,
      std_dev: stdDev,
      total_trades: totalTrades,
      bin_size: binSize,
      bin_count: binCount,
    },
  };
};

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
    win_rate_pct: 0,
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
    daily_win_rate_filtered: [],
    daily_win_rate_all_time: [],
    pnl_by_day_of_week: [],
    pnl_by_hour_of_day: [],
    win_rate_by_day_of_week: [],
    win_rate_by_hour_of_day: [],
    win_rate_by_trade_duration: [],
    pnl_histogram: {
      bins: [],
      normal_curve: [],
      stats: {
        min: 0,
        max: 0,
        mean: 0,
        std_dev: 0,
        total_trades: 0,
        bin_size: 0,
        bin_count: HISTOGRAM_BIN_COUNT,
      },
    },
    trade_duration_scatter: [],
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
    const allFilteredTrades: any[] = [];
    let equity = 0;
    let balance = 0;
    let marginUsed = 0;
    const tradeCurveEvents: Array<{ ts: number; pnl: number }> = [];

    const filteredDailyMap = new Map<string, number>();
    const allTimeDailyMap = new Map<string, number>();
    const dayOfWeekMap = new Map<number, number>();
    const hourOfDayMap = new Map<number, number>();
    const dailyWinRateMap = new Map<string, { wins: number; total: number }>();
    const dayOfWeekWinRateMap = new Map<number, { wins: number; total: number }>();
    const hourOfDayWinRateMap = new Map<number, { wins: number; total: number }>();
    const monthDayMap = new Map<number, { pnl: number; trades: number; wins: number }>();
    const yearMonthMap = new Map<number, { pnl: number; trades: number; wins: number }>();

    const filterStartMs = Number.isFinite(tradeFromMs) ? tradeFromMs : 0;
    // Add 24-hour buffer when no explicit filter to include trades with minor broker clock skew
    const filterEndMs = Number.isFinite(tradeToMs) ? tradeToMs : nowMs + (24 * 60 * 60 * 1000);
    const breakevenToleranceFloor = resolveBreakevenToleranceFloor();
    const breakevenToleranceMax = resolveBreakevenToleranceMax(breakevenToleranceFloor);
    let maxAccountBeTolerance = breakevenToleranceFloor;
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

    const monthBase = new Date(nowMs);
    monthBase.setMonth(monthBase.getMonth() + monthShift);
    const monthYear = monthBase.getFullYear();
    const monthIdx = monthBase.getMonth();
    const monthStart = new Date(monthYear, monthIdx, 1).getTime();
    const monthEnd = new Date(monthYear, monthIdx + 1, 0, 23, 59, 59, 999).getTime();
    const daysInMonth = new Date(monthYear, monthIdx + 1, 0).getDate();

    const yearBase = new Date(nowMs);
    yearBase.setFullYear(yearBase.getFullYear() + yearShift);
    const targetYear = yearBase.getFullYear();

    // Fetch all breakeven tolerances in parallel before the account loop so serial
    // awaits don't stack up when there are multiple accounts.
    const toleranceMap = new Map<string, number>();
    await Promise.all(accountIds.map(async (accountId) => {
      const t = await tradeQueries.getBreakevenTolerance(accountId, breakevenToleranceFloor, breakevenToleranceMax);
      toleranceMap.set(accountId, t);
      if (t > maxAccountBeTolerance) maxAccountBeTolerance = t;
    }));

    for (const accountId of accountIds) {
      const breakevenTolerance = toleranceMap.get(accountId)!;
      const [
        accPositionsRaw,
        latestSnapshotRaw,
        recentTradesRaw,
        curveTradesRaw,
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
        allPeriodStats,
      ] = await Promise.all([
        Promise.resolve(getPositions(accountId)),
        snapshotQueries.findLatestByAccount(accountId),
        tradeQueries.findWindowedByEventTime(accountId, filterStartMs, filterEndMs, recentTradesLimit),
        tradeQueries.findByEventTimeRange(accountId, filterStartMs, filterEndMs),
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
        tradeQueries.summarizeAllPeriodStats(accountId, todayStartMs, last7dStartMs, last30dStartMs, ytdStartMs, filterEndMs, breakevenTolerance),
      ]);

      const { today: todayStats, last7d: last7dStats, last30d: last30dStats, ytd: ytdStats, all_time: allTimeStats } = allPeriodStats;

      const accPositions = accPositionsRaw.map(normalizePosition);
      const accRecentTrades = recentTradesRaw.map(normalizeTrade);
        const curveTrades = curveTradesRaw.map(normalizeTrade);
      const latestSnapshot = latestSnapshotRaw ? normalizeSnapshot(latestSnapshotRaw) : null;

      positions = positions.concat(accPositions);
      recentTradesPool = recentTradesPool.concat(accRecentTrades);
      allFilteredTrades.push(...curveTrades);
      equity += latestSnapshot?.equity || latestSnapshot?.balance || 0;
      balance += latestSnapshot?.balance || 0;
      filteredTradesTotal += toNum(filteredSummary.trades_count);
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
        const existing = monthDayMap.get(row.day) || { pnl: 0, trades: 0, wins: 0 };
        existing.pnl += toNum(row.pnl);
        existing.trades += toNum(row.trades);
        existing.wins += toNum((row as any).wins);
        monthDayMap.set(row.day, existing);
      });

      yearRows.forEach((row) => {
        const existing = yearMonthMap.get(row.month) || { pnl: 0, trades: 0, wins: 0 };
        existing.pnl += toNum(row.pnl);
        existing.trades += toNum(row.trades);
        existing.wins += toNum((row as any).wins);
        yearMonthMap.set(row.month, existing);
      });

      curveTrades.forEach((trade) => {
        const ts = toNum(trade.exit_time_ms || trade.entry_time_ms, 0);
        if (!ts) {
          return;
        }
        const dateKey = new Date(ts).toISOString().slice(0, 10);
        const dayKey = new Date(ts).getDay();
        const hourKey = new Date(ts).getHours();
        const profit = toNum(trade.profit);
        const isWin = profit > breakevenTolerance;

        const dailyWr = dailyWinRateMap.get(dateKey) || { wins: 0, total: 0 };
        dailyWr.total += 1;
        if (isWin) {
          dailyWr.wins += 1;
        }
        dailyWinRateMap.set(dateKey, dailyWr);

        const dowWr = dayOfWeekWinRateMap.get(dayKey) || { wins: 0, total: 0 };
        dowWr.total += 1;
        if (isWin) {
          dowWr.wins += 1;
        }
        dayOfWeekWinRateMap.set(dayKey, dowWr);

        const hodWr = hourOfDayWinRateMap.get(hourKey) || { wins: 0, total: 0 };
        hodWr.total += 1;
        if (isWin) {
          hodWr.wins += 1;
        }
        hourOfDayWinRateMap.set(hourKey, hodWr);

        tradeCurveEvents.push({
          ts,
          pnl: profit,
        });
      });
    }

    const floatingPnl = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);

    // Overlay live account data (equity, balance, margin) from position cache if available
    const liveSnap = getAggregated(accountIds);
    if (liveSnap.equity !== undefined && liveSnap.equity > 0) {
      equity = liveSnap.equity;
    }
    if (liveSnap.balance !== undefined && liveSnap.balance > 0) {
      balance = liveSnap.balance;
    }
    marginUsed = liveSnap.marginUsed ?? 0;

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
    const dailyWinRate = Array.from(dailyWinRateMap.entries())
      .map(([date, stats]) => ({
        date,
        trades: stats.total,
        wins: stats.wins,
        win_rate_pct: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const winRateByDayOfWeek = Array.from(dayOfWeekWinRateMap.entries())
      .map(([day_of_week, stats]) => ({
        day_of_week,
        trades: stats.total,
        wins: stats.wins,
        win_rate_pct: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
      }))
      .sort((a, b) => a.day_of_week - b.day_of_week);
    const winRateByHourOfDay = Array.from(hourOfDayWinRateMap.entries())
      .map(([hour_of_day, stats]) => ({
        hour_of_day,
        trades: stats.total,
        wins: stats.wins,
        win_rate_pct: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
      }))
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

    const tradeMetrics = metricsTotals.trade_count > 0 ? (() => {
      const avgWin = metricsTotals.avg_win_count > 0 ? metricsTotals.avg_win_sum / metricsTotals.avg_win_count : 0;
      const avgLoss = metricsTotals.avg_loss_count > 0 ? metricsTotals.avg_loss_sum / metricsTotals.avg_loss_count : 0;
      const avgRr = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : (avgWin > 0 ? 999 : 0);

      // maxDrawdown is computed below as part of the tradePnlCurve reduce (same chronological pass).
      return {
        win_rate_pct: (metricsTotals.win_count / metricsTotals.trade_count) * 100,
        avg_win: avgWin,
        avg_loss: avgLoss,
        max_win: metricsTotals.max_win,
        max_loss: metricsTotals.max_loss,
        expectancy: metricsTotals.expectancy_sum / metricsTotals.trade_count,
        profit_factor: metricsTotals.gross_loss > 0 ? metricsTotals.gross_profit / metricsTotals.gross_loss : (metricsTotals.gross_profit > 0 ? 999 : 0),
        avg_hold_seconds: metricsTotals.hold_count > 0 ? metricsTotals.hold_sum / metricsTotals.hold_count : 0,
        avg_rr: avgRr,
      };
    })() : {
      win_rate_pct: 0,
      avg_win: 0,
      avg_loss: 0,
      max_win: 0,
      max_loss: 0,
      expectancy: 0,
      profit_factor: 0,
      avg_hold_seconds: 0,
      avg_rr: 0,
    };

    const exposureMap = new Map<string, number>();
    positions.forEach((p) => {
      exposureMap.set(p.symbol, (exposureMap.get(p.symbol) || 0) + Math.abs(p.size || 0));
    });
    const symbolExposure = Array.from(exposureMap.entries())
      .map(([symbol, size]) => ({ symbol, size }))
      .sort((a, b) => b.size - a.size);

    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
      const entry = monthDayMap.get(day);
      const trades = entry?.trades || 0;
      const wins = entry?.wins || 0;
      return {
        day,
        pnl: entry?.pnl || 0,
        trades,
        win_rate_pct: trades > 0 ? Math.round((wins / trades) * 1000) / 10 : 0,
      };
    });

    const yearMonths = Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
      const entry = yearMonthMap.get(month);
      const trades = entry?.trades || 0;
      const wins = entry?.wins || 0;
      return {
        month,
        pnl: entry?.pnl || 0,
        trades,
        win_rate_pct: trades > 0 ? Math.round((wins / trades) * 1000) / 10 : 0,
      };
    });

    // tradePnlCurve is already sorted chronologically — compute maxDrawdown in the same
    // pass to avoid a second .slice().sort() over allFilteredTrades.
    let ddPeak = 0;
    let maxDrawdown = 0;
    const tradePnlCurve = tradeCurveEvents
      .slice()
      .sort((a, b) => a.ts - b.ts)
      .reduce<Array<{ ts: number; pnl: number; cumulative_pnl: number }>>((acc, point) => {
        const previous = acc.length > 0 ? acc[acc.length - 1].cumulative_pnl : 0;
        const cumPnl = previous + point.pnl;
        if (cumPnl > ddPeak) ddPeak = cumPnl;
        const dd = ddPeak - cumPnl;
        if (dd > maxDrawdown) maxDrawdown = dd;
        acc.push({ ts: point.ts, pnl: point.pnl, cumulative_pnl: cumPnl });
        return acc;
      }, []);

    const aggregatedBreakevenTolerance = maxAccountBeTolerance;

    // Re-classify all recent trades using the centralized BE tolerance
    for (const t of recentTrades) {
      const profit = toNum(t.profit);
      if (profit > aggregatedBreakevenTolerance) t.result = 'win';
      else if (profit < -aggregatedBreakevenTolerance) t.result = 'loss';
      else t.result = 'breakeven';
    }

    const winRateByTradeDuration = buildWinRateByTradeDuration(allFilteredTrades, aggregatedBreakevenTolerance);
    const pnlHistogram = buildPnlHistogram(allFilteredTrades, HISTOGRAM_BIN_COUNT);

    // Single pass over allFilteredTrades for both tradeDurationScatter and symbolMap.
    const tradeDurationScatter: Array<{ duration_sec: number; profit: number; symbol: string }> = [];
    const symbolMap = new Map<string, { pnl: number; wins: number; losses: number; total: number; win_pnl: number; loss_pnl: number; be_pnl: number }>();
    for (const t of allFilteredTrades) {
      tradeDurationScatter.push({
        duration_sec: Math.max(0, toNum(t.duration_sec)),
        profit: toNum(t.profit),
        symbol: t.symbol || 'Unknown',
      });
      const sym = t.symbol || 'Unknown';
      if (!symbolMap.has(sym)) symbolMap.set(sym, { pnl: 0, wins: 0, losses: 0, total: 0, win_pnl: 0, loss_pnl: 0, be_pnl: 0 });
      const entry = symbolMap.get(sym)!;
      const profit = toNum(t.profit);
      entry.pnl += profit;
      entry.total += 1;
      if (profit > aggregatedBreakevenTolerance) { entry.wins += 1; entry.win_pnl += profit; }
      else if (profit < -aggregatedBreakevenTolerance) { entry.losses += 1; entry.loss_pnl += profit; }
      else { entry.be_pnl += profit; }
    }
    const symbolStats = Array.from(symbolMap.entries())
      .map(([symbol, s]) => ({
        symbol,
        pnl: Math.round(s.pnl * 100) / 100,
        trades: s.total,
        wins: s.wins,
        losses: s.losses,
        win_pnl: Math.round(s.win_pnl * 100) / 100,
        loss_pnl: Math.round(s.loss_pnl * 100) / 100,
        be_pnl: Math.round(s.be_pnl * 100) / 100,
        win_rate_pct: s.total > 0 ? Math.round((s.wins / s.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.trades - a.trades);

    res.json({
      scope: accountIdParam === 'all' ? 'all' : 'single',
      account_id: accountIdParam,
      summary: {
        accounts_count: accountIds.length,
        open_positions: positions.length,
        equity,
        balance,
        floating_pnl: floatingPnl,
        margin_used: marginUsed,
      },
      periods,
      trade_metrics: { ...tradeMetrics, max_drawdown: maxDrawdown },
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
      daily_win_rate_filtered: dailyWinRate,
      daily_win_rate_all_time: dailyWinRate,
      pnl_by_day_of_week: pnlByDayOfWeek,
      pnl_by_hour_of_day: pnlByHourOfDay,
      win_rate_by_day_of_week: winRateByDayOfWeek,
      win_rate_by_hour_of_day: winRateByHourOfDay,
      win_rate_by_trade_duration: winRateByTradeDuration,
      pnl_histogram: pnlHistogram,
      trade_duration_scatter: tradeDurationScatter,
      trade_pnl_curve: tradePnlCurve,
      symbol_exposure: symbolExposure,
      symbol_stats: symbolStats,
      be_tolerance: aggregatedBreakevenTolerance,
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
 * GET /api/account/live-pnl/stream
 * Server-Sent Events stream: pushes floating PnL instantly when ingestion updates positions.
 * Falls back to a 30-second keepalive heartbeat between connector syncs.
 * The client connects once; no repeated DB reads or HTTP polling needed.
 */
router.get('/live-pnl/stream', async (req: Request, res: Response) => {
  try {
    const accountIdParam = (req.query.accountId as string) || 'all';
    let accountIds: string[] = [];
    if (accountIdParam === 'all') {
      const allAccounts = await accountQueries.list();
      accountIds = allAccounts.map((a) => a.account_id);
    } else {
      const account = await accountQueries.findById(accountIdParam);
      accountIds = account ? [account.account_id] : [];
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx proxy buffering
    res.flushHeaders();

    const STREAM_MIN_EMIT_MS = 333;
    const STREAM_BUFFER_MS = 1000;
    const MAX_BUFFERED_EVENTS = Math.max(1, Math.floor(STREAM_BUFFER_MS / STREAM_MIN_EMIT_MS));

    let sendPump: NodeJS.Timeout | null = null;
    let pendingUpdateTs: number[] = [];
    let lastSentAt = 0;

    const send = () => {
      const snap = getAggregated(accountIds);
      const positions = getAggregatedPositions(accountIds).map(normalizePosition);
      res.write(`data: ${JSON.stringify({
        floating_pnl: snap.floatingPnl,
        equity: snap.equity ?? null,
        balance: snap.balance ?? null,
        margin_used: snap.marginUsed ?? null,
        open_positions: snap.openPositions,
        positions,
      })}\n\n`);
      lastSentAt = Date.now();
    };

    const queueUpdate = () => {
      const now = Date.now();
      pendingUpdateTs.push(now);
      const cutoff = now - STREAM_BUFFER_MS;
      pendingUpdateTs = pendingUpdateTs.filter((ts) => ts >= cutoff);
      if (pendingUpdateTs.length > MAX_BUFFERED_EVENTS) {
        pendingUpdateTs = pendingUpdateTs.slice(pendingUpdateTs.length - MAX_BUFFERED_EVENTS);
      }
    };

    // Send current snapshot immediately on connect
    send();

    const onUpdate = (updatedAccountId: string) => {
      if (accountIdParam === 'all' || accountIds.includes(updatedAccountId)) {
        queueUpdate();
      }
    };

    pnlEmitter.on('update', onUpdate);

    sendPump = setInterval(() => {
      if (!pendingUpdateTs.length) {
        return;
      }
      const elapsed = Date.now() - lastSentAt;
      if (elapsed < STREAM_MIN_EMIT_MS) {
        return;
      }
      pendingUpdateTs = [];
      send();
    }, STREAM_MIN_EMIT_MS);
    (sendPump as any).unref?.();

    // Heartbeat keeps the TCP connection alive through proxies (comment line, not a data event)
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25000);

    req.on('close', () => {
      if (sendPump) {
        clearInterval(sendPump);
      }
      clearInterval(heartbeat);
      pnlEmitter.off('update', onUpdate);
    });
  } catch (error) {
    console.error('Live PnL stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to open live PnL stream' });
    }
  }
});

router.get('/history/stream', async (req: Request, res: Response) => {
  try {
    const accountIdParam = (req.query.accountId as string) || 'all';
    let accountIds: string[] = [];
    if (accountIdParam === 'all') {
      const allAccounts = await accountQueries.list();
      accountIds = allAccounts.map((a) => a.account_id);
    } else {
      const account = await accountQueries.findById(accountIdParam);
      accountIds = account ? [account.account_id] : [];
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let scheduledSend: NodeJS.Timeout | null = null;
    let lastSentAt = 0;

    const send = (changedAccountId: string | null = null) => {
      res.write(`data: ${JSON.stringify({ changed: true, account_id: changedAccountId, updated_at_ms: Date.now() })}\n\n`);
      lastSentAt = Date.now();
      scheduledSend = null;
    };

    const scheduleSend = (changedAccountId: string) => {
      const elapsed = Date.now() - lastSentAt;
      if (elapsed >= 250) {
        send(changedAccountId);
        return;
      }
      if (scheduledSend) {
        return;
      }
      scheduledSend = setTimeout(() => send(changedAccountId), 250 - elapsed);
    };

    res.write(': connected\n\n');

    const onUpdate = (updatedAccountId: string) => {
      if (accountIdParam === 'all' || accountIds.includes(updatedAccountId)) {
        scheduleSend(updatedAccountId);
      }
    };

    historyEmitter.on('update', onUpdate);

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25000);

    req.on('close', () => {
      if (scheduledSend) {
        clearTimeout(scheduledSend);
      }
      clearInterval(heartbeat);
      historyEmitter.off('update', onUpdate);
    });
  } catch (error) {
    console.error('History stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to open history stream' });
    }
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

    const dashboardDays = Math.min(Math.max(parseInt(req.query.days as string, 10) || 90, 2), 3650);
    const toMs = Date.now();
    const fromMs = toMs - (dashboardDays * 24 * 60 * 60 * 1000);

    const [recentTradesRaw, latestSnapshotRaw, todayTradesRaw, curveSnapshotsRaw, dbPositionsFallback] = await Promise.all([
      tradeQueries.findRecentByAccount(accountId, 20),
      snapshotQueries.findLatestByAccount(accountId),
      tradeQueries.findByExitRange(accountId, startOfDay.getTime(), Date.now()),
      snapshotQueries.findByAccountAndRange(accountId, fromMs, toMs),
      positionQueries.findByAccount(accountId),
    ]);

    const cachePositionsRaw = getPositions(accountId);
    const positionsRaw = cachePositionsRaw.length > 0 ? cachePositionsRaw : (dbPositionsFallback || []);
    const positions = positionsRaw.map(normalizePosition);
    const recentTrades = recentTradesRaw.map(normalizeTrade);
    const latestSnapshot = latestSnapshotRaw ? normalizeSnapshot(latestSnapshotRaw) : null;
    const curveSnapshots = (curveSnapshotsRaw || []).map(normalizeSnapshot)
      .sort((a, b) => a.snapshot_time_ms - b.snapshot_time_ms);

    const todaysTrades = todayTradesRaw.map(normalizeTrade);
    const todaysPnL = todaysTrades
      .reduce((sum, t) => sum + (t.profit || 0), 0);

    const floatingPnL = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
    const liveSnap = getAggregated([accountId]);
    const equity = liveSnap.equity !== undefined && liveSnap.equity > 0
      ? liveSnap.equity
      : (latestSnapshot?.equity || latestSnapshot?.balance || 0);
    const balance = liveSnap.balance !== undefined && liveSnap.balance > 0
      ? liveSnap.balance
      : (latestSnapshot?.balance || 0);

    const marginFromPositions = positions.reduce((sum, p) => sum + (p.margin || 0), 0);
    const usedMargin = liveSnap.marginUsed !== undefined
      ? liveSnap.marginUsed
      : marginFromPositions;
    const freeMargin = Math.max(0, equity - usedMargin);

    const returnsDaily = curveSnapshots.map((s) => s.return_pct || 0);
    const weeklyMap = new Map<string, number>();
    const monthlyMap = new Map<string, number>();
    for (const s of curveSnapshots) {
      const ts = new Date(s.snapshot_time_ms);
      const year = ts.getUTCFullYear();
      const month = ts.getUTCMonth() + 1;
      const day = ts.getUTCDate();
      const week = Math.ceil(day / 7);
      const weekKey = `${year}-W${String(week).padStart(2, '0')}`;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      weeklyMap.set(weekKey, s.return_pct || 0);
      monthlyMap.set(monthKey, s.return_pct || 0);
    }

    const equityCurve = curveSnapshots.map((s) => ({ ts: s.snapshot_time_ms, equity: s.equity }));

    const dashboard: DashboardSummary = {
      summary: {
        equity,
        balance,
        free_margin: freeMargin,
        used_margin: usedMargin,
        current_pnl: floatingPnL,
        current_return_pct: balance > 0 ? (floatingPnL / balance) * 100 : 0,
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
        equity_curve: equityCurve,
        returns: {
          daily: returnsDaily,
          weekly: Array.from(weeklyMap.values()),
          monthly: Array.from(monthlyMap.values()),
        },
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
    const cachedPositions = getPositions(accountId);
    if (cachedPositions.length > 0) {
      return res.json(cachedPositions.map(normalizePosition));
    }

    const positions = await positionQueries.findByAccount(accountId);
    return res.json(positions.map(normalizePosition));
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
      broker: a.broker,
      nickname: a.nickname || '',
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
