import type { PlaneIssue } from '../client/plane.types';

export interface SavedIssueFilter {
  readonly id: string;
  readonly name: string;
  readonly assigneeId?: string;
  readonly stateName?: string;
  readonly labelId?: string;
  readonly text?: string;
}

export interface FilterableIssue {
  readonly name: string;
  readonly assigneeIds: readonly string[];
  readonly stateName: string;
  readonly labelIds: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function issueMatchesSavedFilter(issue: FilterableIssue, filter: SavedIssueFilter): boolean {
  const needle = filter.text?.trim().toLowerCase() ?? '';
  if (filter.assigneeId !== undefined && !issue.assigneeIds.includes(filter.assigneeId)) {
    return false;
  }
  if (filter.stateName !== undefined && issue.stateName !== filter.stateName) {
    return false;
  }
  if (filter.labelId !== undefined && !issue.labelIds.includes(filter.labelId)) {
    return false;
  }
  if (needle.length > 0 && !issue.name.toLowerCase().includes(needle)) {
    return false;
  }
  return true;
}

export function applySavedFilter(issues: readonly PlaneIssue[], filter: SavedIssueFilter): readonly PlaneIssue[] {
  return issues.filter((issue) => issueMatchesSavedFilter(issue, filter));
}

export function parseSavedFilter(raw: unknown): SavedIssueFilter | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const id = optionalString(raw['id']);
  const name = optionalString(raw['name']);
  if (id === undefined || name === undefined) {
    return undefined;
  }
  const filter: SavedIssueFilter = { id, name };
  const assigneeId = optionalString(raw['assigneeId']);
  const stateName = optionalString(raw['stateName']);
  const labelId = optionalString(raw['labelId']);
  const text = optionalString(raw['text']);
  return {
    ...filter,
    ...(assigneeId === undefined ? {} : { assigneeId }),
    ...(stateName === undefined ? {} : { stateName }),
    ...(labelId === undefined ? {} : { labelId }),
    ...(text === undefined ? {} : { text }),
  };
}

export function parseSavedFilters(raw: unknown): readonly SavedIssueFilter[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(parseSavedFilter).filter((filter): filter is SavedIssueFilter => filter !== undefined);
}
