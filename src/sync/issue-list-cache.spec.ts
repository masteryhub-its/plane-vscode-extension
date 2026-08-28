import { IssueListCache } from './issue-list-cache';
import type { PlaneIssue } from '../client/plane.types';
import { CATALOG_TTL_MS } from './catalog-cache';

function issue(id: string): PlaneIssue {
  return {
    id,
    name: id,
    descriptionHtml: '',
    descriptionPlain: '',
    sequenceId: 1,
    projectId: 'proj-1',
    workspaceSlug: 'masteryhub-its',
    projectIdentifier: 'MH',
    stateId: 's1',
    stateName: 'Todo',
    priority: 'none',
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
}

describe('IssueListCache', () => {
  it('reuses listIssues within the TTL and refetches after invalidate', async () => {
    let calls = 0;
    const lister = {
      listIssues: (): Promise<readonly PlaneIssue[]> => {
        calls += 1;
        return Promise.resolve([issue(`i${calls}`)]);
      },
    };
    const cache = new IssueListCache();
    const first = await cache.listIssues(lister, 'masteryhub-its', 'proj-1', 1_000);
    const second = await cache.listIssues(lister, 'masteryhub-its', 'proj-1', 1_000 + CATALOG_TTL_MS - 1);
    expect(first[0]?.id).toBe('i1');
    expect(second[0]?.id).toBe('i1');
    expect(calls).toBe(1);
    cache.invalidate();
    const third = await cache.listIssues(lister, 'masteryhub-its', 'proj-1', 1_000);
    expect(third[0]?.id).toBe('i2');
    expect(calls).toBe(2);
  });
});
