import { parseCreateIssueDefaults } from './create-defaults';

describe('parseCreateIssueDefaults', () => {
  it('reads last workspace, project, and priority', () => {
    expect(parseCreateIssueDefaults({ workspaceSlug: 'masteryhub-its', projectId: 'proj-1', priority: 'high' })).toEqual({
      workspaceSlug: 'masteryhub-its',
      projectId: 'proj-1',
      priority: 'high',
    });
  });

  it('rejects incomplete records', () => {
    expect(parseCreateIssueDefaults({ workspaceSlug: 'masteryhub-its' })).toBeUndefined();
    expect(parseCreateIssueDefaults(null)).toBeUndefined();
  });
});
