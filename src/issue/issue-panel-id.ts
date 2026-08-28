export function issuePanelId(workspaceSlug: string, projectId: string, issueId: string): string {
  return `plane.issue.${workspaceSlug}.${projectId}.${issueId}`;
}
