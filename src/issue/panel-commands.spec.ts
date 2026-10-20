import { IssuePanelMessageType } from '../utils/enums/issue-panel-message-type.enum';
import { commandForPanelMessage } from './panel-commands';

describe('commandForPanelMessage', () => {
  it.each([
    [IssuePanelMessageType.CHANGE_STATE, 'plane.updateIssueState'],
    [IssuePanelMessageType.CHANGE_ASSIGNEE, 'plane.updateIssueAssignee'],
    [IssuePanelMessageType.CHANGE_PRIORITY, 'plane.updateIssuePriority'],
    [IssuePanelMessageType.CHANGE_LABELS, 'plane.updateIssueLabels'],
    [IssuePanelMessageType.CHANGE_DUE_DATE, 'plane.updateIssueDueDate'],
    [IssuePanelMessageType.CHANGE_TITLE, 'plane.updateIssueTitle'],
    [IssuePanelMessageType.CREATE_BRANCH, 'plane.createBranchFromIssue'],
    [IssuePanelMessageType.ADD_SUB_ISSUE, 'plane.createSubIssue'],
  ])('runs the matching command for %s', (type, command) => {
    expect(commandForPanelMessage(type)).toBe(command);
  });

  it.each(['copyLink', 'retry', 'nonsense', 5, undefined, null])('has no command for %p', (type) => {
    expect(commandForPanelMessage(type)).toBeUndefined();
  });
});
