import type { UpdateIssueStateInput } from '../client/plane.types';
import type { PlaneTreeIssueNode } from './tree-model';

export function bulkStateChangeInputs(issues: readonly PlaneTreeIssueNode[], stateId: string): readonly UpdateIssueStateInput[] {
  return issues.map((issue) => ({
    workspaceSlug: issue.workspaceSlug,
    projectId: issue.projectId,
    issueId: issue.issueId,
    stateId,
  }));
}
