import { escapeHtml } from '../sidebar/escape-html';
import type { PlaneAttachment, PlaneIssue, PlaneIssueRelation, PlaneLabel, PlaneWorklog } from '../client/plane.types';
import { formatIssueKey } from './issue-key';
import { resolveIssueDescriptionHtml } from './description-html';
import { sanitizeIssueHtml } from './sanitize-html';
import { safeLabelColor } from './label-chip';
import type { PlaneComment } from './parse-comments';
import { planePriorityLabel, parsePlanePriority } from '../utils/plane-priority';
import { planeRelationLabel } from '../utils/plane-relation-type';
import { IssuePanelMessageType } from '../utils/enums/issue-panel-message-type.enum';

export interface RenderIssueHtmlInput {
  readonly issue: PlaneIssue;
  readonly nonce: string;
  readonly cspSource: string;
  readonly planeUrl: string;
  readonly comments: readonly PlaneComment[];
  readonly subIssues: readonly PlaneIssue[];
  readonly attachments: readonly PlaneAttachment[];
  readonly relations: readonly PlaneIssueRelation[];
  readonly worklogs: readonly PlaneWorklog[];
  readonly labels: readonly PlaneLabel[];
  readonly currentUserId: string;
}

export function renderIssuePreviewHtml(input: RenderIssueHtmlInput): string {
  const { issue, nonce, cspSource, planeUrl, comments, subIssues, attachments, relations, worklogs, labels, currentUserId } = input;
  const priority = planePriorityLabel(parsePlanePriority(issue.priority));
  const assignees = issue.assigneeNames.length > 0 ? issue.assigneeNames.join(', ') : 'Unassigned';
  const resolved = resolveIssueDescriptionHtml(issue.descriptionHtml, issue.descriptionPlain);
  const description = resolved.length > 0 ? sanitizeIssueHtml(resolved) : '<p class="muted">No description.</p>';
  const key = formatIssueKey(issue.projectIdentifier, issue.sequenceId, issue.id);
  const due = issue.targetDate ?? 'None';
  const chips = renderLabelChips(issue, labels);
  const commentsHtml =
    comments.length === 0
      ? '<p class="muted">No comments.</p>'
      : comments
          .map((comment) => {
            const own = comment.authorId.length > 0 && comment.authorId === currentUserId;
            const edit = own ? `<button type="button" class="comment-edit" data-comment="${escapeHtml(comment.id)}">Edit</button>` : '';
            return `<article class="comment"><p class="comment-meta">${escapeHtml(comment.authorName)} · ${escapeHtml(comment.createdAt)} ${edit}</p><div class="comment-body">${sanitizeIssueHtml(comment.html)}</div></article>`;
          })
          .join('');
  const subHtml = renderKeyedList(
    'Sub-issues',
    subIssues,
    (child) =>
      `<button type="button" class="sub-open" data-workspace="${escapeHtml(child.workspaceSlug)}" data-project="${escapeHtml(child.projectId)}" data-issue="${escapeHtml(child.id)}">${escapeHtml(
        formatIssueKey(child.projectIdentifier, child.sequenceId, child.id)
      )} ${escapeHtml(child.name)}</button>`
  );
  const attachmentHtml = renderKeyedList('Attachments', attachments, (file) => `<button type="button" class="attachment-open" data-url="${escapeHtml(file.url)}">${escapeHtml(file.name)}</button>`);
  const relationHtml = renderKeyedList('Relations', relations, (relation) => `${escapeHtml(planeRelationLabel(relation.type))}: ${escapeHtml(relation.key)} ${escapeHtml(relation.name)}`);
  const worklogHtml = renderKeyedList('Time', worklogs, (log) => `${escapeHtml(log.duration)} ${escapeHtml(log.description)}`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(key)}</title>
  <style>${ISSUE_CSS}</style>
</head>
<body>
  <header class="hero">
    <p class="key">${escapeHtml(key)}</p>
    <h1>${escapeHtml(issue.name)}</h1>
    <dl class="meta">
      <div><dt>State</dt><dd>${escapeHtml(issue.stateName)}</dd></div>
      <div><dt>Priority</dt><dd>${escapeHtml(priority)}</dd></div>
      <div><dt>Assignees</dt><dd>${escapeHtml(assignees)}</dd></div>
      <div><dt>Labels</dt><dd class="chips">${chips}</dd></div>
      <div><dt>Due</dt><dd>${escapeHtml(due)}</dd></div>
      <div><dt>Updated</dt><dd>${escapeHtml(issue.updatedAt)}</dd></div>
    </dl>
    <button type="button" id="open-plane">Open in Plane</button>
  </header>
  <section class="description">${description}</section>
  ${subHtml}
  ${relationHtml}
  ${attachmentHtml}
  ${worklogHtml}
  <section class="comments"><h2>Comments</h2>${commentsHtml}
    <form id="comment-form">
      <label for="comment-body">Add comment</label>
      <textarea id="comment-body" rows="3"></textarea>
      <button type="submit">Post comment</button>
    </form>
  </section>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('open-plane')?.addEventListener('click', () => {
      vscode.postMessage({ type: '${IssuePanelMessageType.OPEN_IN_PLANE}', url: ${JSON.stringify(planeUrl)} });
    });
    document.getElementById('comment-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const body = document.getElementById('comment-body');
      const html = body && 'value' in body ? String(body.value) : '';
      vscode.postMessage({ type: '${IssuePanelMessageType.ADD_COMMENT}', html: html });
    });
    document.querySelectorAll('.sub-open').forEach((button) => {
      button.addEventListener('click', () => {
        vscode.postMessage({
          type: '${IssuePanelMessageType.OPEN_SUB_ISSUE}',
          workspaceSlug: button.getAttribute('data-workspace'),
          projectId: button.getAttribute('data-project'),
          issueId: button.getAttribute('data-issue')
        });
      });
    });
    document.querySelectorAll('.attachment-open').forEach((button) => {
      button.addEventListener('click', () => {
        vscode.postMessage({ type: '${IssuePanelMessageType.OPEN_ATTACHMENT}', url: button.getAttribute('data-url') });
      });
    });
    document.querySelectorAll('.comment-edit').forEach((button) => {
      button.addEventListener('click', () => {
        const next = window.prompt('Edit comment HTML');
        if (next === null) return;
        vscode.postMessage({ type: '${IssuePanelMessageType.EDIT_COMMENT}', commentId: button.getAttribute('data-comment'), html: next });
      });
    });
  </script>
</body>
</html>`;
}

function renderLabelChips(issue: PlaneIssue, labels: readonly PlaneLabel[]): string {
  if (issue.labelNames.length === 0) {
    return '<span class="muted">None</span>';
  }
  return issue.labelNames
    .map((name, index) => {
      const match = labels.find((label) => label.name === name || label.id === issue.labelIds[index]);
      return renderChip(name, match?.color);
    })
    .join('');
}

function renderChip(name: string, color: string | undefined): string {
  const safe = color === undefined ? undefined : safeLabelColor(color);
  const style = safe === undefined ? '' : ` style="--chip:${safe}"`;
  return `<span class="chip"${style}>${escapeHtml(name)}</span>`;
}

function renderKeyedList<T>(title: string, items: readonly T[], renderItem: (item: T) => string): string {
  if (items.length === 0) {
    return '';
  }
  return `<section><h2>${escapeHtml(title)}</h2><ul>${items.map((item) => `<li>${renderItem(item)}</li>`).join('')}</ul></section>`;
}

const ISSUE_CSS = `
  :root { color-scheme: light dark; }
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; padding: 20px; }
  .hero { margin-bottom: 20px; }
  .key { font-size: 12px; color: var(--vscode-descriptionForeground); margin: 0 0 4px; }
  h1 { font-size: 20px; margin: 0 0 12px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--vscode-descriptionForeground); }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px 16px; margin: 0 0 12px; }
  .meta div { margin: 0; }
  dt { font-size: 11px; text-transform: uppercase; color: var(--vscode-descriptionForeground); margin: 0 0 2px; }
  dd { margin: 0; font-weight: 600; }
  button { padding: 8px 12px; border: none; border-radius: 4px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); cursor: pointer; }
  .sub-open, .attachment-open, .comment-edit { background: transparent; color: var(--vscode-textLink-foreground); padding: 0; }
  .description { line-height: 1.5; }
  .description p { margin: 0 0 12px; }
  .muted { color: var(--vscode-descriptionForeground); font-weight: 400; }
  .chip { display: inline-block; margin: 0 6px 0 0; padding: 2px 8px; border-radius: 999px; background: var(--chip, var(--vscode-badge-background)); color: var(--vscode-badge-foreground); font-size: 11px; font-weight: 600; }
  .comment { border-top: 1px solid var(--vscode-widget-border, transparent); padding: 8px 0; }
  .comment-meta { font-size: 12px; color: var(--vscode-descriptionForeground); }
  textarea { width: 100%; box-sizing: border-box; margin: 8px 0; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); }
  ul { padding-left: 18px; }
`;
