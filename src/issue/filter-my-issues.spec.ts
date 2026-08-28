import type { PlaneIssue } from '../client/plane.types';
import { assignedToUser, createdByUser } from './filter-my-issues';

function issue(partial: Partial<PlaneIssue> & Pick<PlaneIssue, 'id' | 'name'>): PlaneIssue {
  return {
    descriptionHtml: '',
    descriptionPlain: '',
    sequenceId: 1,
    projectId: 'proj-1',
    workspaceSlug: 'masteryhub-its',
    projectIdentifier: 'MH',
    stateId: 'state-1',
    stateName: 'Todo',
    priority: 'none',
    assigneeIds: [],
    assigneeNames: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02',
    targetDate: undefined,
    createdById: undefined,
    parentId: undefined,
    labelIds: [],
    labelNames: [],
    ...partial,
  };
}

describe('assignedToUser', () => {
  it('keeps issues where the user is an assignee', () => {
    const mine = assignedToUser(
      [issue({ id: 'a', name: 'Mine', assigneeIds: ['u1'] }), issue({ id: 'b', name: 'Theirs', assigneeIds: ['u2'] }), issue({ id: 'c', name: 'Both', assigneeIds: ['u2', 'u1'] })],
      'u1'
    );
    expect(mine.map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('returns an empty list when nothing is assigned', () => {
    expect(assignedToUser([issue({ id: 'a', name: 'Open', assigneeIds: [] })], 'u1')).toEqual([]);
  });
});

describe('createdByUser', () => {
  it('keeps issues the user created', () => {
    const mine = createdByUser([issue({ id: 'a', name: 'Mine', createdById: 'u1' }), issue({ id: 'b', name: 'Theirs', createdById: 'u2' })], 'u1');
    expect(mine.map((item) => item.id)).toEqual(['a']);
  });
});
