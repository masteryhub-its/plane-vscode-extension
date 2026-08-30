import type { PlaneClient } from '../client/plane-client';
import type { PlaneIssue, PlaneProject } from '../client/plane.types';
import type { SidebarIssueSummary, SidebarProjectSummary, SidebarWorkspaceSummary } from './sidebar.types';

export interface LoadSidebarCatalogOptions {
  readonly includeIssues: boolean;
}

function issueKey(issue: PlaneIssue): string {
  return issue.projectIdentifier.length > 0 && issue.sequenceId > 0 ? `${issue.projectIdentifier}-${issue.sequenceId}` : issue.id.slice(0, 8);
}

function toIssueSummary(issue: PlaneIssue, workspaceSlug: string, projectId: string): SidebarIssueSummary {
  return {
    id: issue.id,
    key: issueKey(issue),
    title: issue.name,
    stateName: issue.stateName,
    assigneeIds: issue.assigneeIds,
    labelIds: issue.labelIds,
    workspaceSlug,
    projectId,
  };
}

async function projectSummary(client: PlaneClient, workspaceSlug: string, project: PlaneProject, includeIssues: boolean): Promise<SidebarProjectSummary> {
  let issues: readonly SidebarIssueSummary[] = [];
  if (includeIssues) {
    try {
      const rawIssues = await client.listIssues(workspaceSlug, project.id);
      issues = rawIssues.map((issue) => toIssueSummary(issue, workspaceSlug, project.id));
    } catch {
      issues = [];
    }
  }
  return {
    id: project.id,
    name: project.name,
    identifier: project.identifier,
    issues,
  };
}

export async function loadSidebarCatalog(client: PlaneClient, options?: LoadSidebarCatalogOptions): Promise<readonly SidebarWorkspaceSummary[]> {
  const includeIssues = options?.includeIssues !== false;
  const workspaces = await client.listWorkspaces();
  const catalog: SidebarWorkspaceSummary[] = [];

  for (const workspace of workspaces) {
    const projects = await client.listProjects(workspace.slug);
    const projectSummaries: SidebarProjectSummary[] = [];
    for (const project of projects) {
      projectSummaries.push(await projectSummary(client, workspace.slug, project, includeIssues));
    }
    catalog.push({
      id: workspace.id,
      slug: workspace.slug,
      label: workspace.name.length > 0 ? workspace.name : workspace.slug,
      projects: projectSummaries,
    });
  }

  return catalog;
}
