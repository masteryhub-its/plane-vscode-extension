import { escapeHtml } from '../sidebar/escape-html';
import { renderDocumentShell } from '../ui/document-shell';

export interface RenderIssueLoadingHtmlInput {
  readonly title: string;
  readonly nonce: string;
  readonly cspSource: string;
}

/** Placeholders shown while an issue loads, so the panel is never blank. */
export function renderIssueLoadingHtml(input: RenderIssueLoadingHtmlInput): string {
  const body = `<div class="page" aria-busy="true">
  <p class="muted" role="status">Loading ${escapeHtml(input.title)}…</p>
  <div class="skeleton title"></div>
  <div class="skeleton line" style="width:40%"></div>
  <div class="skeleton line"></div>
  <div class="skeleton line" style="width:92%"></div>
  <div class="skeleton line" style="width:70%"></div>
</div>`;
  return renderDocumentShell({ title: input.title, nonce: input.nonce, cspSource: input.cspSource, body });
}
