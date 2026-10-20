import type { PlaneIssue } from '../client/plane.types';
import { IssuePanelMessageType } from '../utils/enums/issue-panel-message-type.enum';
import { branchNameFor } from './branch-name';
import { formatIssueKey } from './issue-key';

export interface CopyAction {
  readonly text: string;
  readonly confirmation: string;
}

/** What to put on the clipboard for a copy button in the issue panel, and what to tell the user afterwards. */
export function copyActionFor(type: unknown, issue: Pick<PlaneIssue, 'id' | 'name' | 'projectIdentifier' | 'sequenceId'>, planeUrl: string): CopyAction | undefined {
  const key = formatIssueKey(issue.projectIdentifier, issue.sequenceId, issue.id);
  switch (type) {
    case IssuePanelMessageType.COPY_LINK:
      return { text: planeUrl, confirmation: 'Issue link copied' };
    case IssuePanelMessageType.COPY_KEY:
      return { text: key, confirmation: `Copied ${key}` };
    case IssuePanelMessageType.COPY_BRANCH: {
      const branch = branchNameFor(key, issue.name);
      return { text: branch, confirmation: `Branch name copied: ${branch}` };
    }
    default:
      return undefined;
  }
}
