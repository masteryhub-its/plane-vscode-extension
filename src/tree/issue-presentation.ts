import { formatIssueKey } from '../issue/issue-key';
import { PlanePriority } from '../utils/enums/plane-priority.enum';
import { PlaneStateGroup } from '../utils/enums/plane-state-group.enum';
import { parsePlanePriority, planePriorityLabel } from '../utils/plane-priority';

export interface PresentableIssue {
  readonly id: string;
  readonly name: string;
  readonly projectIdentifier: string;
  readonly sequenceId: number;
  readonly stateName: string;
  readonly stateGroup?: string | undefined;
  readonly priority: string;
  readonly targetDate: string | undefined;
  readonly assigneeNames: readonly string[];
}

export interface IssueIconSpec {
  /** A codicon id, without the `$()` wrapper. */
  readonly id: string;
  /** A theme colour id such as `charts.green`, or undefined for the default text colour. */
  readonly color: string | undefined;
}

export type IssueEmphasis = 'overdue' | 'urgent';

export interface IssuePresentation {
  readonly label: string;
  readonly description: string;
  readonly icon: IssueIconSpec;
  readonly priorityBadge: string | undefined;
  readonly priorityLabel: string;
  readonly emphasis: IssueEmphasis | undefined;
  readonly tooltip: readonly string[];
}

const NEUTRAL_ICON: IssueIconSpec = { id: 'circle-outline', color: undefined };

const STATE_ICONS: ReadonlyMap<string, IssueIconSpec> = new Map([
  [PlaneStateGroup.BACKLOG, { id: 'circle-outline', color: 'disabledForeground' }],
  [PlaneStateGroup.UNSTARTED, NEUTRAL_ICON],
  [PlaneStateGroup.STARTED, { id: 'play-circle', color: 'charts.yellow' }],
  [PlaneStateGroup.COMPLETED, { id: 'pass-filled', color: 'charts.green' }],
  [PlaneStateGroup.CANCELLED, { id: 'circle-slash', color: 'disabledForeground' }],
]);

const PRIORITY_BADGES: ReadonlyMap<PlanePriority, string> = new Map([
  [PlanePriority.URGENT, '!!'],
  [PlanePriority.HIGH, 'H'],
  [PlanePriority.MEDIUM, 'M'],
  [PlanePriority.LOW, 'L'],
]);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

function parseDateParts(value: string | undefined): DateParts | undefined {
  const match = value === undefined ? null : /^(\d{4})-(\d{2})-(\d{2})/u.exec(value);
  if (match === null) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) {
    return undefined;
  }
  return { year, month, day };
}

function dateNumber(parts: DateParts): number {
  return parts.year * 10_000 + parts.month * 100 + parts.day;
}

function formatDate(parts: DateParts, today: Date): string {
  const base = `${MONTHS[parts.month - 1] ?? ''} ${parts.day}`;
  return parts.year === today.getFullYear() ? base : `${base}, ${parts.year}`;
}

function isClosed(group: string | undefined): boolean {
  return group === PlaneStateGroup.COMPLETED || group === PlaneStateGroup.CANCELLED;
}

export interface DueDateView {
  readonly text: string;
  readonly overdue: boolean;
}

/** Formats a due date and says whether it is overdue (past today on an issue that is still open). */
export function describeDueDate(targetDate: string | undefined, stateGroup: string | undefined, today: Date): DueDateView | undefined {
  const due = parseDateParts(targetDate);
  if (due === undefined) {
    return undefined;
  }
  const todayNumber = dateNumber({ year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() });
  return { text: formatDate(due, today), overdue: !isClosed(stateGroup) && dateNumber(due) < todayNumber };
}

/** Everything the tree needs to draw one issue row, with no editor API involved so it can be tested directly. */
export function presentIssue(issue: PresentableIssue, today: Date): IssuePresentation {
  const key = formatIssueKey(issue.projectIdentifier, issue.sequenceId, issue.id);
  const title = issue.name.trim();
  const priority = parsePlanePriority(issue.priority);
  const priorityBadge = PRIORITY_BADGES.get(priority);

  const due = describeDueDate(issue.targetDate, issue.stateGroup, today);
  const overdue = due?.overdue === true;
  const dueText = due?.text;

  let description = key;
  if (dueText !== undefined) {
    description = `${key} · ${overdue ? 'overdue' : 'due'} ${dueText}`;
  }

  let emphasis: IssueEmphasis | undefined;
  if (overdue) {
    emphasis = 'overdue';
  } else if (priority === PlanePriority.URGENT) {
    emphasis = 'urgent';
  }

  const tooltip = [`${key} ${title.length > 0 ? title : ''}`.trim(), `State: ${issue.stateName}`];
  if (priorityBadge !== undefined) {
    tooltip.push(`Priority: ${planePriorityLabel(priority)}`);
  }
  tooltip.push(`Assignees: ${issue.assigneeNames.length > 0 ? issue.assigneeNames.join(', ') : 'Unassigned'}`);
  if (dueText !== undefined) {
    tooltip.push(`Due: ${dueText}${overdue ? ' (overdue)' : ''}`);
  }

  return {
    label: title.length > 0 ? title : key,
    description,
    icon: issue.stateGroup === undefined ? NEUTRAL_ICON : (STATE_ICONS.get(issue.stateGroup) ?? NEUTRAL_ICON),
    priorityBadge,
    priorityLabel: planePriorityLabel(priority),
    emphasis,
    tooltip,
  };
}
