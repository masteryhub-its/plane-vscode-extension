import type { PlaneClient } from '../client/plane-client';
import type { PlaneIssue, PlaneWorkspace } from '../client/plane.types';

export interface SearchIssuesInput {
  readonly client: PlaneClient;
  readonly workspaces: readonly PlaneWorkspace[];
  readonly keyword: string;
  readonly defaultProjectId: string | undefined;
}

export interface IssueSearchHit {
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
  readonly title: string;
  readonly identifier: string;
  readonly sequenceId: number;
  readonly stateName: string;
  readonly highlight: string;
}

function matchesKeyword(issue: PlaneIssue, needle: string): boolean {
  const lower = needle.toLowerCase();
  const key = `${issue.projectIdentifier}-${issue.sequenceId}`.toLowerCase();
  return issue.name.toLowerCase().includes(lower) || key.includes(lower) || issue.descriptionHtml.toLowerCase().includes(lower);
}

function toHit(issue: PlaneIssue): IssueSearchHit {
  const key = issue.projectIdentifier.length > 0 && issue.sequenceId > 0 ? `${issue.projectIdentifier}-${issue.sequenceId}` : issue.id.slice(0, 8);
  return {
    workspaceSlug: issue.workspaceSlug,
    projectId: issue.projectId,
    issueId: issue.id,
    title: issue.name,
    identifier: issue.projectIdentifier,
    sequenceId: issue.sequenceId,
    stateName: issue.stateName,
    highlight: `${key} · ${issue.stateName}`,
  };
}

export async function searchIssues(input: SearchIssuesInput): Promise<readonly IssueSearchHit[]> {
  const keyword = input.keyword.trim();
  if (keyword.length === 0) {
    return [];
  }

  const hits: IssueSearchHit[] = [];
  for (const workspace of input.workspaces) {
    const remote = await input.client.searchWorkspace(workspace.slug, keyword);
    const scoped = input.defaultProjectId !== undefined && input.defaultProjectId.length > 0 ? remote.filter((hit) => hit.projectId === input.defaultProjectId) : remote;
    if (scoped.length > 0) {
      hits.push(...scoped);
      continue;
    }
    const projects = await input.client.listProjects(workspace.slug);
    for (const project of projects) {
      if (input.defaultProjectId !== undefined && input.defaultProjectId.length > 0 && project.id !== input.defaultProjectId) {
        continue;
      }
      const issues = await input.client.listIssues(workspace.slug, project.id, { search: keyword });
      for (const issue of issues) {
        if (matchesKeyword(issue, keyword)) {
          hits.push(toHit(issue));
        }
      }
    }
  }
  return hits;
}
