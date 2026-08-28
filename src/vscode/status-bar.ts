import * as vscode from 'vscode';
import type { AuthService } from '../auth/auth-service';
import type { PlaneUser } from '../client/plane.types';

export class PlaneStatusBar {
  private readonly item: vscode.StatusBarItem;

  public constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.renderSignedOut();
    this.item.show();
  }

  public dispose(): void {
    this.item.dispose();
  }

  public renderSignedOut(): void {
    this.item.text = '$(key) Plane: Sign in';
    this.item.tooltip = 'Sign in to Plane with a personal access token';
    this.item.command = 'planePanel.focus';
  }

  public renderSignedIn(user: PlaneUser): void {
    this.item.text = `$(issue-opened) Plane: ${user.displayName}`;
    this.item.tooltip = `Signed in as ${user.displayName}`;
    this.item.command = 'planePanel.focus';
  }

  public async refresh(auth: AuthService): Promise<void> {
    try {
      const user = await auth.currentUser();
      if (user === undefined) {
        this.renderSignedOut();
        return;
      }
      this.renderSignedIn(user);
    } catch {
      this.renderSignedOut();
    }
  }
}
