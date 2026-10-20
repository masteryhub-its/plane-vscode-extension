import type { PlaneIssue } from '../client/plane.types';

export interface TreeFilter {
  readonly id: string;
  readonly name: string;
  /** Assigned to the signed-in user. */
  readonly mine?: boolean;
  readonly unassigned?: boolean;
  readonly priorities?: readonly string[];
  readonly stateGroups?: readonly string[];
  /** Past the target date and not completed or cancelled. */
  readonly overdue?: boolean;
  /** Part of the title or the issue key. */
  readonly text?: string;
}

export interface TreeFilterContext {
  /** Needed only by filters that use `mine`. */
  readonly userId?: string;
  readonly now: Date;
}

export const BUILT_IN_TREE_FILTERS: readonly TreeFilter[] = [
  { id: 'mine', name: 'Assigned to me', mine: true },
  { id: 'mine-in-progress', name: 'My issues in progress', mine: true, stateGroups: ['started'] },
  { id: 'in-progress', name: 'In progress', stateGroups: ['started'] },
  { id: 'urgent-high', name: 'Urgent and high priority', priorities: ['urgent', 'high'] },
  { id: 'overdue', name: 'Overdue', overdue: true },
  { id: 'unassigned', name: 'Unassigned', unassigned: true },
];

const FINISHED_GROUPS: ReadonlySet<string> = new Set(['completed', 'cancelled']);

function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function isOverdue(issue: PlaneIssue, now: Date): boolean {
  if (issue.targetDate === undefined || (issue.stateGroup !== undefined && FINISHED_GROUPS.has(issue.stateGroup))) {
    return false;
  }
  return issue.targetDate.slice(0, 10) < localDay(now);
}

export function matchesTreeFilter(issue: PlaneIssue, filter: TreeFilter, context: TreeFilterContext): boolean {
  if (filter.mine === true && (context.userId === undefined || !issue.assigneeIds.includes(context.userId))) {
    return false;
  }
  if (filter.unassigned === true && issue.assigneeIds.length > 0) {
    return false;
  }
  if (filter.priorities !== undefined && !filter.priorities.includes(issue.priority)) {
    return false;
  }
  if (filter.stateGroups !== undefined && (issue.stateGroup === undefined || !filter.stateGroups.includes(issue.stateGroup))) {
    return false;
  }
  if (filter.overdue === true && !isOverdue(issue, context.now)) {
    return false;
  }
  const needle = filter.text?.trim().toLowerCase() ?? '';
  if (needle.length > 0 && !issue.name.toLowerCase().includes(needle) && !`${issue.projectIdentifier}-${issue.sequenceId}`.toLowerCase().includes(needle)) {
    return false;
  }
  return true;
}

/** The issues that pass the filter; the very same list when there is no filter. */
export function filterIssues(issues: readonly PlaneIssue[], filter: TreeFilter | undefined, context: TreeFilterContext): readonly PlaneIssue[] {
  return filter === undefined ? issues : issues.filter((issue) => matchesTreeFilter(issue, filter, context));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const kept = value.filter((item): item is string => typeof item === 'string');
  return kept.length > 0 ? kept : undefined;
}

function parseTreeFilter(raw: unknown): TreeFilter | undefined {
  if (!isRecord(raw) || typeof raw['id'] !== 'string' || raw['id'].length === 0 || typeof raw['name'] !== 'string' || raw['name'].length === 0) {
    return undefined;
  }
  const priorities = strings(raw['priorities']);
  const stateGroups = strings(raw['stateGroups']);
  const text = typeof raw['text'] === 'string' && raw['text'].length > 0 ? raw['text'] : undefined;
  return {
    id: raw['id'],
    name: raw['name'],
    ...(raw['mine'] === true ? { mine: true } : {}),
    ...(raw['unassigned'] === true ? { unassigned: true } : {}),
    ...(priorities === undefined ? {} : { priorities }),
    ...(stateGroups === undefined ? {} : { stateGroups }),
    ...(raw['overdue'] === true ? { overdue: true } : {}),
    ...(text === undefined ? {} : { text }),
  };
}

/** Filters the user saved, read back from stored data of any shape. */
export function parseTreeFilters(raw: unknown): readonly TreeFilter[] {
  return Array.isArray(raw) ? raw.map(parseTreeFilter).filter((filter): filter is TreeFilter => filter !== undefined) : [];
}

export function treeFilterById(id: string | undefined, saved: readonly TreeFilter[]): TreeFilter | undefined {
  return id === undefined ? undefined : [...BUILT_IN_TREE_FILTERS, ...saved].find((filter) => filter.id === id);
}
