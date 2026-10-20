import { accountKeyOf, parseSavedRecord, SavedCache, toSavedRecord, type SavedRecord, type SavedStore } from './saved-cache';

const CONTEXT = { serverUrl: 'https://plane.example', accountKey: 'acct' };

const asStrings = (value: unknown): readonly string[] | undefined => (Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined);

class MemoryStore implements SavedStore {
  public value: unknown;
  public writes: SavedRecord<readonly string[]>[] = [];
  public failWrites = false;

  public read(): unknown {
    return this.value;
  }

  public write(record: SavedRecord<unknown>): Promise<void> {
    if (this.failWrites) {
      return Promise.reject(new Error('disk full'));
    }
    this.writes.push(record as SavedRecord<readonly string[]>);
    this.value = JSON.parse(JSON.stringify(record));
    return Promise.resolve();
  }

  public clear(): Promise<void> {
    this.value = undefined;
    return Promise.resolve();
  }
}

interface Deferred {
  readonly promise: Promise<readonly string[]>;
  resolve(value: readonly string[]): void;
}

function deferred(): Deferred {
  let resolve!: (value: readonly string[]) => void;
  const promise = new Promise<readonly string[]>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

interface Harness {
  readonly cache: SavedCache<readonly string[]>;
  readonly store: MemoryStore;
  readonly refreshed: number[];
  readonly failures: string[];
}

function harness(store: MemoryStore = new MemoryStore()): Harness {
  const refreshed: number[] = [];
  const failures: string[] = [];
  const cache = new SavedCache<readonly string[]>({
    store,
    validate: asStrings,
    now: () => 1000,
    onRefreshed: () => refreshed.push(1),
    onRefreshFailed: (message) => failures.push(message),
  });
  return { cache, store, refreshed, failures };
}

function saved(items: readonly string[]): unknown {
  return JSON.parse(JSON.stringify(toSavedRecord(CONTEXT, items, 1)));
}

describe('accountKeyOf', () => {
  it('differs per secret, is stable, and does not contain the secret', () => {
    expect(accountKeyOf('secret-one')).toBe(accountKeyOf('secret-one'));
    expect(accountKeyOf('secret-one')).not.toBe(accountKeyOf('secret-two'));
    expect(accountKeyOf('secret-one')).toMatch(/^[0-9a-f]{64}$/u);
    expect(accountKeyOf('secret-one')).not.toContain('secret');
  });
});

describe('saved records', () => {
  it('round-trip for the same server and account', () => {
    expect(parseSavedRecord(saved(['a', 'b']), CONTEXT, asStrings)).toEqual({ version: 1, savedAt: 1, ...CONTEXT, data: ['a', 'b'] });
  });

  it('are not used for another server or another account', () => {
    expect(parseSavedRecord(saved(['a']), { ...CONTEXT, serverUrl: 'https://other.example' }, asStrings)).toBeUndefined();
    expect(parseSavedRecord(saved(['a']), { ...CONTEXT, accountKey: 'someone-else' }, asStrings)).toBeUndefined();
  });

  it.each([undefined, null, 'text', 5, [], {}, { version: 2 }, { version: 1, ...CONTEXT, savedAt: 1 }, { version: 1, ...CONTEXT, savedAt: 1, data: [1, 2] }])(
    'ignore a stored value that is damaged: %j',
    (value) => {
      expect(parseSavedRecord(value, CONTEXT, asStrings)).toBeUndefined();
    }
  );
});

describe('SavedCache', () => {
  it('loads from the network the first time and saves what it got', async () => {
    const { cache, store } = harness();
    const result = await cache.read(CONTEXT, () => Promise.resolve(['one']));
    expect(result).toEqual({ data: ['one'], source: 'network' });
    expect(store.writes).toHaveLength(1);
  });

  it('answers from memory afterwards without asking the network again', async () => {
    const { cache } = harness();
    await cache.read(CONTEXT, () => Promise.resolve(['one']));
    let loads = 0;
    const second = await cache.read(CONTEXT, () => {
      loads += 1;
      return Promise.resolve(['two']);
    });
    expect(second).toEqual({ data: ['one'], source: 'memory' });
    expect(loads).toBe(0);
  });

  it('after a restart, shows the saved data at once and refreshes in the background', async () => {
    const store = new MemoryStore();
    store.value = saved(['saved']);
    const { cache, refreshed } = harness(store);
    const fresh = deferred();
    const result = await cache.read(CONTEXT, () => fresh.promise);
    expect(result).toEqual({ data: ['saved'], source: 'saved' });
    expect(refreshed).toHaveLength(0);
    fresh.resolve(['newer']);
    await flush();
    expect(refreshed).toHaveLength(1);
    expect(await cache.read(CONTEXT, () => Promise.reject(new Error('not called')))).toEqual({ data: ['newer'], source: 'memory' });
    expect(store.writes.at(-1)?.data).toEqual(['newer']);
  });

  it('does not announce a refresh when nothing changed', async () => {
    const store = new MemoryStore();
    store.value = saved(['same']);
    const { cache, refreshed } = harness(store);
    await cache.read(CONTEXT, () => Promise.resolve(['same']));
    await flush();
    expect(refreshed).toHaveLength(0);
  });

  it('keeps the saved data and says why when the refresh fails', async () => {
    const store = new MemoryStore();
    store.value = saved(['saved']);
    const { cache, failures } = harness(store);
    await cache.read(CONTEXT, () => Promise.reject(new Error('Cannot reach the server')));
    await flush();
    expect(failures).toEqual(['Cannot reach the server']);
    expect((await cache.read(CONTEXT, () => Promise.reject(new Error('x')))).data).toEqual(['saved']);
  });

  it('starts only one refresh however many times it is read meanwhile', async () => {
    const store = new MemoryStore();
    store.value = saved(['saved']);
    const { cache } = harness(store);
    const fresh = deferred();
    let loads = 0;
    const load = (): Promise<readonly string[]> => {
      loads += 1;
      return fresh.promise;
    };
    await cache.read(CONTEXT, load);
    cache.invalidate();
    await cache.read(CONTEXT, load);
    expect(loads).toBe(1);
    fresh.resolve(['saved']);
    await flush();
  });

  it('invalidate forgets memory, so the next read shows the saved data and refreshes again', async () => {
    const { cache } = harness();
    await cache.read(CONTEXT, () => Promise.resolve(['one']));
    cache.invalidate();
    const fresh = deferred();
    expect((await cache.read(CONTEXT, () => fresh.promise)).source).toBe('saved');
    fresh.resolve(['one']);
    await flush();
  });

  it('reset forgets the saved data as well, so the next read waits for the network', async () => {
    const { cache, store } = harness();
    await cache.read(CONTEXT, () => Promise.resolve(['one']));
    await cache.reset();
    expect(store.value).toBeUndefined();
    expect(await cache.read(CONTEXT, () => Promise.resolve(['two']))).toEqual({ data: ['two'], source: 'network' });
  });

  it('never shows one account’s data to another account or server', async () => {
    const { cache } = harness();
    await cache.read(CONTEXT, () => Promise.resolve(['mine']));
    expect(await cache.read({ ...CONTEXT, accountKey: 'someone-else' }, () => Promise.resolve(['theirs']))).toEqual({ data: ['theirs'], source: 'network' });
    expect((await cache.read({ serverUrl: 'https://other.example', accountKey: 'acct' }, () => Promise.resolve(['elsewhere']))).source).toBe('network');
  });

  it('ignores the answer of a refresh that was started before a reset', async () => {
    const store = new MemoryStore();
    store.value = saved(['saved']);
    const { cache, refreshed } = harness(store);
    const stale = deferred();
    await cache.read(CONTEXT, () => stale.promise);
    await cache.reset();
    stale.resolve(['from before the reset']);
    await flush();
    expect(refreshed).toHaveLength(0);
    expect(store.value).toBeUndefined();
  });

  it('still returns the data when saving it fails', async () => {
    const store = new MemoryStore();
    store.failWrites = true;
    expect((await harness(store).cache.read(CONTEXT, () => Promise.resolve(['one']))).data).toEqual(['one']);
  });

  it('passes a failure on when there is nothing saved to fall back to', async () => {
    await expect(harness().cache.read(CONTEXT, () => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
  });
});
