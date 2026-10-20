import type * as vscode from 'vscode';
import type { SavedRecord, SavedStore } from '../sync/saved-cache';

/** Keeps one saved view in the editor's own saved state, which is private to this machine and user. */
export class GlobalStateSavedStore implements SavedStore {
  public constructor(
    private readonly memento: vscode.Memento,
    private readonly key: string
  ) {}

  public read(): unknown {
    return this.memento.get<unknown>(this.key);
  }

  public async write(record: SavedRecord<unknown>): Promise<void> {
    await this.memento.update(this.key, record);
  }

  public async clear(): Promise<void> {
    await this.memento.update(this.key, undefined);
  }
}
