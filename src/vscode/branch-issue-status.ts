import * as vscode from 'vscode';
import { issueKeyFromBranch } from '../issue/branch-name';
import { currentBranchName } from './git-branch';

export const OPEN_BRANCH_ISSUE_COMMAND = 'plane.openBranchIssue';

/** A status bar entry showing the issue the current git branch is named after; clicking it opens the issue. */
export class BranchIssueStatus {
  private readonly item: vscode.StatusBarItem;
  private key: string | undefined;

  public constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.item.command = OPEN_BRANCH_ISSUE_COMMAND;
  }

  /** The key of the issue for the current branch, if its name has one. */
  public currentKey(): string | undefined {
    return this.key;
  }

  public refresh(): void {
    const branch = currentBranchName();
    this.key = branch === undefined ? undefined : issueKeyFromBranch(branch);
    if (this.key === undefined) {
      this.item.hide();
      return;
    }
    this.item.text = `$(git-branch) ${this.key}`;
    this.item.tooltip = `Open ${this.key} in Plane (branch ${branch ?? ''})`;
    this.item.show();
  }

  public dispose(): void {
    this.item.dispose();
  }
}
