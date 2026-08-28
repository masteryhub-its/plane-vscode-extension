import { randomBytes } from 'crypto';
import * as vscode from 'vscode';
import type { PlaneClient } from '../client/plane-client';
import { buildIssueUrl } from '../client/issue-url';
import { renderIssuePreviewHtml } from '../issue/render-issue-html';
import { issuePanelId } from '../issue/issue-panel-id';
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

const openPanels = new Set<string>();

export async function openPlaneIssuePanel(input: OpenIssuePanelInput): Promise<void> {
  const panelKey = issuePanelId(input.workspaceSlug, input.projectId, input.issueId);
  const nonce = randomBytes(16).toString('hex');
  const panel = vscode.window.createWebviewPanel('planeIssue', `${input.title}`, vscode.ViewColumn.One, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });
  openPanels.add(panelKey);
  panel.iconPath = new vscode.ThemeIcon('issue-opened');

  const render = async (): Promise<void> => {
    const issue = await input.client.getIssue(input.workspaceSlug, input.projectId, input.issueId);
    const comments = await input.client.listComments(input.workspaceSlug, input.projectId, input.issueId).catch(() => []);
    const subIssues = await input.client.listSubIssues(input.workspaceSlug, input.projectId, input.issueId).catch(() => []);
    const attachments = await input.client.listAttachments(input.workspaceSlug, input.projectId, input.issueId).catch(() => []);
    const relations = await input.client.listRelations(input.workspaceSlug, input.projectId, input.issueId).catch(() => []);
    const worklogs = await input.client.listWorklogs(input.workspaceSlug, input.projectId, input.issueId).catch(() => []);
    const labels = await input.client.listLabels(input.workspaceSlug, input.projectId).catch(() => []);
    const planeUrl = buildIssueUrl(input.serverUrl, issue);
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

  await render();
  panel.webview.onDidReceiveMessage((message: unknown) => {
    void handleIssuePanelMessage(input, message, render);
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

async function handleIssuePanelMessage(input: OpenIssuePanelInput, message: unknown, render: () => Promise<void>): Promise<void> {
  if (typeof message !== 'object' || message === null) {
    return;
  }
  const record = message as IssuePanelMessageRecord;
  try {
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
        html: `<p>${escapePlain(record.html.trim())}</p>`,
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
        html: record.html,
      });
      showPlaneInfo('Comment updated');
      await render();
    }
  } catch (error: unknown) {
    showPlaneError(error);
  }
}

function escapePlain(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function closePlaneIssuePanels(): void {
  openPanels.clear();
}
