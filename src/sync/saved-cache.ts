import { createHash } from 'node:crypto';

export interface SavedRecord<T> {
  readonly version: 1;
  readonly savedAt: number;
  readonly serverUrl: string;
  /** A one-way fingerprint of the credential, so saved data is never shown to a different account. */
  readonly accountKey: string;
  readonly data: T;
}

export interface SavedContext {
  readonly serverUrl: string;
  readonly accountKey: string;
}

export interface SavedStore {
  /** The raw stored value; it is checked before use, so anything may come back. */
  read(): unknown;
  write(record: SavedRecord<unknown>): Promise<void>;
  clear(): Promise<void>;
}

/** A fingerprint that identifies the signed-in account without containing the secret. */
export function accountKeyOf(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function toSavedRecord<T>(context: SavedContext, data: T, now: number): SavedRecord<T> {
  return { version: 1, savedAt: now, serverUrl: context.serverUrl, accountKey: context.accountKey, data };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The saved record, or undefined when the stored value is damaged or belongs to another server or account. */
export function parseSavedRecord<T>(value: unknown, context: SavedContext, validate: (data: unknown) => T | undefined): SavedRecord<T> | undefined {
  if (!isRecord(value) || value['version'] !== 1 || value['serverUrl'] !== context.serverUrl || value['accountKey'] !== context.accountKey || typeof value['savedAt'] !== 'number') {
    return undefined;
  }
  const data = validate(value['data']);
  return data === undefined ? undefined : { version: 1, savedAt: value['savedAt'], serverUrl: context.serverUrl, accountKey: context.accountKey, data };
}

export type SavedSource = 'memory' | 'saved' | 'network';

export interface SavedResult<T> {
  readonly data: T;
  readonly source: SavedSource;
}

export interface SavedCacheOptions<T> {
  readonly store: SavedStore;
  /** Turns whatever was stored into the expected shape, or undefined when it is not usable. */
  readonly validate: (data: unknown) => T | undefined;
  readonly now: () => number;
  /** Called when a background refresh found something different from what was shown. */
  readonly onRefreshed: () => void;
  /** Called when a background refresh failed; the older data stays on screen. */
  readonly onRefreshFailed: (message: string) => void;
}

interface Held<T> {
  readonly context: SavedContext;
  readonly data: T;
  readonly fingerprint: string;
}

function sameContext(left: SavedContext, right: SavedContext): boolean {
  return left.serverUrl === right.serverUrl && left.accountKey === right.accountKey;
}

/**
 * Keeps data in three layers: memory, a saved copy on disk, and the network. A read answers from the fastest layer
 * that has data for this account. When it answers from the saved copy it refreshes from the network in the
 * background and tells the caller if anything changed, so a view appears at once and then corrects itself. Saved data
 * is only ever used for the same server and the same account.
 */
export class SavedCache<T> {
  private held: Held<T> | undefined;
  private refreshing = false;
  private generation = 0;

  public constructor(private readonly options: SavedCacheOptions<T>) {}

  public async read(context: SavedContext, loadFresh: () => Promise<T>): Promise<SavedResult<T>> {
    if (this.held !== undefined && sameContext(this.held.context, context)) {
      return { data: this.held.data, source: 'memory' };
    }
    const record = parseSavedRecord(this.options.store.read(), context, this.options.validate);
    if (record !== undefined) {
      this.hold(context, record.data);
      this.refreshInBackground(context, loadFresh);
      return { data: record.data, source: 'saved' };
    }
    const data = await loadFresh();
    this.hold(context, data);
    await this.save(context, data);
    return { data, source: 'network' };
  }

  /** Forgets what is in memory; the saved copy is kept, so the next read shows it and refreshes. */
  public invalidate(): void {
    this.held = undefined;
  }

  /** Forgets everything, including the saved copy. Used when signing out or reloading from scratch. */
  public async reset(): Promise<void> {
    this.generation += 1;
    this.held = undefined;
    await this.options.store.clear();
  }

  private hold(context: SavedContext, data: T): void {
    this.held = { context, data, fingerprint: JSON.stringify(data) };
  }

  private async save(context: SavedContext, data: T): Promise<void> {
    try {
      await this.options.store.write(toSavedRecord(context, data, this.options.now()));
    } catch {
      // Not being able to save only means the next start is not instant; the data itself is fine.
    }
  }

  private refreshInBackground(context: SavedContext, loadFresh: () => Promise<T>): void {
    if (this.refreshing) {
      return;
    }
    this.refreshing = true;
    const generation = this.generation;
    void loadFresh()
      .then(async (data) => {
        if (generation !== this.generation) {
          return;
        }
        const changed = this.held?.fingerprint !== JSON.stringify(data);
        this.hold(context, data);
        if (changed) {
          await this.save(context, data);
          this.options.onRefreshed();
        }
      })
      .catch((error: unknown) => {
        if (generation === this.generation) {
          this.options.onRefreshFailed(error instanceof Error ? error.message : 'Could not refresh');
        }
      })
      .finally(() => {
        this.refreshing = false;
      });
  }
}
