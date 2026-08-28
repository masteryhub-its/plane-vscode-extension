import type { IssueRef } from './plane.types';

export interface BuildIssueBrowseUrlInput {
  readonly serverUrl: string;
  readonly workspaceSlug: string;
  readonly projectIdentifier: string;
  readonly sequenceId: number;
}

export interface BuildIssueProjectUrlInput {
  readonly serverUrl: string;
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
}

export function buildIssueBrowseUrl(input: BuildIssueBrowseUrlInput): string {
  const base = input.serverUrl.replace(/\/+$/u, '');
  return `${base}/${input.workspaceSlug}/browse/${input.projectIdentifier}-${input.sequenceId}/`;
}

export function buildIssueProjectUrl(input: BuildIssueProjectUrlInput): string {
  const base = input.serverUrl.replace(/\/+$/u, '');
  return `${base}/${input.workspaceSlug}/projects/${input.projectId}/issues/${input.issueId}/`;
}

export function buildIssueUrl(
  serverUrl: string,
  issue: Pick<IssueRef, 'workspaceSlug' | 'projectId'> & {
    readonly issueId?: string;
    readonly id?: string;
    readonly projectIdentifier: string;
    readonly sequenceId: number;
  }
): string {
  const issueId = issue.issueId ?? issue.id ?? '';
  if (issue.projectIdentifier.length > 0 && issue.sequenceId > 0) {
    return buildIssueBrowseUrl({
      serverUrl,
      workspaceSlug: issue.workspaceSlug,
      projectIdentifier: issue.projectIdentifier,
      sequenceId: issue.sequenceId,
    });
  }
  return buildIssueProjectUrl({
    serverUrl,
    workspaceSlug: issue.workspaceSlug,
    projectId: issue.projectId,
    issueId,
  });
}
