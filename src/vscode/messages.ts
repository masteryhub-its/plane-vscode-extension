import * as vscode from 'vscode';
import { formatPlaneError } from '../errors/format-error';

export function showPlaneError(error: unknown): void {
  void vscode.window.showErrorMessage(formatPlaneError(error));
}

export function showPlaneInfo(message: string): void {
  void vscode.window.showInformationMessage(message);
}
