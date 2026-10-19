import { PlaneTreeKind } from '../utils/enums/plane-tree-kind.enum';
import type { PlaneTreeIssueNode } from './tree-model';
import { groupIssuesByProject } from './bulk-state';

function issueNode(id: string, workspaceSlug: string, projectId: string): PlaneTreeIssueNode {
  return {
    kind: PlaneTreeKind.ISSUE,
    id,
    label: `${id} title`,
    workspaceSlug,
    projectId,
    issueId: id,
    sequenceId: 1,
    projectIdentifier: 'MH',
    stateName: 'Todo',
  };
}

describe('groupIssuesByProject', () => {
  it('groups issues by workspace and project', () => {
    const groups = groupIssuesByProject([issueNode('a', 'ws-1', 'proj-1'), issueNode('b', 'ws-1', 'proj-1'), issueNode('c', 'ws-1', 'proj-2'), issueNode('d', 'ws-2', 'proj-1')]);
    expect(groups).toHaveLength(3);
    expect(groups[0]?.issues.map((issue) => issue.issueId)).toEqual(['a', 'b']);
    expect(groups[1]?.projectId).toBe('proj-2');
    expect(groups[2]?.workspaceSlug).toBe('ws-2');
  });

  it('returns an empty list for no issues', () => {
    expect(groupIssuesByProject([])).toEqual([]);
  });
});
