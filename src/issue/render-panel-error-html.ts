import { escapeHtml } from '../sidebar/escape-html';
import { IssuePanelMessageType } from '../utils/enums/issue-panel-message-type.enum';

export interface RenderPanelErrorHtmlInput {
  readonly title: string;
  readonly message: string;
  readonly nonce: string;
  readonly cspSource: string;
}

/** Shown in an issue panel when loading fails, with a Retry button instead of a blank panel. */
export function renderPanelErrorHtml(input: RenderPanelErrorHtmlInput): string {
  const { title, message, nonce, cspSource } = input;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none';" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    .muted { color: var(--vscode-descriptionForeground); }
    button { padding: 8px 12px; border: none; border-radius: 4px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p><strong>Could not load this issue.</strong></p>
  <p class="muted">${escapeHtml(message)}</p>
  <button type="button" id="retry">Retry</button>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('retry')?.addEventListener('click', () => {
      vscode.postMessage({ type: '${IssuePanelMessageType.RETRY}' });
    });
  </script>
</body>
</html>`;
}
