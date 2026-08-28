import { detectIssueKeys } from './detect-links';
import { formatIssueKey } from './issue-key';
import { hoverTitleForIssueKey, type IssueHoverTitle } from './hover-title';

export function hoverMarkdownForText(text: string, issues: readonly IssueHoverTitle[]): string | undefined {
  const keys = detectIssueKeys(text);
  const first = keys[0];
  if (first === undefined) {
    return undefined;
  }
  const title = hoverTitleForIssueKey(issues, { identifier: first.identifier, sequenceId: first.sequenceId });
  if (title === undefined) {
    return undefined;
  }
  return `**${formatIssueKey(first.identifier, first.sequenceId, first.raw)}** ${title}`;
}
