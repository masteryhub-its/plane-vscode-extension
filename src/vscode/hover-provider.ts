import * as vscode from 'vscode';
import { hoverMarkdownForText } from '../issue/hover-markdown';
import type { IssueHoverTitle } from '../issue/hover-title';

export interface PlaneHoverProviderOptions {
  readonly titles: () => readonly IssueHoverTitle[];
}

export class PlaneHoverProvider implements vscode.HoverProvider {
  public constructor(private readonly options: PlaneHoverProviderOptions) {}

  public provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const range = document.getWordRangeAtPosition(position, /\b[A-Z][A-Z0-9_]{1,15}-\d+\b/u);
    if (range === undefined) {
      return undefined;
    }
    const markdown = hoverMarkdownForText(document.getText(range), this.options.titles());
    if (markdown === undefined) {
      return undefined;
    }
    return new vscode.Hover(markdown, range);
  }
}
