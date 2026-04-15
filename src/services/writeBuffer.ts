/**
 * writeBuffer.ts
 *
 * Buffers snapshot DB writes so they don't block the ingestion hot path.
 *
 * Positions are now held entirely in positionCache (in-memory) and are never
 * written to the DB during normal operation — only on graceful shutdown via
 * flushPositionsToDB() called from index.ts. This means every 1-second sync
 * touches zero DB I/O for positions.
 *
 * Snapshots (daily equity/balance upserts) are still debounced here because
 * they're non-critical aggregates that need DB persistence but don't need
 * sub-second accuracy.
 */

import { snapshotQueries } from '../db/queries.js';
import type { DailySnapshot } from '../types/index.js';

export type SnapshotInput = Omit<DailySnapshot, 'id'>;

const FLUSH_INTERVAL_MS = Math.max(
  1000,
  Number(process.env.WRITE_BUFFER_FLUSH_MS) || 5000
);

const pendingSnapshots = new Map<string, SnapshotInput>();

let flushing = false;
let timer: ReturnType<typeof setInterval> | null = null;

export function bufferSnapshot(snapshot: SnapshotInput): void {
  pendingSnapshots.set(snapshot.account_id, snapshot);
}

export async function flush(): Promise<void> {
  if (flushing) return;
  if (pendingSnapshots.size === 0) return;
  flushing = true;

  const snapEntries = [...pendingSnapshots.entries()];
  pendingSnapshots.clear();

  try {
    await Promise.all(
      snapEntries.map(async ([, snapshot]) => {
        try {
          await snapshotQueries.insertSnapshot(snapshot);
        } catch (err) {
          console.warn(
            `[WriteBuffer] snapshot flush failed account=${snapshot.account_id}:`,
            (err as Error).message
          );
        }
      })
    );
  } finally {
    flushing = false;
  }
}

export function startWriteBuffer(): void {
  if (timer) return;
  timer = setInterval(() => {
    flush().catch((err) => console.error('[WriteBuffer] flush error:', err));
  }, FLUSH_INTERVAL_MS);
  (timer as any).unref?.();
  console.log(`[WriteBuffer] started — snapshot flush every ${FLUSH_INTERVAL_MS}ms`);
}

export async function flushAndStop(): Promise<void> {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  await flush();
}

 *
 * Decouples position/snapshot DB writes from the ingestion hot path.
 *
 * WHY NO REDIS:
 *   - Positions are fully re-sent every connector sync; if the server restarts
 *     before a flush the next sync immediately replaces them. Zero data loss.
 *   - Snapshots are idempotent daily upserts; debouncing them by a few seconds
 *     costs nothing.
 *   - Closed trades (the only truly critical data) stay on the synchronous path.
 *   - An extra network hop + serialisation round-trip to Redis would add more
 *     latency than it saves at this scale.
 *
 * HOW IT WORKS:
 *   - ingestion.ts calls bufferPositions() / bufferSnapshot() — both are
 *     synchronous Map.set() calls, microseconds.
 *   - A setInterval (default 2 s, tunable via WRITE_BUFFER_FLUSH_MS) drains
 *     both maps to Postgres in the background.
 *   - Because the Map key is accountId, rapid syncs from the same account just
 *     overwrite the pending entry — only the *latest* state is ever written,
 *     exactly what you want for positions.
 */

import { positionQueries, snapshotQueries } from '../db/queries.js';
import { transaction } from '../db/connection.js';
import type { Position, DailySnapshot } from '../types/index.js';

export type PositionInput = Omit<Position, 'id' | 'updated_at_ms'>;
export type SnapshotInput = Omit<DailySnapshot, 'id'>;

const FLUSH_INTERVAL_MS = Math.max(
  500,
  Number(process.env.WRITE_BUFFER_FLUSH_MS) || 1000
);

// Latest state per account — newer writes simply overwrite older ones.
const pendingPositions = new Map<string, PositionInput[]>();
const pendingSnapshots = new Map<string, SnapshotInput>();

let flushing = false;
let timer: ReturnType<typeof setInterval> | null = null;

export function bufferPositions(accountId: string, positions: PositionInput[]): void {
  pendingPositions.set(accountId, positions);
}

export function bufferSnapshot(snapshot: SnapshotInput): void {
  pendingSnapshots.set(snapshot.account_id, snapshot);
}

export async function flush(): Promise<void> {
  if (flushing) return;
  if (pendingPositions.size === 0 && pendingSnapshots.size === 0) return;
  flushing = true;

  // Atomically snapshot+clear both maps so new ingestion writes don't get
  // accidentally consumed by a slow flush pass.
  const posEntries = [...pendingPositions.entries()];
  const snapEntries = [...pendingSnapshots.entries()];
  pendingPositions.clear();
  pendingSnapshots.clear();

  try {
    // Flush positions — each account's batch in its own transaction so one
    // failing account doesn't block others.
    await Promise.all(
      posEntries.map(async ([accountId, positions]) => {
        try {
          await transaction(async (client) => {
            await positionQueries.deleteByAccount(accountId, client);
            for (const pos of positions) {
              await positionQueries.upsertPosition(pos, client);
            }
          });
        } catch (err) {
          console.warn(
            `[WriteBuffer] position flush failed account=${accountId}:`,
            (err as Error).message
          );
        }
      })
    );

    // Flush snapshots (simple idempotent upserts, no transaction needed).
    await Promise.all(
      snapEntries.map(async ([, snapshot]) => {
        try {
          await snapshotQueries.insertSnapshot(snapshot);
        } catch (err) {
          console.warn(
            `[WriteBuffer] snapshot flush failed account=${snapshot.account_id}:`,
            (err as Error).message
          );
        }
      })
    );
  } finally {
    flushing = false;
  }
}

export function startWriteBuffer(): void {
  if (timer) return;
  timer = setInterval(() => {
    flush().catch((err) => console.error('[WriteBuffer] flush error:', err));
  }, FLUSH_INTERVAL_MS);
  // unref: timer won't prevent Node from exiting naturally
  (timer as any).unref?.();
  console.log(`[WriteBuffer] started — flush interval ${FLUSH_INTERVAL_MS}ms`);
}

/** Call on SIGTERM: stop accepting new flushes and drain whatever is pending. */
export async function flushAndStop(): Promise<void> {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  await flush();
}
