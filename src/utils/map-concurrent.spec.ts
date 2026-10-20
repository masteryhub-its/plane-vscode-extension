import { mapConcurrent } from './map-concurrent';

const tick = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('mapConcurrent', () => {
  it('returns the results in the order of the items, whichever finishes first', async () => {
    const result = await mapConcurrent([30, 5, 15], 3, async (delay) => {
      await tick(delay);
      return delay;
    });
    expect(result).toEqual([30, 5, 15]);
  });

  it('never runs more than the limit at once, but does run that many together', async () => {
    let active = 0;
    let peak = 0;
    await mapConcurrent(
      Array.from({ length: 12 }, (_, i) => i),
      4,
      async () => {
        active += 1;
        peak = Math.max(peak, active);
        await tick(5);
        active -= 1;
      }
    );
    expect(peak).toBe(4);
  });

  it('is faster than one at a time', async () => {
    const started = Date.now();
    await mapConcurrent([1, 2, 3, 4, 5, 6, 7, 8], 4, () => tick(20));
    expect(Date.now() - started).toBeLessThan(8 * 20);
  });

  it('passes the position of each item', async () => {
    expect(await mapConcurrent(['a', 'b'], 2, (item, index) => Promise.resolve(`${index}${item}`))).toEqual(['0a', '1b']);
  });

  it('returns nothing for no items and treats a limit below one as one', async () => {
    expect(await mapConcurrent([], 4, () => Promise.resolve(1))).toEqual([]);
    expect(await mapConcurrent([1, 2], 0, (item) => Promise.resolve(item))).toEqual([1, 2]);
  });

  it('fails with the first error', async () => {
    await expect(mapConcurrent([1, 2, 3], 2, (item) => (item === 2 ? Promise.reject(new Error('boom')) : Promise.resolve(item)))).rejects.toThrow('boom');
  });
});
