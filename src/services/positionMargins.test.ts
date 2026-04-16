import { describe, expect, it } from 'vitest';
import { allocateMissingPositionMargins } from './positionMargins.js';

describe('allocateMissingPositionMargins', () => {
  it('allocates account-level margin across positions when per-position margin is missing', () => {
    const result = allocateMissingPositionMargins([
      { size: 1, current_price: 100, margin: null },
      { size: 2, current_price: 100, margin: undefined },
    ], 300);

    expect(Number(result[0].margin)).toBeCloseTo(100, 6);
    expect(Number(result[1].margin)).toBeCloseTo(200, 6);
  });

  it('preserves existing positive margins and only allocates the remainder', () => {
    const result = allocateMissingPositionMargins([
      { size: 1, current_price: 100, margin: 40 },
      { size: 1, current_price: 100, margin: null },
      { size: 2, current_price: 100, margin: 0 },
    ], 200);

    expect(Number(result[0].margin)).toBeCloseTo(40, 6);
    expect(Number(result[1].margin)).toBeCloseTo(53.333333, 5);
    expect(Number(result[2].margin)).toBeCloseTo(106.666666, 5);
  });

  it('returns positions unchanged when total margin is unavailable', () => {
    const input = [
      { size: 1, current_price: 100, margin: null },
    ];

    const result = allocateMissingPositionMargins(input, 0);
    expect(result).toEqual(input);
  });
});