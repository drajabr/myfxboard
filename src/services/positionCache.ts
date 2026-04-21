/**
 * positionCache.ts
 *
 * In-memory store for per-account open positions.
 * Positions live here permanently — they are never read from the DB during
 * normal operation. DB writes happen only on graceful shutdown (for
 * restart-recovery) and very infrequently via the write buffer.
 *
 * Benefits:
 *  - Zero DB I/O on every 1-second connector sync
 *  - SSE push fires instantly on updateAccountCache()
 *  - Analytics endpoint reads a synchronous Map lookup instead of a query
 *  - Cache is warmed from DB once on server start, then kept fresh by ingestion
 */
import { EventEmitter } from 'events';
import type { CachedPosition } from '../types/index.js';

export interface PnlSnapshot {
  floatingPnl: number;
  openPositions: number;
}

export interface AccountSnapshot {
  equity: number;
  balance: number;
  marginUsed: number;
  currency?: string | null;
}

// Account-id → latest PnL summary (for SSE / live-pnl)
const cache = new Map<string, PnlSnapshot>();

// Account-id → latest account data (equity, balance, margin)
const accountDataCache = new Map<string, AccountSnapshot>();

// Account-id → full position objects (for analytics endpoint)
const positionsByAccount = new Map<string, CachedPosition[]>();

/**
 * Emits 'update' with the accountId string whenever positions change.
 * SSE handler listens here.
 */
export const pnlEmitter = new EventEmitter();
pnlEmitter.setMaxListeners(500);

/**
 * Called by the ingestion handler on every sync.
 * Stores full position objects AND updates the PnL summary.
 * Both are synchronous Map.set() calls — no I/O.
 */
export function updateAccountCache(accountId: string, positions: CachedPosition[]): void {
  const floatingPnl = positions.reduce((sum, p) => sum + (Number(p.unrealized_pnl) || 0), 0);
  cache.set(accountId, { floatingPnl, openPositions: positions.length });
  positionsByAccount.set(accountId, positions);
  pnlEmitter.emit('update', accountId);
}

/**
 * Stores account-level data (equity, balance, margin) on each sync.
 */
export function updateAccountData(accountId: string, data: AccountSnapshot): void {
  accountDataCache.set(accountId, data);
}

/**
 * Returns the full position array for one account.
 * Falls back to [] if the account has never synced or server just started
 * (seed from DB fills this before the first request).
 */
export function getPositions(accountId: string): CachedPosition[] {
  return positionsByAccount.get(accountId) || [];
}

/**
 * Returns the concatenated position arrays for multiple accounts.
 * Used by the SSE endpoint so the frontend can patch the open positions table
 * immediately on each ingestion event without a full analytics fetch.
 */
export function getAggregatedPositions(accountIds: string[]): CachedPosition[] {
  const positions: CachedPosition[] = [];
  for (const id of accountIds) {
    const accountPositions = positionsByAccount.get(id);
    if (accountPositions && accountPositions.length > 0) {
      positions.push(...accountPositions);
    }
  }
  return positions;
}

/**
 * Seeds account-level data (equity, balance, margin) from DB on startup so
 * the SSE stream has values before the first connector sync arrives.
 */
export function seedAccountData(accountId: string, data: AccountSnapshot): void {
  accountDataCache.set(accountId, data);
}

/**
 * Called once on server startup: seeds the cache from the last DB state so
 * the analytics endpoint has data before the first connector sync arrives.
 * Does NOT fire the SSE emitter (no clients are connected yet).
 */
export function seedAccountPositions(accountId: string, positions: CachedPosition[]): void {
  const floatingPnl = positions.reduce((sum, p) => sum + (Number(p.unrealized_pnl) || 0), 0);
  cache.set(accountId, { floatingPnl, openPositions: positions.length });
  positionsByAccount.set(accountId, positions);
}

/**
 * Aggregates PnL snapshots for the given account IDs (used by SSE endpoint).
 */
export function getAggregated(accountIds: string[]): PnlSnapshot & Partial<AccountSnapshot> {
  let floatingPnl = 0;
  let openPositions = 0;
  let equity = 0;
  let balance = 0;
  let marginUsed = 0;
  const currencies = new Set<string>();
  let hasAccountData = false;
  for (const id of accountIds) {
    const s = cache.get(id);
    if (s) {
      floatingPnl += s.floatingPnl;
      openPositions += s.openPositions;
    }
    const ad = accountDataCache.get(id);
    if (ad) {
      hasAccountData = true;
      equity += ad.equity;
      balance += ad.balance;
      marginUsed += ad.marginUsed;
      const currency = String(ad.currency || '').trim().toUpperCase();
      if (currency) currencies.add(currency);
    }
  }
  return {
    floatingPnl,
    openPositions,
    ...(hasAccountData ? {
      equity,
      balance,
      marginUsed,
      currency: currencies.size === 1 ? Array.from(currencies)[0] : null,
      mixedCurrencies: currencies.size > 1,
    } : {}),
  };
}

/**
 * Returns all account IDs that currently have cached positions.
 */
export function getAllCachedAccountIds(): string[] {
  return [...positionsByAccount.keys()];
}
