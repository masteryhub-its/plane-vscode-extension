import { PlaneTreeKind } from '../utils/enums/plane-tree-kind.enum';
import type { PlaneTreeIssueNode } from './tree-model';
import { bulkStateChangeInputs } from './bulk-state';

describe('bulkStateChangeInputs', () => {
  it('maps selected issue nodes to PATCH inputs sharing one state', () => {
    const issues: readonly PlaneTreeIssueNode[] = [
      {
        kind: PlaneTreeKind.ISSUE,
        id: 'a',
        label: 'MH-1 A',
        workspaceSlug: 'masteryhub-its',
        projectId: 'proj-1',
        issueId: 'issue-1',
        sequenceId: 1,
        projectIdentifier: 'MH',
        stateName: 'Todo',
      },
      {
        kind: PlaneTreeKind.ISSUE,
        id: 'b',
        label: 'MH-2 B',
        workspaceSlug: 'masteryhub-its',
        projectId: 'proj-1',
        issueId: 'issue-2',
        sequenceId: 2,
        projectIdentifier: 'MH',
        stateName: 'Todo',
      },
    ];
    expect(bulkStateChangeInputs(issues, 'state-done')).toEqual([
      { workspaceSlug: 'masteryhub-its', projectId: 'proj-1', issueId: 'issue-1', stateId: 'state-done' },
      { workspaceSlug: 'masteryhub-its', projectId: 'proj-1', issueId: 'issue-2', stateId: 'state-done' },
    ]);
  });
});
