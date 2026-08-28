import type { PlaneClient } from '../client/plane-client';
import type { SidebarWorkspaceSummary } from './sidebar.types';

export async function loadSidebarCatalog(client: PlaneClient): Promise<readonly SidebarWorkspaceSummary[]> {
  const workspaces = await client.listWorkspaces();
  const catalog: SidebarWorkspaceSummary[] = [];

  for (const workspace of workspaces) {
    const projects = await client.listProjects(workspace.slug);
    const projectSummaries = [];
    for (const project of projects) {
      const issues = await client.listIssues(workspace.slug, project.id);
      projectSummaries.push({
        id: project.id,
        name: project.name,
        identifier: project.identifier,
        issues: issues.map((issue) => ({
          id: issue.id,
          key: issue.projectIdentifier.length > 0 && issue.sequenceId > 0 ? `${issue.projectIdentifier}-${issue.sequenceId}` : issue.id.slice(0, 8),
          title: issue.name,
          stateName: issue.stateName,
          assigneeIds: issue.assigneeIds,
          labelIds: issue.labelIds,
          workspaceSlug: workspace.slug,
          projectId: project.id,
        })),
      });
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
