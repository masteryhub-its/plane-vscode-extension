import { randomBytes } from 'crypto';
import * as vscode from 'vscode';
import type { PlaneClient } from '../client/plane-client';
import { buildIssueUrl } from '../client/issue-url';
import type { PlaneIssue } from '../client/plane.types';
import { renderIssuePreviewHtml } from '../issue/render-issue-html';
import { issuePanelId } from '../issue/issue-panel-id';
import { plainTextToCommentHtml } from '../issue/comment-text';
import { formatIssueKey } from '../issue/issue-key';
import { copyActionFor } from '../issue/copy-actions';
import { renderIssueLoadingHtml } from '../issue/render-issue-loading-html';
import { renderPanelErrorHtml } from '../issue/render-panel-error-html';
import { toIssueNode } from '../tree/tree-model';
import { IssuePanelMessageType } from '../utils/enums/issue-panel-message-type.enum';
import { showPlaneError, showPlaneInfo } from './messages';
import { openPlaneUrl } from './open-url';

export interface OpenIssuePanelInput {
  readonly client: PlaneClient;
  readonly serverUrl: string;
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
  readonly title: string;
  readonly currentUserId: string;
}

const openPanels = new Map<string, vscode.WebviewPanel>();

export async function openPlaneIssuePanel(input: OpenIssuePanelInput): Promise<void> {
  const panelKey = issuePanelId(input.workspaceSlug, input.projectId, input.issueId);
  const existing = openPanels.get(panelKey);
  if (existing !== undefined) {
    existing.reveal(vscode.ViewColumn.One);
    return;
  }
  const nonce = randomBytes(16).toString('hex');
  const panel = vscode.window.createWebviewPanel('planeIssue', `${input.title}`, vscode.ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [],
  });
  openPanels.set(panelKey, panel);
  panel.iconPath = new vscode.ThemeIcon('issue-opened');
  panel.webview.html = renderIssueLoadingHtml({ title: input.title, nonce, cspSource: panel.webview.cspSource });
  const shown: ShownIssue = { issue: undefined, planeUrl: '' };

  const render = async (): Promise<void> => {
    const issue = await input.client.getIssue(input.workspaceSlug, input.projectId, input.issueId);
    const [comments, subIssues, attachments, relations, worklogs, labels] = await Promise.all([
      input.client.listComments(input.workspaceSlug, input.projectId, input.issueId).catch(() => []),
      input.client.listSubIssues(input.workspaceSlug, input.projectId, input.issueId).catch(() => []),
      input.client.listAttachments(input.workspaceSlug, input.projectId, input.issueId).catch(() => []),
      input.client.listRelations(input.workspaceSlug, input.projectId, input.issueId).catch(() => []),
      input.client.listWorklogs(input.workspaceSlug, input.projectId, input.issueId).catch(() => []),
      input.client.listLabels(input.workspaceSlug, input.projectId).catch(() => []),
    ]);
    const planeUrl = buildIssueUrl(input.serverUrl, issue);
    shown.issue = issue;
    shown.planeUrl = planeUrl;
    panel.title = formatIssueKey(issue.projectIdentifier, issue.sequenceId, issue.id);
    panel.webview.html = renderIssuePreviewHtml({
      issue,
      nonce,
      cspSource: panel.webview.cspSource,
      planeUrl,
      comments,
      subIssues,
      attachments,
      relations,
      worklogs,
      labels,
      currentUserId: input.currentUserId,
    });
  };

  const renderOrError = async (): Promise<void> => {
    try {
      await render();
    } catch (error: unknown) {
      showPlaneError(error);
      panel.webview.html = renderPanelErrorHtml({
        title: input.title,
        message: error instanceof Error ? error.message : String(error),
        nonce,
        cspSource: panel.webview.cspSource,
      });
    }
  };

  await renderOrError();
  panel.webview.onDidReceiveMessage((message: unknown) => {
    void handleIssuePanelMessage(input, message, renderOrError, shown);
  });
  panel.onDidDispose(() => {
    openPanels.delete(panelKey);
  });
}

interface IssuePanelMessageRecord {
  readonly type: unknown;
  readonly url?: unknown;
  readonly html?: unknown;
  readonly commentId?: unknown;
  readonly workspaceSlug?: unknown;
  readonly projectId?: unknown;
  readonly issueId?: unknown;
}

interface ShownIssue {
  issue: PlaneIssue | undefined;
  planeUrl: string;
}

async function handleIssuePanelMessage(input: OpenIssuePanelInput, message: unknown, render: () => Promise<void>, shown: ShownIssue): Promise<void> {
  if (typeof message !== 'object' || message === null) {
    return;
  }
  const record = message as IssuePanelMessageRecord;
  try {
    if (record.type === IssuePanelMessageType.RETRY) {
      await render();
      return;
    }
    if (shown.issue !== undefined) {
      const copy = copyActionFor(record.type, shown.issue, shown.planeUrl);
      if (copy !== undefined) {
        await vscode.env.clipboard.writeText(copy.text);
        showPlaneInfo(copy.confirmation);
        return;
      }
      if (record.type === IssuePanelMessageType.CHANGE_STATE || record.type === IssuePanelMessageType.CHANGE_ASSIGNEE) {
        const command = record.type === IssuePanelMessageType.CHANGE_STATE ? 'plane.updateIssueState' : 'plane.updateIssueAssignee';
        await vscode.commands.executeCommand(command, toIssueNode(shown.issue));
        await render();
        return;
      }
    }
    if (record.type === IssuePanelMessageType.OPEN_IN_PLANE || record.type === IssuePanelMessageType.OPEN_ATTACHMENT) {
      if (typeof record.url === 'string' && record.url.length > 0) {
        await openPlaneUrl(record.url);
      }
      return;
    }
    if (record.type === IssuePanelMessageType.OPEN_SUB_ISSUE) {
      if (typeof record.workspaceSlug === 'string' && typeof record.projectId === 'string' && typeof record.issueId === 'string') {
        await openPlaneIssuePanel({
          ...input,
          workspaceSlug: record.workspaceSlug,
          projectId: record.projectId,
          issueId: record.issueId,
          title: 'Plane issue',
        });
      }
      return;
    }
    if (record.type === IssuePanelMessageType.ADD_COMMENT && typeof record.html === 'string' && record.html.trim().length > 0) {
      await input.client.createComment({
        workspaceSlug: input.workspaceSlug,
        projectId: input.projectId,
        issueId: input.issueId,
        html: plainTextToCommentHtml(record.html.trim()),
      });
      showPlaneInfo('Comment posted');
      await render();
      return;
    }
    if (record.type === IssuePanelMessageType.EDIT_COMMENT && typeof record.commentId === 'string' && typeof record.html === 'string') {
      await input.client.updateComment({
        workspaceSlug: input.workspaceSlug,
        projectId: input.projectId,
        issueId: input.issueId,
        commentId: record.commentId,
        html: plainTextToCommentHtml(record.html),
      });
      showPlaneInfo('Comment updated');
      await render();
    }
  } catch (error: unknown) {
    showPlaneError(error);
  }
}

export function closePlaneIssuePanels(): void {
  for (const panel of openPanels.values()) {
    panel.dispose();
  }
  openPanels.clear();
}
