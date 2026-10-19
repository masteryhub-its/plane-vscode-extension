import type { PlaneTreeIssueNode } from './tree-model';

export interface BulkStateProjectGroup {
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issues: readonly PlaneTreeIssueNode[];
}

export function groupIssuesByProject(issues: readonly PlaneTreeIssueNode[]): readonly BulkStateProjectGroup[] {
  const groups = new Map<string, { workspaceSlug: string; projectId: string; issues: PlaneTreeIssueNode[] }>();
  for (const issue of issues) {
    const key = `${issue.workspaceSlug}:${issue.projectId}`;
    const existing = groups.get(key);
    if (existing !== undefined) {
      existing.issues.push(issue);
    } else {
      groups.set(key, { workspaceSlug: issue.workspaceSlug, projectId: issue.projectId, issues: [issue] });
    }
  }
  return [...groups.values()];
}
