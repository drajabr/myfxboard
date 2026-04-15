import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { validateIngestionAuth, validateDashboardEditToken } from './auth.js';

const createMockReq = (overrides: any = {}) => ({
  headers: {},
  body: {},
  ip: '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' },
  path: '/',
  query: {},
  method: 'GET',
  ...overrides,
});

const createMockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const SECRET = 'test-secret';

const makeSignature = (accountNumber: string, timestampMs: number) =>
  crypto.createHmac('sha256', SECRET).update(`${accountNumber}:${timestampMs}`).digest('hex');

describe('validateIngestionAuth', () => {
  beforeEach(() => {
    vi.stubEnv('CONNECTOR_SHARED_SECRET', SECRET);
    vi.stubEnv('INGEST_ALLOWED_TIMESTAMP_DRIFT_MS', '');
  });

  it('rejects when authorization header is missing', async () => {
    const req = createMockReq({ body: { account_number: '123' }, headers: { 'x-signature-timestamp': '1000' } });
    const res = createMockRes();
    const next = vi.fn();
    await validateIngestionAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when timestamp header is missing', async () => {
    const req = createMockReq({ body: { account_number: '123' }, headers: { authorization: 'HMAC-SHA256 abc' } });
    const res = createMockRes();
    const next = vi.fn();
    await validateIngestionAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when account_number is missing', async () => {
    const req = createMockReq({ body: {}, headers: { authorization: 'HMAC-SHA256 abc', 'x-signature-timestamp': '1000' } });
    const res = createMockRes();
    const next = vi.fn();
    await validateIngestionAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid authorization scheme', async () => {
    const req = createMockReq({
      body: { account_number: '123' },
      headers: { authorization: 'Bearer abc', 'x-signature-timestamp': '1000' },
    });
    const res = createMockRes();
    const next = vi.fn();
    await validateIngestionAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid authorization scheme' }));
  });

  it('rejects empty signature after scheme', async () => {
    const req = createMockReq({
      body: { account_number: '123' },
      headers: { authorization: 'HMAC-SHA256 ', 'x-signature-timestamp': '1000' },
    });
    const res = createMockRes();
    const next = vi.fn();
    await validateIngestionAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects non-numeric timestamp', async () => {
    const req = createMockReq({
      body: { account_number: '123' },
      headers: { authorization: 'HMAC-SHA256 abc', 'x-signature-timestamp': 'not-a-number' },
    });
    const res = createMockRes();
    const next = vi.fn();
    await validateIngestionAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid timestamp' }));
  });

  it('rejects timestamp outside allowed drift window', async () => {
    const oldTs = Date.now() - 300000; // 5 min ago, default drift is 3 min
    const sig = makeSignature('123', oldTs);
    const req = createMockReq({
      body: { account_number: '123' },
      headers: { authorization: `HMAC-SHA256 ${sig}`, 'x-signature-timestamp': String(oldTs) },
    });
    const res = createMockRes();
    const next = vi.fn();
    await validateIngestionAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Request timestamp out of window' }));
  });

  it('rejects future timestamp outside drift window', async () => {
    const futureTs = Date.now() + 300000;
    const sig = makeSignature('123', futureTs);
    const req = createMockReq({
      body: { account_number: '123' },
      headers: { authorization: `HMAC-SHA256 ${sig}`, 'x-signature-timestamp': String(futureTs) },
    });
    const res = createMockRes();
    const next = vi.fn();
    await validateIngestionAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects invalid HMAC signature', async () => {
    const ts = Date.now();
    const req = createMockReq({
      body: { account_number: '123' },
      headers: { authorization: 'HMAC-SHA256 deadbeef00112233445566778899aabbccddeeff00112233445566778899aabbcc', 'x-signature-timestamp': String(ts) },
    });
    const res = createMockRes();
    const next = vi.fn();
    await validateIngestionAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid signature' }));
  });

  it('returns 500 when CONNECTOR_SHARED_SECRET is not set', async () => {
    vi.stubEnv('CONNECTOR_SHARED_SECRET', '');
    vi.stubEnv('INGEST_ALLOWED_TIMESTAMP_DRIFT_MS', '5000');
    const ts = Date.now();
    const req = createMockReq({
      body: { account_number: '123' },
      headers: { authorization: 'HMAC-SHA256 abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd', 'x-signature-timestamp': String(ts) },
    });
    const res = createMockRes();
    const next = vi.fn();
    await validateIngestionAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('passes valid HMAC request and sets accountId and timestamp', async () => {
    vi.stubEnv('INGEST_ALLOWED_TIMESTAMP_DRIFT_MS', '5000');
    const ts = Date.now();
    const sig = makeSignature('662240', ts);
    const req = createMockReq({
      body: { account_number: '662240' },
      headers: { authorization: `HMAC-SHA256 ${sig}`, 'x-signature-timestamp': String(ts) },
    });
    const res = createMockRes();
    const next = vi.fn();
    await validateIngestionAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.accountId).toBe('662240');
    expect(req.timestamp).toBe(ts);
  });

  it('trims whitespace from account_number', async () => {
    vi.stubEnv('INGEST_ALLOWED_TIMESTAMP_DRIFT_MS', '5000');
    const ts = Date.now();
    const sig = makeSignature('662240', ts);
    const req = createMockReq({
      body: { account_number: '  662240  ' },
      headers: { authorization: `HMAC-SHA256 ${sig}`, 'x-signature-timestamp': String(ts) },
    });
    const res = createMockRes();
    const next = vi.fn();
    await validateIngestionAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.accountId).toBe('662240');
  });

  it('respects custom INGEST_ALLOWED_TIMESTAMP_DRIFT_MS', async () => {
    vi.stubEnv('INGEST_ALLOWED_TIMESTAMP_DRIFT_MS', '500000');
    const ts = Date.now() - 400000; // within 500s
    const sig = makeSignature('123', ts);
    const req = createMockReq({
      body: { account_number: '123' },
      headers: { authorization: `HMAC-SHA256 ${sig}`, 'x-signature-timestamp': String(ts) },
    });
    const res = createMockRes();
    const next = vi.fn();
    await validateIngestionAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('validateDashboardEditToken', () => {
  beforeEach(() => {
    vi.stubEnv('DASHBOARD_EDIT_TOKEN', '');
  });

  it('passes all requests when DASHBOARD_EDIT_TOKEN is not set', () => {
    const req = createMockReq({ method: 'POST' });
    const res = createMockRes();
    const next = vi.fn();
    validateDashboardEditToken(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes GET requests even when token is set', () => {
    vi.stubEnv('DASHBOARD_EDIT_TOKEN', 'my-token');
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    const next = vi.fn();
    validateDashboardEditToken(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes HEAD and OPTIONS requests', () => {
    vi.stubEnv('DASHBOARD_EDIT_TOKEN', 'my-token');
    for (const method of ['HEAD', 'OPTIONS']) {
      const req = createMockReq({ method });
      const res = createMockRes();
      const next = vi.fn();
      validateDashboardEditToken(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('rejects POST without token', () => {
    vi.stubEnv('DASHBOARD_EDIT_TOKEN', 'my-token');
    const req = createMockReq({ method: 'POST' });
    const res = createMockRes();
    const next = vi.fn();
    validateDashboardEditToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects POST with wrong token', () => {
    vi.stubEnv('DASHBOARD_EDIT_TOKEN', 'my-token');
    const req = createMockReq({ method: 'POST', headers: { 'x-edit-token': 'wrong-tk' } });
    const res = createMockRes();
    const next = vi.fn();
    validateDashboardEditToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('accepts correct token via X-Edit-Token header', () => {
    vi.stubEnv('DASHBOARD_EDIT_TOKEN', 'my-token');
    const req = createMockReq({ method: 'POST', headers: { 'x-edit-token': 'my-token' } });
    const res = createMockRes();
    const next = vi.fn();
    validateDashboardEditToken(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('accepts correct token via Bearer authorization', () => {
    vi.stubEnv('DASHBOARD_EDIT_TOKEN', 'my-token');
    const req = createMockReq({ method: 'PUT', headers: { authorization: 'Bearer my-token' } });
    const res = createMockRes();
    const next = vi.fn();
    validateDashboardEditToken(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('accepts correct token via query parameter', () => {
    vi.stubEnv('DASHBOARD_EDIT_TOKEN', 'my-token');
    const req = createMockReq({ method: 'DELETE', query: { edit_token: 'my-token' } });
    const res = createMockRes();
    const next = vi.fn();
    validateDashboardEditToken(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
