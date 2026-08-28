import type { IssueSearchHit } from './search-issues';
import { formatIssueKey } from '../issue/issue-key';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parseHit(raw: unknown, fallbackSlug: string): IssueSearchHit | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const issueId = readString(raw['id']);
  if (issueId.length === 0) {
    return undefined;
  }
  const identifier = readString(raw['project__identifier'] ?? raw['project_identifier']);
  const sequenceId = readNumber(raw['sequence_id']);
  const key = formatIssueKey(identifier, sequenceId, issueId);
  return {
    workspaceSlug: readString(raw['workspace__slug'] ?? raw['workspace_slug']) || fallbackSlug,
    projectId: readString(raw['project_id'] ?? raw['project']),
    issueId,
    title: readString(raw['name']),
    identifier,
    sequenceId,
    stateName: readString(isRecord(raw['state_detail']) ? raw['state_detail']['name'] : raw['state_name']),
    highlight: key,
  };
}

function hitList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (isRecord(raw) && Array.isArray(raw['results'])) {
    return raw['results'];
  }
  return [];
}

export function parseWorkspaceSearchHits(raw: unknown, workspaceSlug: string): readonly IssueSearchHit[] {
  if (!isRecord(raw)) {
    return [];
  }
  const items = hitList(raw['issue'] ?? raw['issues'] ?? raw['results']);
  return items.map((item) => parseHit(item, workspaceSlug)).filter((hit): hit is IssueSearchHit => hit !== undefined);
}
