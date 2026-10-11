import { describe, expect, it, vi } from 'vitest';

import { mapWithConcurrency } from './async.utils';

describe('mapWithConcurrency', () => {
  it('returns an empty array for an empty input', async () => {
    const mapper = vi.fn();

    const result = await mapWithConcurrency([], mapper, 3);

    expect(result).toEqual([]);
    expect(mapper).not.toHaveBeenCalled();
  });

  it('clamps concurrency to the item count when concurrency exceeds it', async () => {
    let maxInFlight = 0;
    let inFlight = 0;

    const result = await mapWithConcurrency(
      [1, 2],
      async (item) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 10));
        inFlight -= 1;
        return item * 2;
      },
      10,
    );

    expect(result).toEqual([2, 4]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it('preserves result order regardless of completion timing', async () => {
    const delays = [30, 10, 20];

    const result = await mapWithConcurrency(
      delays,
      async (delay, index) => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return index;
      },
      3,
    );

    expect(result).toEqual([0, 1, 2]);
  });

  it('runs fully sequentially when concurrency is 1', async () => {
    let maxInFlight = 0;
    let inFlight = 0;

    await mapWithConcurrency(
      [1, 2, 3, 4],
      async (item) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return item;
      },
      1,
    );

    expect(maxInFlight).toBe(1);
  });

  it('caps max observed concurrency at the requested limit', async () => {
    let maxInFlight = 0;
    let inFlight = 0;

    await mapWithConcurrency(
      [1, 2, 3, 4, 5, 6],
      async (item) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return item;
      },
      2,
    );

    expect(maxInFlight).toBe(2);
  });

  it('clamps concurrency <= 0 to 1', async () => {
    let maxInFlight = 0;
    let inFlight = 0;

    await mapWithConcurrency(
      [1, 2, 3],
      async (item) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return item;
      },
      0,
    );

    expect(maxInFlight).toBe(1);
  });

  it('propagates a mapper rejection', async () => {
    await expect(
      mapWithConcurrency(
        [1, 2, 3],
        (item) =>
          item === 2
            ? Promise.reject(new Error('boom'))
            : Promise.resolve(item),
        2,
      ),
    ).rejects.toThrow('boom');
  });
});
