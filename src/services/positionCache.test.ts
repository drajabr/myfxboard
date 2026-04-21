import { describe, expect, it } from 'vitest';
import {
  updateAccountCache,
  updateAccountData,
  getPositions,
  getAggregatedPositions,
  seedAccountPositions,
  getAggregated,
  pnlEmitter,
} from './positionCache.js';
import type { CachedPosition } from '../types/index.js';

const makePosition = (overrides: Partial<CachedPosition> = {}): CachedPosition => ({
  account_id: 'acc1',
  symbol: 'EURUSD',
  size: 0.1,
  direction: 'BUY',
  entry_price: 1.105,
  current_price: 1.110,
  avg_sl: null,
  avg_tp: null,
  tick_size: null,
  tick_value: null,
  margin: null,
  unrealized_pnl: 50,
  open_time_ms: Date.now(),
  ...overrides,
});

describe('positionCache', () => {
  it('updateAccountCache stores positions retrievable by getPositions', () => {
    const positions = [makePosition({ symbol: 'GBPUSD', unrealized_pnl: 100 })];
    updateAccountCache('test1', positions);
    const stored = getPositions('test1');
    expect(stored).toHaveLength(1);
    expect(stored[0].symbol).toBe('GBPUSD');
  });

  it('returns empty array for unknown account', () => {
    expect(getPositions('nonexistent')).toEqual([]);
  });

  it('getAggregatedPositions merges multiple accounts', () => {
    updateAccountCache('a1', [makePosition({ symbol: 'EURUSD' })]);
    updateAccountCache('a2', [makePosition({ symbol: 'USDJPY' }), makePosition({ symbol: 'GBPUSD' })]);
    const all = getAggregatedPositions(['a1', 'a2']);
    expect(all).toHaveLength(3);
  });

  it('getAggregated computes total floating PnL across accounts', () => {
    updateAccountCache('pnl1', [makePosition({ unrealized_pnl: 100 }), makePosition({ unrealized_pnl: -30 })]);
    updateAccountCache('pnl2', [makePosition({ unrealized_pnl: 200 })]);
    const agg = getAggregated(['pnl1', 'pnl2']);
    expect(agg.floatingPnl).toBeCloseTo(270);
    expect(agg.openPositions).toBe(3);
  });

  it('getAggregated marks mixed currencies across accounts', () => {
    updateAccountData('cur1', { equity: 1000, balance: 900, marginUsed: 100, currency: 'USD' });
    updateAccountData('cur2', { equity: 800, balance: 700, marginUsed: 50, currency: 'EUR' });
    const agg = getAggregated(['cur1', 'cur2']);
    expect((agg as any).currency).toBeNull();
    expect((agg as any).mixedCurrencies).toBe(true);
  });

  it('seedAccountPositions populates cache without emitting SSE event', () => {
    let emitted = false;
    const listener = () => { emitted = true; };
    pnlEmitter.on('update', listener);
    seedAccountPositions('seed1', [makePosition({ unrealized_pnl: 42 })]);
    pnlEmitter.off('update', listener);
    expect(emitted).toBe(false);
    expect(getPositions('seed1')).toHaveLength(1);
  });

  it('updateAccountCache emits SSE update event', () => {
    let emittedId = '';
    const listener = (id: string) => { emittedId = id; };
    pnlEmitter.on('update', listener);
    updateAccountCache('emit1', [makePosition()]);
    pnlEmitter.off('update', listener);
    expect(emittedId).toBe('emit1');
  });

  it('last write wins when same account updated concurrently', () => {
    const old = [makePosition({ symbol: 'OLD', unrealized_pnl: 10 })];
    const latest = [makePosition({ symbol: 'NEW', unrealized_pnl: 99 })];
    updateAccountCache('race1', old);
    updateAccountCache('race1', latest);
    const stored = getPositions('race1');
    expect(stored).toHaveLength(1);
    expect(stored[0].symbol).toBe('NEW');
    expect(getAggregated(['race1']).floatingPnl).toBeCloseTo(99);
  });
});
