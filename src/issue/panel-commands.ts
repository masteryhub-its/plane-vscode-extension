import { IssuePanelMessageType } from '../utils/enums/issue-panel-message-type.enum';

const COMMANDS: ReadonlyMap<unknown, string> = new Map<IssuePanelMessageType, string>([
  [IssuePanelMessageType.CHANGE_STATE, 'plane.updateIssueState'],
  [IssuePanelMessageType.CHANGE_ASSIGNEE, 'plane.updateIssueAssignee'],
  [IssuePanelMessageType.CHANGE_PRIORITY, 'plane.updateIssuePriority'],
  [IssuePanelMessageType.CHANGE_LABELS, 'plane.updateIssueLabels'],
  [IssuePanelMessageType.CHANGE_DUE_DATE, 'plane.updateIssueDueDate'],
  [IssuePanelMessageType.CHANGE_TITLE, 'plane.updateIssueTitle'],
  [IssuePanelMessageType.CREATE_BRANCH, 'plane.createBranchFromIssue'],
  [IssuePanelMessageType.ADD_SUB_ISSUE, 'plane.createSubIssue'],
]);

/** The command an issue panel button runs on the shown issue, or undefined when the message is not one of those buttons. */
export function commandForPanelMessage(type: unknown): string | undefined {
  return COMMANDS.get(type);
}
