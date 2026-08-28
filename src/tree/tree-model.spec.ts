import type { PlaneIssue } from '../client/plane.types';
import { PlaneTreeKind } from '../utils/enums/plane-tree-kind.enum';
import { groupIssuesByState, parseIssueNode, toIssueNode } from './tree-model';

describe('tree-model', () => {
  const sampleIssue: PlaneIssue = {
    id: 'issue-1',
    name: 'Fix bug',
    descriptionHtml: '',
    sequenceId: 7,
    projectId: 'proj-1',
    workspaceSlug: 'masteryhub-its',
    projectIdentifier: 'MH',
    stateId: 'state-1',
    stateName: 'Todo',
    priority: 'high',
    assigneeIds: [],
    assigneeNames: [],
    createdAt: '',
    updatedAt: '',
    targetDate: undefined,
    createdById: undefined,
    parentId: undefined,
    descriptionPlain: '',
    labelIds: [],
    labelNames: [],
  };

  it('builds issue node label with key', () => {
    expect(toIssueNode(sampleIssue).label).toBe('MH-7 Fix bug');
  });

  it('groups issues by state name', () => {
    const groups = groupIssuesByState([sampleIssue, { ...sampleIssue, id: 'issue-2', stateName: 'Done' }]);
    expect(groups.get('Todo')).toHaveLength(1);
    expect(groups.get('Done')).toHaveLength(1);
  });

  it('parses issue nodes', () => {
    const node = toIssueNode(sampleIssue);
    expect(parseIssueNode(node)?.issueId).toBe('issue-1');
    expect(parseIssueNode({ kind: PlaneTreeKind.WORKSPACE })).toBeUndefined();
  });
});
