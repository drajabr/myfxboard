import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import express from 'express';
import request from 'supertest';

// Mock DB modules before importing the router
vi.mock('../db/queries.js', () => ({
  accountQueries: {
    ensureByAccountNumber: vi.fn(),
    updateWatermarks: vi.fn(),
    updateIngestionState: vi.fn(),
    updateNickname: vi.fn(),
    updateIdentity: vi.fn(),
  },
  positionQueries: {
    deleteByAccount: vi.fn(),
    upsertPosition: vi.fn(),
  },
  tradeQueries: {
    insertTrade: vi.fn(),
    getBreakevenTolerance: vi.fn().mockResolvedValue(1.0),
    summarizeByExitRange: vi.fn().mockResolvedValue({ trades_count: 0, wins: 0, losses: 0 }),
  },
  snapshotQueries: {
    insertSnapshot: vi.fn(),
  },
}));

vi.mock('../db/connection.js', () => ({
  transaction: vi.fn(async (cb: any) => {
    const fakeClient = { query: vi.fn().mockReturnValue({ rows: [] }) };
    return cb(fakeClient);
  }),
  query: vi.fn(),
}));

import ingestionRoutes from '../api/ingestion.js';
import { accountQueries, positionQueries, tradeQueries, snapshotQueries } from '../db/queries.js';

const SECRET = 'test-secret';

const makeSignedApp = () => {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/ingestion', ingestionRoutes);
  return app;
};

const signRequest = (accountNumber: string, timestampMs: number) => {
  const sig = crypto.createHmac('sha256', SECRET).update(`${accountNumber}:${timestampMs}`).digest('hex');
  return { sig, ts: timestampMs };
};

const validPayload = {
  account_number: '662240',
  positions: [],
  closed_trades: [],
  account: { equity: 10000, balance: 9500, margin_used: 500 },
  sync_id: 'sync-1',
  ea_latest_closed_time_ms: 2000000,
  ea_latest_closed_deal_id: '12345',
  open_positions_hash: 'hash123',
};

describe('POST /api/ingestion', () => {
  beforeEach(() => {
    vi.stubEnv('CONNECTOR_SHARED_SECRET', SECRET);
    vi.mocked(accountQueries.ensureByAccountNumber).mockResolvedValue({
      account_id: '662240',
      last_ingest_received_at: null,
      last_history_hash: '',
      last_closed_time_ms: 0,
    } as any);
    vi.mocked(accountQueries.updateWatermarks).mockResolvedValue({} as any);
    vi.mocked(accountQueries.updateIngestionState).mockResolvedValue({} as any);
    vi.mocked(tradeQueries.getBreakevenTolerance).mockResolvedValue(1.0);
    vi.mocked(tradeQueries.summarizeByExitRange).mockResolvedValue({ trades_count: 0, wins: 0, losses: 0 });
  });

  it('returns 401 without auth headers', async () => {
    const app = makeSignedApp();
    const res = await request(app).post('/api/ingestion').send(validPayload);
    expect(res.status).toBe(401);
  });

  it('returns 400 with invalid body', async () => {
    const app = makeSignedApp();
    const ts = Date.now();
    const { sig } = signRequest('662240', ts);
    const res = await request(app)
      .post('/api/ingestion')
      .set('Authorization', `HMAC-SHA256 ${sig}`)
      .set('X-Signature-Timestamp', String(ts))
      .send({ account_number: '662240' }); // missing required fields
    expect(res.status).toBe(400);
  });

  it('returns 200 with valid signed request', async () => {
    const app = makeSignedApp();
    const ts = Date.now();
    const { sig } = signRequest('662240', ts);
    const res = await request(app)
      .post('/api/ingestion')
      .set('Authorization', `HMAC-SHA256 ${sig}`)
      .set('X-Signature-Timestamp', String(ts))
      .send(validPayload);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.account_id).toBe('662240');
  });

  it('calls deleteByAccount and upsertPosition for positions', async () => {
    const app = makeSignedApp();
    const ts = Date.now();
    const { sig } = signRequest('662240', ts);
    const payload = {
      ...validPayload,
      positions: [{
        symbol: 'EURUSD',
        volume: 0.1,
        direction: 'BUY',
        open_price: 1.1,
        avg_sl: null,
        avg_tp: null,
        open_time_ms: 1000000,
        pnl: 50,
      }],
    };
    await request(app)
      .post('/api/ingestion')
      .set('Authorization', `HMAC-SHA256 ${sig}`)
      .set('X-Signature-Timestamp', String(ts))
      .send(payload);
    expect(positionQueries.deleteByAccount).toHaveBeenCalledWith('662240', expect.anything());
    expect(positionQueries.upsertPosition).toHaveBeenCalled();
  });

  it('inserts closed trades when include_history is not false', async () => {
    const app = makeSignedApp();
    const ts = Date.now();
    const { sig } = signRequest('662240', ts);
    const payload = {
      ...validPayload,
      closed_trades: [{
        symbol: 'GBPUSD',
        volume: 0.2,
        entry: 1.25,
        exit: 1.26,
        profit: 100,
        entry_time_ms: 1000000,
        exit_time_ms: 2000000,
        duration_sec: 1000,
        method: 'TP',
      }],
    };
    await request(app)
      .post('/api/ingestion')
      .set('Authorization', `HMAC-SHA256 ${sig}`)
      .set('X-Signature-Timestamp', String(ts))
      .send(payload);
    expect(tradeQueries.insertTrade).toHaveBeenCalled();
  });

  it('persists incoming account display name for existing account id', async () => {
    const app = makeSignedApp();
    const ts = Date.now();
    const { sig } = signRequest('662240', ts);
    const payload = {
      ...validPayload,
      account: {
        ...validPayload.account,
        nickname: 'My Broker Name',
      },
    };

    await request(app)
      .post('/api/ingestion')
      .set('Authorization', `HMAC-SHA256 ${sig}`)
      .set('X-Signature-Timestamp', String(ts))
      .send(payload);

    expect(accountQueries.updateIdentity).toHaveBeenCalledWith(
      '662240',
      expect.objectContaining({
        nickname: 'My Broker Name',
        account_name: 'My Broker Name',
      })
    );
  });

  it('returns 403 on account secret mismatch', async () => {
    vi.mocked(accountQueries.ensureByAccountNumber).mockRejectedValue(
      Object.assign(new Error('mismatch'), { code: 'ACCOUNT_SECRET_MISMATCH' })
    );
    const app = makeSignedApp();
    const ts = Date.now();
    const { sig } = signRequest('662240', ts);
    const res = await request(app)
      .post('/api/ingestion')
      .set('Authorization', `HMAC-SHA256 ${sig}`)
      .set('X-Signature-Timestamp', String(ts))
      .send(validPayload);
    expect(res.status).toBe(403);
  });
});

describe('POST /api/ingestion/health', () => {
  beforeEach(() => {
    vi.stubEnv('CONNECTOR_SHARED_SECRET', SECRET);
    vi.mocked(accountQueries.ensureByAccountNumber).mockResolvedValue({
      account_id: '662240',
      last_history_hash: 'server-hash',
    } as any);
  });

  it('returns history_sync_required true when hashes differ', async () => {
    const app = makeSignedApp();
    const ts = Date.now();
    const { sig } = signRequest('662240', ts);
    const res = await request(app)
      .post('/api/ingestion/health')
      .set('Authorization', `HMAC-SHA256 ${sig}`)
      .set('X-Signature-Timestamp', String(ts))
      .send({ account_number: '662240', sync_id: 'abc', history_hash: 'different-hash' });
    expect(res.status).toBe(200);
    expect(res.body.history_sync_required).toBe(true);
  });

  it('returns history_sync_required false when hashes match', async () => {
    const app = makeSignedApp();
    const ts = Date.now();
    const { sig } = signRequest('662240', ts);
    const res = await request(app)
      .post('/api/ingestion/health')
      .set('Authorization', `HMAC-SHA256 ${sig}`)
      .set('X-Signature-Timestamp', String(ts))
      .send({ account_number: '662240', sync_id: 'abc', history_hash: 'server-hash' });
    expect(res.status).toBe(200);
    expect(res.body.history_sync_required).toBe(false);
  });
});

describe('POST /api/ingestion/backfill', () => {
  beforeEach(() => {
    vi.stubEnv('CONNECTOR_SHARED_SECRET', SECRET);
    vi.mocked(accountQueries.ensureByAccountNumber).mockResolvedValue({
      account_id: '662240',
    } as any);
    vi.mocked(tradeQueries.getBreakevenTolerance).mockResolvedValue(1.0);
    vi.mocked(tradeQueries.insertTrade).mockResolvedValue(null);
  });

  it('inserts backfill trades and returns ok', async () => {
    const app = makeSignedApp();
    const ts = Date.now();
    const { sig } = signRequest('662240', ts);
    const payload = {
      ...validPayload,
      closed_trades: [{
        symbol: 'XAUUSD',
        volume: 0.5,
        entry: 1900,
        exit: 1910,
        profit: 500,
        entry_time_ms: 500000,
        exit_time_ms: 600000,
        duration_sec: 100,
        method: 'SL',
      }],
    };
    const res = await request(app)
      .post('/api/ingestion/backfill')
      .set('Authorization', `HMAC-SHA256 ${sig}`)
      .set('X-Signature-Timestamp', String(ts))
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(tradeQueries.insertTrade).toHaveBeenCalled();
  });
});
