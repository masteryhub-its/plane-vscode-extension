import type { PlaneIssue } from '../client/plane.types';
import { PlaneTreeKind } from '../utils/enums/plane-tree-kind.enum';
import { groupIssuesByState, parseIssueNode, parseIssueNodes, toCycleNode, toIssueNode, toModuleNode, toProjectNode, toStateNode, toWorkspaceNode } from './tree-model';

describe('tree-model', () => {
  const sampleIssue: PlaneIssue = {
    id: 'issue-1',
    name: 'Fix bug',
    descriptionHtml: '',
    sequenceId: 7,
    projectId: 'proj-1',
    workspaceSlug: 'acme',
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

describe('tree-model nodes', () => {
  it('labels a workspace by name, falling back to the slug', () => {
    expect(toWorkspaceNode({ id: 'w1', name: 'Acme Co', slug: 'acme' }).label).toBe('Acme Co');
    expect(toWorkspaceNode({ id: 'w1', name: '', slug: 'acme' }).label).toBe('acme');
  });

  it('labels a project with an optional emoji and its identifier', () => {
    expect(toProjectNode('acme', { id: 'p1', name: 'Core', identifier: 'MH', description: 'd', emoji: '🚀' }).label).toBe('🚀 Core (MH)');
    expect(toProjectNode('acme', { id: 'p1', name: 'Core', identifier: 'MH', description: '', emoji: '' }).label).toBe('Core (MH)');
  });

  it('builds state, cycle and module nodes', () => {
    expect(toStateNode('acme', 'p1', 's1', 'Todo')).toMatchObject({ kind: PlaneTreeKind.STATE, id: 's1', label: 'Todo' });
    expect(toCycleNode('acme', 'p1', { id: 'c1', name: 'Cycle 1', status: 'current', startDate: undefined, endDate: undefined })).toMatchObject({
      kind: PlaneTreeKind.CYCLE,
      id: 'c1',
      label: 'Cycle 1',
    });
    expect(toModuleNode('acme', 'p1', { id: 'm1', name: 'Auth', status: 'backlog' })).toMatchObject({ kind: PlaneTreeKind.MODULE, id: 'm1', label: 'Auth' });
  });

  it('parses several issue nodes and drops anything else', () => {
    const node = { kind: PlaneTreeKind.ISSUE, workspaceSlug: 'acme', projectId: 'p', issueId: 'i', label: 'MH-1 x' };
    expect(parseIssueNodes([node, { kind: PlaneTreeKind.PROJECT }, null, 'x', { kind: PlaneTreeKind.ISSUE, workspaceSlug: 1 }])).toEqual([node]);
  });

  it('carries what the tree needs to draw an issue row', () => {
    const base: PlaneIssue = {
      id: 'issue-1',
      name: 'Fix bug',
      descriptionHtml: '',
      descriptionPlain: '',
      sequenceId: 7,
      projectId: 'proj-1',
      workspaceSlug: 'acme',
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
      labelIds: [],
      labelNames: [],
    };
    const node = toIssueNode({
      ...base,
      stateGroup: 'started',
      priority: 'urgent',
      targetDate: '2026-09-25',
      assigneeNames: ['Ada'],
    });
    expect(node.presentable).toEqual({
      id: 'issue-1',
      name: 'Fix bug',
      projectIdentifier: 'MH',
      sequenceId: 7,
      stateName: 'Todo',
      stateGroup: 'started',
      priority: 'urgent',
      targetDate: '2026-09-25',
      assigneeNames: ['Ada'],
    });
  });
});
