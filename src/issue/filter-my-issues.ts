import type { PlaneIssue } from '../client/plane.types';

export function assignedToUser(issues: readonly PlaneIssue[], userId: string): readonly PlaneIssue[] {
  return issues.filter((issue) => issue.assigneeIds.includes(userId));
}

export function createdByUser(issues: readonly PlaneIssue[], userId: string): readonly PlaneIssue[] {
  return issues.filter((issue) => issue.createdById === userId);
}
