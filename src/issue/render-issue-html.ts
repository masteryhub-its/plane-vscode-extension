import { escapeHtml } from '../sidebar/escape-html';
import type { PlaneAttachment, PlaneIssue, PlaneIssueRelation, PlaneLabel, PlaneWorklog } from '../client/plane.types';
import { describeDueDate } from '../tree/issue-presentation';
import { priorityIconSvg, stateIconSvg } from '../ui/icons';
import { renderDocumentShell } from '../ui/document-shell';
import { IssuePanelMessageType } from '../utils/enums/issue-panel-message-type.enum';
import { parsePlanePriority, planePriorityLabel } from '../utils/plane-priority';
import { planeRelationLabel } from '../utils/plane-relation-type';
import { commentHtmlToText, isPlainEditableComment } from './comment-text';
import { resolveIssueDescriptionHtml } from './description-html';
import { formatIssueKey } from './issue-key';
import { readableTextColor, safeLabelColor } from './label-chip';
import type { PlaneComment } from './parse-comments';
import { sanitizeIssueHtml } from './sanitize-html';
import { initialsOf, subIssueProgress } from './sub-issue-progress';

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
  /** Injected so tests can pin the date that decides what is overdue. */
  readonly today?: Date;
}

function avatar(name: string, large = false): string {
  return `<span class="avatar${large ? ' lg' : ''}" aria-hidden="true">${escapeHtml(initialsOf(name))}</span>`;
}

function timestamp(value: string): string {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/u.test(value) ? value.slice(0, 16).replace('T', ' ') : value;
}

function actionButton(type: IssuePanelMessageType, label: string, options: { readonly icon?: string; readonly ghost?: boolean } = {}): string {
  return `<button type="button" class="btn${options.ghost === true ? ' ghost' : ''}" data-message="${type}">${options.icon ?? ''}${escapeHtml(label)}</button>`;
}

function renderChip(name: string, color: string | undefined): string {
  const safe = color === undefined ? undefined : safeLabelColor(color);
  const style = safe === undefined ? '' : ` style="--chip:${safe};--chip-fg:${readableTextColor(safe)}"`;
  return `<span class="chip"${style}>${escapeHtml(name)}</span>`;
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

function property(name: string, value: string): string {
  return `<div class="prop"><dt>${escapeHtml(name)}</dt><dd>${value}</dd></div>`;
}

function renderProperties(issue: PlaneIssue, labels: readonly PlaneLabel[], today: Date): string {
  const priority = parsePlanePriority(issue.priority);
  const due = describeDueDate(issue.targetDate, issue.stateGroup, today);
  const dueHtml = due === undefined ? '<span class="muted">No due date</span>' : due.overdue ? `<span class="warn">${escapeHtml(due.text)} · overdue</span>` : `<span>${escapeHtml(due.text)}</span>`;
  const assignees =
    issue.assigneeNames.length === 0 ? '<span class="muted">Unassigned</span>' : issue.assigneeNames.map((name) => `<span class="pill">${avatar(name)}${escapeHtml(name)}</span>`).join('');
  return `<dl class="props" aria-label="Properties">
      ${property('State', `<span class="pill">${stateIconSvg(issue.stateGroup)}${escapeHtml(issue.stateName)}</span>`)}
      ${property('Priority', `${priorityIconSvg(priority)}${escapeHtml(planePriorityLabel(priority))}`)}
      ${property('Assignees', assignees)}
      ${property('Labels', renderLabelChips(issue, labels))}
      ${property('Due', dueHtml)}
      ${property('Updated', `<span class="muted">${escapeHtml(timestamp(issue.updatedAt))}</span>`)}
    </dl>`;
}

function section(title: string, count: string | undefined, content: string, extra = ''): string {
  const badge = count === undefined ? '' : `<span class="count">${escapeHtml(count)}</span>`;
  return `<section class="section"><h2>${escapeHtml(title)}${badge}${extra}</h2>${content}</section>`;
}

function renderSubIssues(subIssues: readonly PlaneIssue[]): string {
  if (subIssues.length === 0) {
    return '';
  }
  const progress = subIssueProgress(subIssues);
  const bar = `<span class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}"><i style="width:${progress.percent}%"></i></span>`;
  const rows = subIssues
    .map((child) => {
      const key = formatIssueKey(child.projectIdentifier, child.sequenceId, child.id);
      const owner = child.assigneeNames[0];
      return `<button type="button" class="row sub-open" data-workspace="${escapeHtml(child.workspaceSlug)}" data-project="${escapeHtml(child.projectId)}" data-issue="${escapeHtml(child.id)}">${stateIconSvg(
        child.stateGroup
      )}<span class="id">${escapeHtml(key)}</span><span class="grow">${escapeHtml(child.name)}</span>${owner === undefined ? '' : avatar(owner)}</button>`;
    })
    .join('');
  return section('Sub-issues', `${progress.done} of ${progress.total}`, `<div class="list">${rows}</div>`, bar);
}

function renderRelations(relations: readonly PlaneIssueRelation[]): string {
  if (relations.length === 0) {
    return '';
  }
  const rows = relations
    .map(
      (relation) =>
        `<div class="row"><span class="pill">${escapeHtml(planeRelationLabel(relation.type))}</span><span class="id">${escapeHtml(relation.key)}</span><span class="grow">${escapeHtml(relation.name)}</span></div>`
    )
    .join('');
  return section('Relations', String(relations.length), `<div class="list">${rows}</div>`);
}

function renderAttachments(attachments: readonly PlaneAttachment[]): string {
  if (attachments.length === 0) {
    return '';
  }
  const rows = attachments.map((file) => `<button type="button" class="row attachment-open" data-url="${escapeHtml(file.url)}"><span class="grow">${escapeHtml(file.name)}</span></button>`).join('');
  return section('Attachments', String(attachments.length), `<div class="list">${rows}</div>`);
}

function renderWorklogs(worklogs: readonly PlaneWorklog[]): string {
  if (worklogs.length === 0) {
    return '';
  }
  const rows = worklogs.map((log) => `<div class="row"><span class="id">${escapeHtml(log.duration)}</span><span class="grow">${escapeHtml(log.description)}</span></div>`).join('');
  return section('Time logged', String(worklogs.length), `<div class="list">${rows}</div>`);
}

function renderComment(comment: PlaneComment, currentUserId: string): string {
  const own = comment.authorId.length > 0 && comment.authorId === currentUserId;
  const editable = own && isPlainEditableComment(comment.html);
  const edit = editable
    ? `<button type="button" class="comment-edit" data-comment="${escapeHtml(comment.id)}" data-text="${escapeHtml(commentHtmlToText(comment.html))}">Edit</button>`
    : own
      ? '<span title="This comment has formatting that the editor here would remove.">Edit in Plane to keep formatting</span>'
      : '';
  return `<article class="comment">${avatar(comment.authorName, true)}<div><div class="comment-meta"><strong>${escapeHtml(comment.authorName)}</strong><span>${escapeHtml(timestamp(comment.createdAt))}</span>${edit}</div><div class="comment-body">${sanitizeIssueHtml(comment.html)}</div></div></article>`;
}

function renderActivity(comments: readonly PlaneComment[], currentUserId: string): string {
  const list = comments.length === 0 ? '<p class="muted">No comments yet.</p>' : comments.map((comment) => renderComment(comment, currentUserId)).join('');
  const composer = `<form id="comment-form">
      <label class="muted" for="comment-body">Add a comment</label>
      <div class="composer">
        <textarea id="comment-body" rows="3" placeholder="Write a comment. A blank line starts a new paragraph."></textarea>
        <div class="composer-foot"><span><kbd>Ctrl</kbd> + <kbd>Enter</kbd> to send</span><button type="submit" class="btn primary">Comment</button></div>
      </div>
    </form>`;
  return section('Activity', String(comments.length), `${list}${composer}`);
}

const SCRIPT = `
    const vscode = acquireVsCodeApi();
    const post = (message) => vscode.postMessage(message);
    document.getElementById('open-plane')?.addEventListener('click', () => post({ type: '${IssuePanelMessageType.OPEN_IN_PLANE}', url: document.body.dataset.planeUrl }));
    document.querySelectorAll('[data-message]').forEach((button) => {
      button.addEventListener('click', () => post({ type: button.getAttribute('data-message') }));
    });
    const form = document.getElementById('comment-form');
    const body = document.getElementById('comment-body');
    const send = () => {
      const value = body && 'value' in body ? String(body.value) : '';
      if (value.trim().length > 0) post({ type: '${IssuePanelMessageType.ADD_COMMENT}', html: value });
    };
    form?.addEventListener('submit', (event) => { event.preventDefault(); send(); });
    body?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); send(); }
    });
    document.querySelectorAll('.sub-open').forEach((button) => {
      button.addEventListener('click', () => {
        post({
          type: '${IssuePanelMessageType.OPEN_SUB_ISSUE}',
          workspaceSlug: button.getAttribute('data-workspace'),
          projectId: button.getAttribute('data-project'),
          issueId: button.getAttribute('data-issue')
        });
      });
    });
    document.querySelectorAll('.attachment-open').forEach((button) => {
      button.addEventListener('click', () => post({ type: '${IssuePanelMessageType.OPEN_ATTACHMENT}', url: button.getAttribute('data-url') }));
    });
    document.querySelectorAll('.comment-edit').forEach((button) => {
      button.addEventListener('click', () => {
        const article = button.closest('article');
        const text = article ? article.querySelector('.comment-body') : null;
        if (!article || !text || article.querySelector('.comment-editor')) return;
        const editor = document.createElement('div');
        editor.className = 'comment-editor composer';
        const textarea = document.createElement('textarea');
        textarea.rows = 4;
        textarea.value = button.getAttribute('data-text') || '';
        textarea.setAttribute('aria-label', 'Edit comment');
        const actions = document.createElement('div');
        actions.className = 'comment-editor-actions composer-foot';
        const save = document.createElement('button');
        save.type = 'button';
        save.className = 'btn primary';
        save.textContent = 'Save';
        save.addEventListener('click', () => post({ type: '${IssuePanelMessageType.EDIT_COMMENT}', commentId: button.getAttribute('data-comment'), html: textarea.value }));
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'btn ghost';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', () => { editor.remove(); text.hidden = false; });
        actions.append(save, cancel);
        editor.append(textarea, actions);
        text.after(editor);
        text.hidden = true;
        textarea.focus();
      });
    });`;

export function renderIssuePreviewHtml(input: RenderIssueHtmlInput): string {
  const { issue, nonce, cspSource, planeUrl, comments, subIssues, attachments, relations, worklogs, labels, currentUserId } = input;
  const today = input.today ?? new Date();
  const key = formatIssueKey(issue.projectIdentifier, issue.sequenceId, issue.id);
  const resolved = resolveIssueDescriptionHtml(issue.descriptionHtml, issue.descriptionPlain);
  const description = resolved.length > 0 ? sanitizeIssueHtml(resolved) : '<p class="muted">No description.</p>';

  const body = `<div class="page" data-plane-url="${escapeHtml(planeUrl)}">
  <nav class="crumb" aria-label="Location"><span>${escapeHtml(issue.workspaceSlug)}</span><span aria-hidden="true">/</span><span>${escapeHtml(issue.projectIdentifier.length > 0 ? issue.projectIdentifier : 'Project')}</span></nav>
  <header class="head">
    <p class="key">${escapeHtml(key)}</p>
    <h1 class="title">${escapeHtml(issue.name)}</h1>
  </header>
  <div class="actions" role="toolbar" aria-label="Issue actions">
    <button type="button" class="btn primary" id="open-plane">Open in Plane</button>
    ${actionButton(IssuePanelMessageType.CHANGE_STATE, issue.stateName, { icon: stateIconSvg(issue.stateGroup) })}
    ${actionButton(IssuePanelMessageType.CHANGE_ASSIGNEE, 'Assign')}
    ${actionButton(IssuePanelMessageType.CHANGE_PRIORITY, 'Priority')}
    ${actionButton(IssuePanelMessageType.CHANGE_LABELS, 'Labels')}
    ${actionButton(IssuePanelMessageType.CHANGE_DUE_DATE, 'Due date')}
    ${actionButton(IssuePanelMessageType.CHANGE_TITLE, 'Rename', { ghost: true })}
    ${actionButton(IssuePanelMessageType.ADD_SUB_ISSUE, 'Add sub-issue', { ghost: true })}
    ${actionButton(IssuePanelMessageType.CREATE_BRANCH, 'Create branch', { ghost: true })}
    ${actionButton(IssuePanelMessageType.COPY_LINK, 'Copy link', { ghost: true })}
    ${actionButton(IssuePanelMessageType.COPY_KEY, 'Copy key', { ghost: true })}
    ${actionButton(IssuePanelMessageType.COPY_BRANCH, 'Copy branch name', { ghost: true })}
  </div>
  <div class="layout">
    <main>
      ${section('Description', undefined, `<div class="prose">${description}</div>`)}
      ${renderSubIssues(subIssues)}
      ${renderRelations(relations)}
      ${renderAttachments(attachments)}
      ${renderWorklogs(worklogs)}
      ${renderActivity(comments, currentUserId)}
    </main>
    ${renderProperties(issue, labels, today)}
  </div>
</div>`;

  return renderDocumentShell({ title: key, nonce, cspSource, body, script: SCRIPT.replace('document.body.dataset.planeUrl', "document.querySelector('.page').dataset.planeUrl") });
}
