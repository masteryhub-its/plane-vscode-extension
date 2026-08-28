import { issueMatchesSavedFilter, type SavedIssueFilter } from '../filter/saved-filters';
import type { SidebarWorkspaceSummary } from './sidebar.types';

export function filterSidebarCatalog(workspaces: readonly SidebarWorkspaceSummary[], filter: SavedIssueFilter | undefined): readonly SidebarWorkspaceSummary[] {
  if (filter === undefined) {
    return workspaces;
  }
  return workspaces.map((workspace) => ({
    ...workspace,
    projects: workspace.projects.map((project) => ({
      ...project,
      issues: project.issues.filter((issue) =>
        issueMatchesSavedFilter(
          {
            name: issue.title,
            assigneeIds: issue.assigneeIds,
            stateName: issue.stateName,
            labelIds: issue.labelIds,
          },
          filter
        )
      ),
    })),
  }));
}
