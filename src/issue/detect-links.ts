export interface DetectedIssueKey {
  readonly identifier: string;
  readonly sequenceId: number;
  readonly raw: string;
}

export interface DetectedPlaneUrl {
  readonly url: string;
  readonly workspaceSlug: string | undefined;
  readonly projectId: string | undefined;
  readonly issueId: string | undefined;
  readonly browseKey: string | undefined;
}

const ISSUE_KEY_PATTERN = /\b([A-Z][A-Z0-9_]{1,15})-(\d+)\b/gu;

export function detectIssueKeys(text: string): readonly DetectedIssueKey[] {
  const matches: DetectedIssueKey[] = [];
  for (const match of text.matchAll(ISSUE_KEY_PATTERN)) {
    const identifier = match[1];
    const sequenceRaw = match[2];
    const raw = match[0];
    if (identifier === undefined || sequenceRaw === undefined || raw === undefined) {
      continue;
    }
    matches.push({ identifier, sequenceId: Number(sequenceRaw), raw });
  }
  return matches;
}

export function detectPlaneUrls(text: string, serverUrl: string): readonly DetectedPlaneUrl[] {
  const origin = serverUrl.replace(/\/+$/u, '');
  const escapedOrigin = origin.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const browsePattern = new RegExp(`${escapedOrigin}/([a-z0-9-]+)/browse/([A-Z0-9_]+)-(\\d+)/?`, 'giu');
  const projectPattern = new RegExp(`${escapedOrigin}/([a-z0-9-]+)/projects/([0-9a-f-]{36})/issues/([0-9a-f-]{36})/?`, 'giu');
  const hits: DetectedPlaneUrl[] = [];

  for (const match of text.matchAll(browsePattern)) {
    const workspaceSlug = match[1];
    const browseKey = match[2];
    if (workspaceSlug === undefined || browseKey === undefined) {
      continue;
    }
    hits.push({
      url: match[0],
      workspaceSlug,
      projectId: undefined,
      issueId: undefined,
      browseKey,
    });
  }

  for (const match of text.matchAll(projectPattern)) {
    const workspaceSlug = match[1];
    const projectId = match[2];
    const issueId = match[3];
    if (workspaceSlug === undefined || projectId === undefined || issueId === undefined) {
      continue;
    }
    hits.push({
      url: match[0],
      workspaceSlug,
      projectId,
      issueId,
      browseKey: undefined,
    });
  }

  return hits;
}

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/u, '');
}
