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

export interface PnlSnapshot {
  floatingPnl: number;
  openPositions: number;
}

// Account-id → latest PnL summary (for SSE / live-pnl)
const cache = new Map<string, PnlSnapshot>();

// Account-id → full position objects (for analytics endpoint)
const positionsByAccount = new Map<string, any[]>();

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
export function updateAccountCache(accountId: string, positions: any[]): void {
  const floatingPnl = positions.reduce((sum: number, p: any) => sum + (Number(p.unrealized_pnl) || 0), 0);
  cache.set(accountId, { floatingPnl, openPositions: positions.length });
  positionsByAccount.set(accountId, positions);
  pnlEmitter.emit('update', accountId);
}

/**
 * Returns the full position array for one account.
 * Falls back to [] if the account has never synced or server just started
 * (seed from DB fills this before the first request).
 */
export function getPositions(accountId: string): any[] {
  return positionsByAccount.get(accountId) || [];
}

/**
 * Called once on server startup: seeds the cache from the last DB state so
 * the analytics endpoint has data before the first connector sync arrives.
 * Does NOT fire the SSE emitter (no clients are connected yet).
 */
export function seedAccountPositions(accountId: string, positions: any[]): void {
  const floatingPnl = positions.reduce((sum: number, p: any) => sum + (Number(p.unrealized_pnl) || 0), 0);
  cache.set(accountId, { floatingPnl, openPositions: positions.length });
  positionsByAccount.set(accountId, positions);
}

/**
 * Aggregates PnL snapshots for the given account IDs (used by SSE endpoint).
 */
export function getAggregated(accountIds: string[]): PnlSnapshot {
  let floatingPnl = 0;
  let openPositions = 0;
  for (const id of accountIds) {
    const s = cache.get(id);
    if (s) {
      floatingPnl += s.floatingPnl;
      openPositions += s.openPositions;
    }
  }
  return { floatingPnl, openPositions };
}
