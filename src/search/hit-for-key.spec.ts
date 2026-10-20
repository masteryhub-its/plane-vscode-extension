import { hitForKey } from './hit-for-key';
import type { IssueSearchHit } from './search-issues';

const hit = (identifier: string, sequenceId: number): IssueSearchHit => ({
  workspaceSlug: 'w',
  projectId: 'p',
  issueId: `${identifier}${sequenceId}`,
  title: 't',
  identifier,
  sequenceId,
  stateName: 's',
  highlight: '',
});

describe('hitForKey', () => {
  it('finds the hit with exactly that key, ignoring case', () => {
    expect(hitForKey([hit('ENG', 1), hit('ENG', 12), hit('MH', 12)], 'eng-12')?.issueId).toBe('ENG12');
  });

  it('does not take a near match', () => {
    expect(hitForKey([hit('ENG', 123), hit('ENG', 1)], 'ENG-12')).toBeUndefined();
  });

  it('returns undefined for no hits or a malformed key', () => {
    expect(hitForKey([], 'ENG-12')).toBeUndefined();
    expect(hitForKey([hit('ENG', 1)], 'nonsense')).toBeUndefined();
  });
});
