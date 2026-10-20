import type { PlaneIssue } from '../client/plane.types';
import { BUILT_IN_TREE_FILTERS, filterIssues, matchesTreeFilter, parseTreeFilters, treeFilterById, type TreeFilter, type TreeFilterContext } from './tree-filter';

const NOW = new Date('2026-10-20T12:00:00Z');
const context: TreeFilterContext = { userId: 'me', now: NOW };

function issue(overrides: Partial<PlaneIssue> = {}): PlaneIssue {
  return {
    id: 'i1',
    name: 'Fix login timeout',
    descriptionHtml: '',
    descriptionPlain: '',
    sequenceId: 12,
    projectId: 'p',
    workspaceSlug: 'w',
    projectIdentifier: 'ENG',
    stateId: 's',
    stateName: 'In Progress',
    stateGroup: 'started',
    priority: 'high',
    assigneeIds: ['me'],
    assigneeNames: ['Me'],
    createdAt: '',
    updatedAt: '',
    targetDate: undefined,
    createdById: undefined,
    parentId: undefined,
    labelIds: [],
    labelNames: [],
    ...overrides,
  };
}

const filter = (overrides: Partial<TreeFilter>): TreeFilter => ({ id: 'f', name: 'F', ...overrides });

describe('matchesTreeFilter', () => {
  it('matches everything when the filter sets nothing', () => {
    expect(matchesTreeFilter(issue(), filter({}), context)).toBe(true);
  });

  it('mine: only issues assigned to the signed-in user', () => {
    expect(matchesTreeFilter(issue(), filter({ mine: true }), context)).toBe(true);
    expect(matchesTreeFilter(issue({ assigneeIds: ['other'] }), filter({ mine: true }), context)).toBe(false);
    expect(matchesTreeFilter(issue(), filter({ mine: true }), { now: NOW })).toBe(false);
  });

  it('unassigned: only issues nobody has', () => {
    expect(matchesTreeFilter(issue({ assigneeIds: [] }), filter({ unassigned: true }), context)).toBe(true);
    expect(matchesTreeFilter(issue(), filter({ unassigned: true }), context)).toBe(false);
  });

  it('priorities and state groups match any of the listed values', () => {
    expect(matchesTreeFilter(issue({ priority: 'urgent' }), filter({ priorities: ['urgent', 'high'] }), context)).toBe(true);
    expect(matchesTreeFilter(issue({ priority: 'low' }), filter({ priorities: ['urgent', 'high'] }), context)).toBe(false);
    expect(matchesTreeFilter(issue(), filter({ stateGroups: ['started'] }), context)).toBe(true);
    expect(matchesTreeFilter(issue({ stateGroup: 'completed' }), filter({ stateGroups: ['started'] }), context)).toBe(false);
    expect(matchesTreeFilter(issue({ stateGroup: '' }), filter({ stateGroups: ['started'] }), context)).toBe(false);
  });

  it('overdue: past its target date and not finished', () => {
    expect(matchesTreeFilter(issue({ targetDate: '2026-10-19' }), filter({ overdue: true }), context)).toBe(true);
    expect(matchesTreeFilter(issue({ targetDate: '2026-10-20' }), filter({ overdue: true }), context)).toBe(false);
    expect(matchesTreeFilter(issue({ targetDate: '2026-10-21' }), filter({ overdue: true }), context)).toBe(false);
    expect(matchesTreeFilter(issue({ targetDate: undefined }), filter({ overdue: true }), context)).toBe(false);
    expect(matchesTreeFilter(issue({ targetDate: '2026-10-01', stateGroup: 'completed' }), filter({ overdue: true }), context)).toBe(false);
    expect(matchesTreeFilter(issue({ targetDate: '2026-10-01', stateGroup: 'cancelled' }), filter({ overdue: true }), context)).toBe(false);
  });

  it('text matches the title or the key, ignoring case', () => {
    expect(matchesTreeFilter(issue(), filter({ text: 'LOGIN' }), context)).toBe(true);
    expect(matchesTreeFilter(issue(), filter({ text: 'eng-12' }), context)).toBe(true);
    expect(matchesTreeFilter(issue(), filter({ text: 'billing' }), context)).toBe(false);
    expect(matchesTreeFilter(issue(), filter({ text: '   ' }), context)).toBe(true);
  });

  it('needs every condition that is set', () => {
    expect(matchesTreeFilter(issue(), filter({ mine: true, priorities: ['low'] }), context)).toBe(false);
    expect(matchesTreeFilter(issue(), filter({ mine: true, priorities: ['high'], stateGroups: ['started'] }), context)).toBe(true);
  });
});

describe('filterIssues', () => {
  it('keeps everything when there is no filter', () => {
    const issues = [issue(), issue({ id: 'i2' })];
    expect(filterIssues(issues, undefined, context)).toBe(issues);
  });

  it('keeps only matching issues', () => {
    expect(filterIssues([issue(), issue({ id: 'i2', priority: 'low' })], filter({ priorities: ['high'] }), context).map((item) => item.id)).toEqual(['i1']);
  });
});

describe('built-in filters', () => {
  it('have unique ids and names', () => {
    expect(new Set(BUILT_IN_TREE_FILTERS.map((item) => item.id)).size).toBe(BUILT_IN_TREE_FILTERS.length);
    expect(BUILT_IN_TREE_FILTERS.every((item) => item.name.length > 0)).toBe(true);
  });

  it('only "mine" needs to know who you are', () => {
    expect(BUILT_IN_TREE_FILTERS.filter((item) => item.mine === true).map((item) => item.id)).toEqual(['mine', 'mine-in-progress']);
  });
});

describe('parseTreeFilters and treeFilterById', () => {
  it('keeps well-formed saved filters and drops the rest', () => {
    const parsed = parseTreeFilters([{ id: 'a', name: 'Mine', text: 'x' }, { id: 5 }, null, 'text', { id: 'b', name: 'B', priorities: ['high', 7], stateGroups: 'started', mine: 'yes' }]);
    expect(parsed).toEqual([
      { id: 'a', name: 'Mine', text: 'x' },
      { id: 'b', name: 'B', priorities: ['high'] },
    ]);
    expect(parseTreeFilters(undefined)).toEqual([]);
  });

  it('finds a filter among built-in and saved ones', () => {
    const saved: TreeFilter[] = [{ id: 'custom', name: 'Custom', text: 'x' }];
    expect(treeFilterById('custom', saved)?.name).toBe('Custom');
    expect(treeFilterById('overdue', saved)?.overdue).toBe(true);
    expect(treeFilterById('nope', saved)).toBeUndefined();
    expect(treeFilterById(undefined, saved)).toBeUndefined();
  });
});
