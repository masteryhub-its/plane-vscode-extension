export interface ProgressItem {
  readonly stateGroup?: string | undefined;
}

export interface SubIssueProgress {
  readonly done: number;
  readonly total: number;
  readonly percent: number;
}

/** Completed items out of everything that is not cancelled; an item with no known group counts as not done. */
export function subIssueProgress(items: readonly ProgressItem[]): SubIssueProgress {
  const counted = items.filter((item) => item.stateGroup !== 'cancelled');
  const done = counted.filter((item) => item.stateGroup === 'completed').length;
  const total = counted.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

function firstLetter(word: string): string {
  const [first] = Array.from(word);
  return first === undefined ? '' : first.toLocaleUpperCase();
}

/** One or two capital letters for an avatar. */
export function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/\s+/u)
    .map((word) => (word.includes('@') ? (word.split('@')[0] ?? '') : word))
    .filter((word) => word.length > 0);
  const first = words[0];
  if (first === undefined) {
    return '?';
  }
  const last = words.length > 1 ? words[words.length - 1] : undefined;
  return `${firstLetter(first)}${last === undefined ? '' : firstLetter(last)}`;
}
