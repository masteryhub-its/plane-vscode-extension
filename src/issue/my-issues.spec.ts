import { myIssuesFromCatalog } from './my-issues';
import type { SidebarWorkspaceSummary } from '../sidebar/sidebar.types';

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
          { id: 'i1', key: 'MH-1', title: 'Mine', stateName: 'Todo', assigneeIds: ['u1'], labelIds: [], workspaceSlug: 'acme', projectId: 'p1' },
          { id: 'i2', key: 'MH-2', title: 'Theirs', stateName: 'Todo', assigneeIds: ['u2'], labelIds: [], workspaceSlug: 'acme', projectId: 'p1' },
        ],
      },
    ],
  },
];

describe('myIssuesFromCatalog', () => {
  it('returns issues assigned to the current user', () => {
    expect(myIssuesFromCatalog(catalog, 'u1').map((issue) => issue.id)).toEqual(['i1']);
  });
});
