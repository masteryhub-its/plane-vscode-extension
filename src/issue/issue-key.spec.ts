import { formatIssueKey } from './issue-key';

describe('formatIssueKey', () => {
  it('joins identifier and sequence when both are present', () => {
    expect(formatIssueKey('MH', 42, 'issue-uuid')).toBe('MH-42');
  });

  it('falls back to a short id when the sequence is missing', () => {
    expect(formatIssueKey('', 0, 'abcdefghijklmnop')).toBe('abcdefgh');
  });
});
