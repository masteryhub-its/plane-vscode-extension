import * as vscode from 'vscode';
import { ISSUE_URI_SCHEME, parseIssueDecoration } from '../tree/issue-decoration';
import type { IssueEmphasis } from '../tree/issue-presentation';

const EMPHASIS_COLORS: ReadonlyMap<IssueEmphasis, string> = new Map([
  ['overdue', 'list.warningForeground'],
  ['urgent', 'list.errorForeground'],
]);

/** Draws the priority badge and the overdue or urgent colour on Plane issue rows. */
export class PlaneIssueDecorationProvider implements vscode.FileDecorationProvider {
  public provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    if (uri.scheme !== ISSUE_URI_SCHEME) {
      return undefined;
    }
    const data = parseIssueDecoration(uri.query);
    if (data.badge === undefined && data.emphasis === undefined) {
      return undefined;
    }
    const colorId = data.emphasis === undefined ? undefined : EMPHASIS_COLORS.get(data.emphasis);
    return new vscode.FileDecoration(data.badge, data.tooltip, colorId === undefined ? undefined : new vscode.ThemeColor(colorId));
  }
}
