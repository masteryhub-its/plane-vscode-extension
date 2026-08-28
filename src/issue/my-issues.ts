import type { SidebarIssueSummary, SidebarWorkspaceSummary } from '../sidebar/sidebar.types';

export function myIssuesFromCatalog(catalog: readonly SidebarWorkspaceSummary[], userId: string): readonly SidebarIssueSummary[] {
  const issues: SidebarIssueSummary[] = [];
  for (const workspace of catalog) {
    for (const project of workspace.projects) {
      for (const issue of project.issues) {
        if (issue.assigneeIds.includes(userId)) {
          issues.push(issue);
        }
      }
    }
  }
  return issues;
}
