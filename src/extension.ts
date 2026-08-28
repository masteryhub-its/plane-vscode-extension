import type * as vscode from 'vscode';
import { activatePlane } from './vscode/activate';

export function activate(context: vscode.ExtensionContext): void {
  activatePlane(context);
}

export function deactivate(): void {
  return;
}
