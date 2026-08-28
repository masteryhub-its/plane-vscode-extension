import { CatalogCache, CATALOG_TTL_MS } from './catalog-cache';

describe('CatalogCache', () => {
  it('returns a stored value before the TTL expires', () => {
    const cache = new CatalogCache<string>(CATALOG_TTL_MS);
    cache.set('proj-1', 'issues', 1_000);
    expect(cache.get('proj-1', 1_000 + CATALOG_TTL_MS - 1)).toBe('issues');
  });

  it('misses after the TTL and after invalidate', () => {
    const cache = new CatalogCache<string>(CATALOG_TTL_MS);
    cache.set('proj-1', 'issues', 1_000);
    expect(cache.get('proj-1', 1_000 + CATALOG_TTL_MS)).toBeUndefined();
    cache.set('proj-1', 'issues', 1_000);
    cache.invalidate();
    expect(cache.get('proj-1', 1_000)).toBeUndefined();
  });
});
