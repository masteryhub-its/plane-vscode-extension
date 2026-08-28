import type { PlaneIssue } from '../client/plane.types';
import { applySavedFilter, parseSavedFilters, type SavedIssueFilter } from './saved-filters';

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

describe('applySavedFilter', () => {
  const issues = [
    issue({ id: 'a', name: 'Login bug', assigneeIds: ['u1'], stateName: 'Todo', labelIds: ['lab-1'] }),
    issue({ id: 'b', name: 'Docs', assigneeIds: ['u2'], stateName: 'Done', labelIds: [] }),
  ];

  it('filters by assignee, state, label, and text', () => {
    const filter: SavedIssueFilter = { id: 'f1', name: 'Mine', assigneeId: 'u1', stateName: 'Todo', labelId: 'lab-1', text: 'login' };
    expect(applySavedFilter(issues, filter).map((item) => item.id)).toEqual(['a']);
  });

  it('returns all issues when the filter has no constraints', () => {
    expect(applySavedFilter(issues, { id: 'f2', name: 'All' })).toHaveLength(2);
  });
});

describe('parseSavedFilters', () => {
  it('keeps well-formed filters and drops junk', () => {
    expect(parseSavedFilters([{ id: 'f1', name: 'Mine', assigneeId: 'u1' }, { name: 'no-id' }, 'x'])).toEqual([{ id: 'f1', name: 'Mine', assigneeId: 'u1' }]);
  });
});
