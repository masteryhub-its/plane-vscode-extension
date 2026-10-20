/** Remembers the answer for the latest key, so asking again with the same key costs nothing. A failure is not kept. */
export function createKeyedMemo<T>(): (key: string, load: () => Promise<T>) => Promise<T> {
  let remembered: { readonly key: string; readonly value: Promise<T> } | undefined;
  return (key: string, load: () => Promise<T>): Promise<T> => {
    if (remembered?.key === key) {
      return remembered.value;
    }
    const value = load();
    const entry = { key, value };
    remembered = entry;
    value.catch(() => {
      if (remembered === entry) {
        remembered = undefined;
      }
    });
    return value;
  };
}
