import type { IssueSearchHit } from './search-issues';

/** The search hit whose issue key is exactly `key` (for example ENG-12), or undefined. */
export function hitForKey(hits: readonly IssueSearchHit[], key: string): IssueSearchHit | undefined {
  const match = /^([a-z][a-z0-9]*)-(\d+)$/iu.exec(key.trim());
  if (match === null) {
    return undefined;
  }
  const identifier = (match[1] ?? '').toUpperCase();
  const sequenceId = Number(match[2]);
  return hits.find((candidate) => candidate.identifier.toUpperCase() === identifier && candidate.sequenceId === sequenceId);
}
