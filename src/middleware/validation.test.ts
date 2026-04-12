import { describe, it, expect, vi } from 'vitest';
import { validateRequestBody, validateQueryParams, ingestPayloadSchema, ingestHealthPayloadSchema } from './validation.js';

const createMockReq = (body: any = {}, query: any = {}) => ({
  body,
  query,
});

const createMockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('validateRequestBody', () => {
  it('passes valid body through and replaces req.body with parsed value', () => {
    const schema = ingestHealthPayloadSchema;
    const middleware = validateRequestBody(schema);
    const req = createMockReq({ account_number: '123', sync_id: 'abc', history_hash: 'xyz' });
    const res = createMockRes();
    const next = vi.fn();
    middleware(req as any, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body.account_number).toBe('123');
  });

  it('transforms numeric account_number to string', () => {
    const middleware = validateRequestBody(ingestHealthPayloadSchema);
    const req = createMockReq({ account_number: 662240, sync_id: 'abc', history_hash: 'xyz' });
    const res = createMockRes();
    const next = vi.fn();
    middleware(req as any, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body.account_number).toBe('662240');
  });

  it('rejects when required fields are missing', () => {
    const middleware = validateRequestBody(ingestHealthPayloadSchema);
    const req = createMockReq({});
    const res = createMockRes();
    const next = vi.fn();
    middleware(req as any, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Validation failed' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects empty account_number', () => {
    const middleware = validateRequestBody(ingestHealthPayloadSchema);
    const req = createMockReq({ account_number: '', sync_id: 'abc', history_hash: 'xyz' });
    const res = createMockRes();
    const next = vi.fn();
    middleware(req as any, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects empty sync_id', () => {
    const middleware = validateRequestBody(ingestHealthPayloadSchema);
    const req = createMockReq({ account_number: '123', sync_id: '', history_hash: 'xyz' });
    const res = createMockRes();
    const next = vi.fn();
    middleware(req as any, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('ingestPayloadSchema', () => {
  const validPayload = {
    account_number: '123',
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
    account: { equity: 10000, balance: 9500, margin_used: 500 },
    sync_id: 'sync-1',
    ea_latest_closed_time_ms: 2000000,
    ea_latest_closed_deal_id: '12345',
    open_positions_hash: 'hash123',
  };

  it('accepts a valid full payload', () => {
    const result = ingestPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('accepts empty positions and closed_trades arrays', () => {
    const result = ingestPayloadSchema.safeParse({
      ...validPayload,
      positions: [],
      closed_trades: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid direction', () => {
    const result = ingestPayloadSchema.safeParse({
      ...validPayload,
      positions: [{ ...validPayload.positions[0], direction: 'HOLD' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative volume', () => {
    const result = ingestPayloadSchema.safeParse({
      ...validPayload,
      positions: [{ ...validPayload.positions[0], volume: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero volume', () => {
    const result = ingestPayloadSchema.safeParse({
      ...validPayload,
      positions: [{ ...validPayload.positions[0], volume: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional include_history and history_hash', () => {
    const result = ingestPayloadSchema.safeParse({
      ...validPayload,
      include_history: true,
      history_hash: 'abc123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing sync_id', () => {
    const { sync_id, ...rest } = validPayload;
    const result = ingestPayloadSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('validateQueryParams', () => {
  it('passes valid query params', () => {
    const { z } = require('zod');
    const schema = z.object({ page: z.string().optional() });
    const middleware = validateQueryParams(schema);
    const req = createMockReq({}, { page: '1' });
    const res = createMockRes();
    const next = vi.fn();
    middleware(req as any, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects invalid query params', () => {
    const { z } = require('zod');
    const schema = z.object({ page: z.string().min(1) });
    const middleware = validateQueryParams(schema);
    const req = createMockReq({}, { page: '' });
    const res = createMockRes();
    const next = vi.fn();
    middleware(req as any, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
