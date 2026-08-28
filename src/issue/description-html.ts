import { escapeHtml } from '../sidebar/escape-html';

export function resolveIssueDescriptionHtml(html: string, plain: string): string {
  if (html.trim().length > 0) {
    return html;
  }
  const trimmed = plain.trim();
  if (trimmed.length === 0) {
    return '';
  }
  return `<p>${escapeHtml(trimmed).replace(/\n/gu, '<br>')}</p>`;
}
