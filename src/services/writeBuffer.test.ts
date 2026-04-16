import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// We need to mock the DB module before importing writeBuffer
vi.mock('../db/queries.js', () => ({
  snapshotQueries: {
    insertSnapshot: vi.fn().mockResolvedValue(undefined),
  },
}));

import { bufferSnapshot, flush, flushAndStop, startWriteBuffer } from './writeBuffer.js';
import { snapshotQueries } from '../db/queries.js';

const mockInsert = vi.mocked(snapshotQueries.insertSnapshot);

const makeSnapshot = (accountId: string) => ({
  account_id: accountId,
  date: '2025-01-01',
  snapshot_time_ms: Date.now(),
  equity: 10000,
  balance: 9500,
  return_pct: 5.26,
  trades_count: 3,
  wins: 2,
  losses: 1,
});

describe('writeBuffer', () => {
  beforeEach(() => {
    mockInsert.mockClear();
  });

  afterEach(async () => {
    await flushAndStop();
  });

  it('buffers a snapshot and flushes it to DB', async () => {
    bufferSnapshot(makeSnapshot('acc1'));
    // Wait for eager flush (may fire automatically)
    await new Promise((r) => setTimeout(r, 50));
    // Trigger explicit flush if not yet flushed
    await flush();
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ account_id: 'acc1' }));
  });

  it('deduplicates snapshots for the same account (last-write-wins)', async () => {
    const snap1 = makeSnapshot('acc1');
    snap1.equity = 10000;
    const snap2 = makeSnapshot('acc1');
    snap2.equity = 11000;
    bufferSnapshot(snap1);
    bufferSnapshot(snap2);
    await flush();
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ equity: 11000 }));
  });

  it('flush is a no-op when nothing is buffered', async () => {
    await flush();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('guards against concurrent flushes (double-flush safe)', async () => {
    bufferSnapshot(makeSnapshot('acc1'));
    const [r1, r2] = await Promise.all([flush(), flush()]);
    // Both should resolve; only one should actually insert
    expect(mockInsert.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('flushAndStop is idempotent', async () => {
    bufferSnapshot(makeSnapshot('acc1'));
    await flushAndStop();
    await flushAndStop(); // second call should be harmless
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('handles insertion errors gracefully without throwing', async () => {
    mockInsert.mockRejectedValueOnce(new Error('DB connection lost'));
    bufferSnapshot(makeSnapshot('fail'));
    // flush should not throw
    await expect(flush()).resolves.toBeUndefined();
  });
});
