import { escapeHtml } from '../sidebar/escape-html';
import { renderDocumentShell } from '../ui/document-shell';
import { IssuePanelMessageType } from '../utils/enums/issue-panel-message-type.enum';

export interface RenderPanelErrorHtmlInput {
  readonly title: string;
  readonly message: string;
  readonly nonce: string;
  readonly cspSource: string;
}

const SCRIPT = `
    const vscode = acquireVsCodeApi();
    document.getElementById('retry')?.addEventListener('click', () => {
      vscode.postMessage({ type: '${IssuePanelMessageType.RETRY}' });
    });`;

/** Shown in an issue panel when loading fails, with a Retry button instead of a blank panel. */
export function renderPanelErrorHtml(input: RenderPanelErrorHtmlInput): string {
  const body = `<div class="page">
  <h1 class="title">${escapeHtml(input.title)}</h1>
  <div class="notice" role="alert">
    <p><strong>Could not load this issue.</strong></p>
    <p class="muted">${escapeHtml(input.message)}</p>
    <p><button type="button" class="btn primary" id="retry">Retry</button></p>
  </div>
</div>`;
  return renderDocumentShell({ title: input.title, nonce: input.nonce, cspSource: input.cspSource, body, script: SCRIPT });
}
