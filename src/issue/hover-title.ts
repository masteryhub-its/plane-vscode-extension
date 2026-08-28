export interface IssueKeyRef {
  readonly identifier: string;
  readonly sequenceId: number;
}

export interface IssueHoverTitle {
  readonly projectIdentifier: string;
  readonly sequenceId: number;
  readonly name: string;
}

export function hoverTitleForIssueKey(issues: readonly IssueHoverTitle[], key: IssueKeyRef): string | undefined {
  const match = issues.find((issue) => issue.projectIdentifier === key.identifier && issue.sequenceId === key.sequenceId);
  return match?.name;
}
