import { issuePanelId } from './issue-panel-id';

describe('issuePanelId', () => {
  it('builds stable panel id', () => {
    expect(issuePanelId('masteryhub-its', 'proj-1', 'issue-1')).toBe('plane.issue.masteryhub-its.proj-1.issue-1');
  });
});
