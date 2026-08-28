import type { SavedIssueFilter } from '../filter/saved-filters';
import { filterSidebarCatalog } from './filter-catalog';
import type { SidebarWorkspaceSummary } from './sidebar.types';

const catalog: readonly SidebarWorkspaceSummary[] = [
  {
    id: 'w1',
    slug: 'acme',
    label: 'Acme',
    projects: [
      {
        id: 'p1',
        name: 'Core',
        identifier: 'MH',
        issues: [
          { id: 'i1', key: 'MH-1', title: 'Login bug', stateName: 'Todo', assigneeIds: ['u1'], labelIds: ['lab-1'], workspaceSlug: 'acme', projectId: 'p1' },
          { id: 'i2', key: 'MH-2', title: 'Docs', stateName: 'Done', assigneeIds: ['u2'], labelIds: [], workspaceSlug: 'acme', projectId: 'p2' },
        ],
      },
    ],
  },
];

describe('filterSidebarCatalog', () => {
  it('keeps issues that match a saved filter', () => {
    const filter: SavedIssueFilter = { id: 'f1', name: 'Mine', assigneeId: 'u1', text: 'login' };
    const filtered = filterSidebarCatalog(catalog, filter);
    expect(filtered[0]?.projects[0]?.issues.map((issue) => issue.id)).toEqual(['i1']);
  });

  it('returns the catalog unchanged when no filter is active', () => {
    expect(filterSidebarCatalog(catalog, undefined)[0]?.projects[0]?.issues).toHaveLength(2);
  });
});
