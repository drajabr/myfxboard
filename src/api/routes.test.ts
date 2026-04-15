import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../db/queries.js', () => ({
  accountQueries: {
    findById: vi.fn(),
    list: vi.fn(),
  },
  positionQueries: {
    findByAccount: vi.fn(),
  },
  tradeQueries: {
    findRecentByAccount: vi.fn(),
    findByExitRange: vi.fn(),
    findWindowedByEventTime: vi.fn(),
    findByEventTimeRange: vi.fn(),
    countByEventTimeRange: vi.fn(),
    summarizeByEventTimeRange: vi.fn(),
    summarizeDirectionDistributionByEventTimeRange: vi.fn(),
    summarizeDirectionOutcomeDistributionByEventTimeRange: vi.fn(),
    summarizeDailyPnlByEventTimeRange: vi.fn(),
    summarizeDailyPnlAllTimeByEventTime: vi.fn(),
    summarizePnlByDayOfWeekByEventTimeRange: vi.fn(),
    summarizePnlByHourOfDayByEventTimeRange: vi.fn(),
    summarizeMonthCalendar: vi.fn(),
    summarizeYearCalendar: vi.fn(),
    summarizeMetrics: vi.fn(),
    summarizeAllPeriodStats: vi.fn(),
    summarizeByExitRange: vi.fn(),
    getBreakevenTolerance: vi.fn(),
  },
  snapshotQueries: {
    findLatestByAccount: vi.fn(),
    findByAccountAndRange: vi.fn(),
  },
}));

import dashboardRoutes from '../api/routes.js';
import { accountQueries, positionQueries, tradeQueries, snapshotQueries } from '../db/queries.js';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/account', dashboardRoutes);
  return app;
};

const zeroSummary = { pnl: 0, trades_count: 0, wins: 0, losses: 0, neutral: 0 };
const zeroMetrics = {
  trade_count: 0, win_count: 0, loss_count: 0, avg_win: 0, avg_loss: 0,
  max_win: 0, max_loss: 0, expectancy: 0, gross_profit: 0, gross_loss: 0, avg_hold_seconds: 0,
};

describe('GET /api/account (list accounts)', () => {
  it('returns accounts without secret_hash', async () => {
    vi.mocked(accountQueries.list).mockResolvedValue([{
      account_id: '123',
      account_name: 'MT5 123',
      secret_hash: 'should-be-stripped',
      broker: 'MT5',
      nickname: 'My Account',
      created_at: 1000,
      last_sync_at: 2000,
      last_ingest_received_at: 2000,
      history_in_sync: true,
    }]);
    const app = makeApp();
    const res = await request(app).get('/api/account');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).not.toHaveProperty('secret_hash');
    expect(res.body[0].account_id).toBe('123');
  });
});

describe('GET /api/account/:accountId/dashboard', () => {
  beforeEach(() => {
    vi.mocked(accountQueries.findById).mockResolvedValue({
      account_id: '123', account_name: 'MT5 123', secret_hash: 'h', broker: 'MT5',
      created_at: 1000, last_sync_at: 2000,
    } as any);
    vi.mocked(positionQueries.findByAccount).mockResolvedValue([]);
    vi.mocked(tradeQueries.findRecentByAccount).mockResolvedValue([]);
    vi.mocked(tradeQueries.findByExitRange).mockResolvedValue([]);
    vi.mocked(snapshotQueries.findLatestByAccount).mockResolvedValue(null);
  });

  it('returns 404 for unknown account', async () => {
    vi.mocked(accountQueries.findById).mockResolvedValue(null);
    const app = makeApp();
    const res = await request(app).get('/api/account/unknown/dashboard');
    expect(res.status).toBe(404);
  });

  it('returns dashboard data for valid account', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/account/123/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('positions');
    expect(res.body).toHaveProperty('todays_stats');
  });
});

describe('GET /api/account/:accountId/positions', () => {
  it('returns positions for account', async () => {
    vi.mocked(positionQueries.findByAccount).mockResolvedValue([{
      id: 1, account_id: '123', symbol: 'EURUSD', size: 0.1, direction: 'BUY',
      entry_price: 1.1, current_price: 1.11, avg_sl: null, avg_tp: null,
      unrealized_pnl: 100, open_time_ms: 1000000, updated_at_ms: 2000000,
    }]);
    const app = makeApp();
    const res = await request(app).get('/api/account/123/positions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].symbol).toBe('EURUSD');
  });
});

describe('GET /api/account/:accountId/trades', () => {
  it('returns trades with default limit', async () => {
    vi.mocked(tradeQueries.findRecentByAccount).mockResolvedValue([]);
    const app = makeApp();
    const res = await request(app).get('/api/account/123/trades');
    expect(res.status).toBe(200);
    expect(tradeQueries.findRecentByAccount).toHaveBeenCalledWith('123', 50);
  });

  it('respects custom limit capped at 500', async () => {
    vi.mocked(tradeQueries.findRecentByAccount).mockResolvedValue([]);
    const app = makeApp();
    await request(app).get('/api/account/123/trades?limit=1000');
    expect(tradeQueries.findRecentByAccount).toHaveBeenCalledWith('123', 500);
  });
});

describe('GET /api/account/:accountId/equity-curve', () => {
  it('returns equity curve data', async () => {
    vi.mocked(snapshotQueries.findByAccountAndRange).mockResolvedValue([
      { id: 1, account_id: '123', date: '2026-01-01', snapshot_time_ms: 1000, equity: 10000, balance: 9500, return_pct: 5, trades_count: 10, wins: 6, losses: 4 },
    ]);
    const app = makeApp();
    const res = await request(app).get('/api/account/123/equity-curve');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.period_days).toBe(90);
  });
});

describe('GET /api/account/analytics', () => {
  beforeEach(() => {
    vi.mocked(accountQueries.list).mockResolvedValue([{ account_id: '123' }] as any);
    vi.mocked(accountQueries.findById).mockResolvedValue({ account_id: '123' } as any);
    vi.mocked(tradeQueries.getBreakevenTolerance).mockResolvedValue(1.0);
    vi.mocked(positionQueries.findByAccount).mockResolvedValue([]);
    vi.mocked(snapshotQueries.findLatestByAccount).mockResolvedValue(null);
    vi.mocked(tradeQueries.findWindowedByEventTime).mockResolvedValue([]);
    vi.mocked(tradeQueries.findByEventTimeRange).mockResolvedValue([]);
    vi.mocked(tradeQueries.countByEventTimeRange).mockResolvedValue(0);
    vi.mocked(tradeQueries.summarizeByEventTimeRange).mockResolvedValue(zeroSummary);
    vi.mocked(tradeQueries.summarizeDirectionDistributionByEventTimeRange).mockResolvedValue({ longs: 0, shorts: 0, unknown: 0 });
    vi.mocked(tradeQueries.summarizeDirectionOutcomeDistributionByEventTimeRange).mockResolvedValue({ long_wins: 0, long_losses: 0, long_neutral: 0, short_wins: 0, short_losses: 0, short_neutral: 0 });
    vi.mocked(tradeQueries.summarizeDailyPnlByEventTimeRange).mockResolvedValue([]);
    vi.mocked(tradeQueries.summarizeDailyPnlAllTimeByEventTime).mockResolvedValue([]);
    vi.mocked(tradeQueries.summarizePnlByDayOfWeekByEventTimeRange).mockResolvedValue([]);
    vi.mocked(tradeQueries.summarizePnlByHourOfDayByEventTimeRange).mockResolvedValue([]);
    vi.mocked(tradeQueries.summarizeMonthCalendar).mockResolvedValue([]);
    vi.mocked(tradeQueries.summarizeYearCalendar).mockResolvedValue([]);
    vi.mocked(tradeQueries.summarizeMetrics).mockResolvedValue(zeroMetrics);
    vi.mocked(tradeQueries.summarizeAllPeriodStats).mockResolvedValue({
      today: { pnl: 0, trades_count: 0, wins: 0, losses: 0, neutral: 0 },
      last7d: { pnl: 0, trades_count: 0, wins: 0, losses: 0, neutral: 0 },
      last30d: { pnl: 0, trades_count: 0, wins: 0, losses: 0, neutral: 0 },
      ytd: { pnl: 0, trades_count: 0, wins: 0, losses: 0, neutral: 0 },
      all_time: { pnl: 0, trades_count: 0, wins: 0, losses: 0, neutral: 0 },
    });
  });

  it('returns analytics for all accounts', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/account/analytics');
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('all');
    expect(res.body).toHaveProperty('periods');
    expect(res.body).toHaveProperty('trade_metrics');
    expect(res.body).toHaveProperty('pnl_histogram');
  });

  it('returns analytics for a single account', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/account/analytics?accountId=123');
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('single');
    expect(res.body.account_id).toBe('123');
  });

  it('returns 404 for unknown single account', async () => {
    vi.mocked(accountQueries.findById).mockResolvedValue(null);
    const app = makeApp();
    const res = await request(app).get('/api/account/analytics?accountId=unknown');
    expect(res.status).toBe(404);
  });

  it('returns empty analytics when no accounts exist for "all"', async () => {
    vi.mocked(accountQueries.list).mockResolvedValue([]);
    const app = makeApp();
    const res = await request(app).get('/api/account/analytics');
    expect(res.status).toBe(200);
    expect(res.body.summary.accounts_count).toBe(0);
  });
});
