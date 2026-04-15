import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock DB so app can import without real DB
vi.mock('./db/connection.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
  transaction: vi.fn(async (cb: any) => cb({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  isDatabaseReady: vi.fn(),
  default: { query: vi.fn(), connect: vi.fn() },
}));

vi.mock('./db/bootstrap.js', () => ({
  ensureDatabaseSchema: vi.fn(),
}));

vi.mock('./db/queries.js', () => ({
  accountQueries: { findById: vi.fn(), list: vi.fn(), ensureByAccountNumber: vi.fn(), updateWatermarks: vi.fn(), updateIngestionState: vi.fn(), updateNickname: vi.fn(), updateIdentity: vi.fn() },
  positionQueries: { findAll: vi.fn().mockResolvedValue([]), findByAccount: vi.fn(), deleteByAccount: vi.fn(), upsertPosition: vi.fn() },
  tradeQueries: {
    findRecentByAccount: vi.fn(), findByExitRange: vi.fn(), insertTrade: vi.fn(),
    getBreakevenTolerance: vi.fn().mockResolvedValue(1.0),
    summarizeByExitRange: vi.fn().mockResolvedValue({ trades_count: 0, wins: 0, losses: 0 }),
    findWindowedByEventTime: vi.fn(), findByEventTimeRange: vi.fn(), countByEventTimeRange: vi.fn(),
    summarizeByEventTimeRange: vi.fn(), summarizeDirectionDistributionByEventTimeRange: vi.fn(),
    summarizeDirectionOutcomeDistributionByEventTimeRange: vi.fn(),
    summarizeDailyPnlByEventTimeRange: vi.fn(), summarizeDailyPnlAllTimeByEventTime: vi.fn(),
    summarizePnlByDayOfWeekByEventTimeRange: vi.fn(), summarizePnlByHourOfDayByEventTimeRange: vi.fn(),
    summarizeMonthCalendar: vi.fn(), summarizeYearCalendar: vi.fn(), summarizeMetrics: vi.fn(),
  },
  snapshotQueries: { findLatestByAccount: vi.fn(), findByAccountAndRange: vi.fn(), insertSnapshot: vi.fn() },
}));

import { isDatabaseReady } from './db/connection.js';

// Import app after mocks are set up
const { default: app } = await import('./index.js');

describe('App-level endpoints', () => {
  describe('GET /live', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app).get('/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health', () => {
    it('returns 200 when DB is ready', async () => {
      vi.mocked(isDatabaseReady).mockResolvedValue(true);
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
    });

    it('returns 503 when DB is not ready', async () => {
      vi.mocked(isDatabaseReady).mockResolvedValue(false);
      const res = await request(app).get('/health');
      expect(res.status).toBe(503);
      expect(res.body.ready).toBe(false);
    });
  });

  describe('404 handler', () => {
    it('returns 404 for unknown API routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });
  });
});
