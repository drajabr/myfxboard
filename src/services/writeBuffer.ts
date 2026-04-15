/**
 * writeBuffer.ts
 *
 * Buffers snapshot DB writes so they don't block the ingestion hot path.
 *
 * Positions are now held entirely in positionCache (in-memory) and are never
 * written to the DB during normal operation â€” only on graceful shutdown via
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
  console.log(`[WriteBuffer] started â€” snapshot flush every ${FLUSH_INTERVAL_MS}ms`);
}

export async function flushAndStop(): Promise<void> {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  await flush();
}

