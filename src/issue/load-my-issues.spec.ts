import type { PlaneIssue } from '../client/plane.types';
import { loadMyIssues, type MyIssuesSource } from './load-my-issues';

function issue(id: string, assignee: string): PlaneIssue {
  return { id, assigneeIds: [assignee] } as unknown as PlaneIssue;
}

const tick = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function source(projectsBySlug: Readonly<Record<string, readonly string[]>>): MyIssuesSource {
  return {
    listWorkspaces: () => Promise.resolve(Object.keys(projectsBySlug).map((slug) => ({ slug }))),
    listProjects: (slug) => Promise.resolve((projectsBySlug[slug] ?? []).map((id) => ({ id }))),
  };
}

describe('loadMyIssues', () => {
  it('collects the issues assigned to the user across every workspace and project, in order', async () => {
    const result = await loadMyIssues(source({ one: ['a', 'b'], two: ['c'] }), (_slug, project) => Promise.resolve([issue(`${project}-mine`, 'me'), issue(`${project}-other`, 'someone')]), 'me');
    expect(result.issues.map((item) => item.id)).toEqual(['a-mine', 'b-mine', 'c-mine']);
    expect(result.failedProjects).toBe(0);
  });

  it('loads several projects at the same time, but never more than four', async () => {
    let active = 0;
    let peak = 0;
    const ids = Array.from({ length: 10 }, (_, i) => `p${i}`);
    await loadMyIssues(
      source({ ws: ids }),
      async () => {
        active += 1;
        peak = Math.max(peak, active);
        await tick(10);
        active -= 1;
        return [];
      },
      'me'
    );
    expect(peak).toBe(4);
  });

  it('keeps going when one project fails, and says how many did', async () => {
    const result = await loadMyIssues(
      source({ ws: ['good', 'bad', 'fine'] }),
      (_slug, project) => (project === 'bad' ? Promise.reject(new Error('offline')) : Promise.resolve([issue(project, 'me')])),
      'me'
    );
    expect(result.issues.map((item) => item.id)).toEqual(['good', 'fine']);
    expect(result.failedProjects).toBe(1);
  });

  it('fails outright when every project failed, so the caller can show why', async () => {
    await expect(loadMyIssues(source({ ws: ['a', 'b'] }), () => Promise.reject(new Error('offline')), 'me')).rejects.toThrow('offline');
  });

  it('returns nothing when there is nothing to load', async () => {
    expect(await loadMyIssues(source({}), () => Promise.resolve([]), 'me')).toEqual({ issues: [], failedProjects: 0 });
    expect(await loadMyIssues(source({ ws: [] }), () => Promise.resolve([]), 'me')).toEqual({ issues: [], failedProjects: 0 });
  });
});
