import type { PlaneIssue } from '../client/plane.types';
import type { IssueHoverTitle } from '../issue/hover-title';
import { CATALOG_TTL_MS, CatalogCache } from './catalog-cache';

export interface IssueLister {
  listIssues(workspaceSlug: string, projectId: string): Promise<readonly PlaneIssue[]>;
}

export class IssueListCache {
  private readonly cache = new CatalogCache<readonly PlaneIssue[]>(CATALOG_TTL_MS);
  private titles: IssueHoverTitle[] = [];

  public async listIssues(lister: IssueLister, workspaceSlug: string, projectId: string, now: number): Promise<readonly PlaneIssue[]> {
    const key = `${workspaceSlug}:${projectId}`;
    const cached = this.cache.get(key, now);
    if (cached !== undefined) {
      return cached;
    }
    const issues = await lister.listIssues(workspaceSlug, projectId);
    this.cache.set(key, issues, now);
    this.mergeTitles(issues);
    return issues;
  }

  public hoverTitles(): readonly IssueHoverTitle[] {
    return this.titles;
  }

  public invalidate(): void {
    this.cache.invalidate();
    this.titles = [];
  }

  private mergeTitles(issues: readonly PlaneIssue[]): void {
    const next = [...this.titles];
    for (const issue of issues) {
      const index = next.findIndex((item) => item.projectIdentifier === issue.projectIdentifier && item.sequenceId === issue.sequenceId);
      const title: IssueHoverTitle = { projectIdentifier: issue.projectIdentifier, sequenceId: issue.sequenceId, name: issue.name };
      if (index === -1) {
        next.push(title);
      } else {
        next[index] = title;
      }
    }
    this.titles = next;
  }
}
