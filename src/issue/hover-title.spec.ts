import { hoverTitleForIssueKey } from './hover-title';

describe('hoverTitleForIssueKey', () => {
  it('returns the issue name for a matching identifier and sequence', () => {
    expect(
      hoverTitleForIssueKey(
        [
          { projectIdentifier: 'MH', sequenceId: 42, name: 'Fix login' },
          { projectIdentifier: 'MH', sequenceId: 7, name: 'Docs' },
        ],
        { identifier: 'MH', sequenceId: 42 }
      )
    ).toBe('Fix login');
  });

  it('returns undefined when the key is not in the catalog', () => {
    expect(hoverTitleForIssueKey([{ projectIdentifier: 'MH', sequenceId: 1, name: 'Fix login' }], { identifier: 'MH', sequenceId: 99 })).toBeUndefined();
  });
});
