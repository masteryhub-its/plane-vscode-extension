import { buildIssueBrowseUrl, buildIssueProjectUrl, buildIssueUrl } from './issue-url';

describe('issue-url', () => {
  it('prefers browse URL when identifier and sequence exist', () => {
    expect(
      buildIssueUrl('https://plane.masteryhub-its.com', {
        workspaceSlug: 'masteryhub-its',
        projectId: 'proj-1',
        issueId: 'issue-1',
        projectIdentifier: 'MH',
        sequenceId: 42,
      })
    ).toBe('https://plane.masteryhub-its.com/masteryhub-its/browse/MH-42/');
  });

  it('falls back to project issue URL', () => {
    expect(
      buildIssueUrl('https://plane.masteryhub-its.com/', {
        workspaceSlug: 'masteryhub-its',
        projectId: 'proj-1',
        issueId: 'issue-1',
        projectIdentifier: '',
        sequenceId: 0,
      })
    ).toBe('https://plane.masteryhub-its.com/masteryhub-its/projects/proj-1/issues/issue-1/');
  });

  it('builds browse and project URLs directly', () => {
    expect(buildIssueBrowseUrl({ serverUrl: 'https://plane.test', workspaceSlug: 'acme', projectIdentifier: 'AC', sequenceId: 7 })).toBe('https://plane.test/acme/browse/AC-7/');
    expect(buildIssueProjectUrl({ serverUrl: 'https://plane.test', workspaceSlug: 'acme', projectId: 'p1', issueId: 'i1' })).toBe('https://plane.test/acme/projects/p1/issues/i1/');
  });
});
