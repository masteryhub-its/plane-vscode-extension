import * as vscode from 'vscode';
import { AuthService } from '../auth/auth-service';
import { exportPatToMcpEnv } from '../auth/export-pat-to-mcp-env';
import { fetchHttpClient } from '../client/fetch-http-client';
import { isNotSignedInError } from '../errors/plane-error';
import { IssueListCache } from '../sync/issue-list-cache';
import {
  archiveIssueCommand,
  bulkUpdateIssueStateCommand,
  copyIssueKeyCommand,
  copyIssueUrlCommand,
  deleteIssueCommand,
  openIssueCommand,
  registerPlaneCommands,
  subscribeIssueCommand,
  updateIssueAssigneeCommand,
  updateIssueDescriptionCommand,
  updateIssueDueDateCommand,
  updateIssueLabelsCommand,
  updateIssuePriorityCommand,
  updateIssueStateCommand,
  updateIssueTitleCommand,
  type OpenIssuePreviewInput,
  type PlaneCommandContext,
} from './commands';
import { PlaneHoverProvider } from './hover-provider';
import { openPlaneIssuePanel } from './issue-panel';
import { showPlaneError, showPlaneInfo } from './messages';
import { VsCodeSecretStore } from './secret-store';
import { VsCodeSettingsReader } from './settings-reader';
import { PlaneSidebarView } from './sidebar-view';
import { PlaneStatusBar } from './status-bar';
import { PLANE_TREE_VIEW_ID, PlaneTreeProvider } from './tree-provider';

export function activatePlane(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Plane');
  output.appendLine('Plane extension activated v0.5.3');

  const settings = new VsCodeSettingsReader();
  const auth = new AuthService({
    secrets: new VsCodeSecretStore(context.secrets),
    settings,
    http: fetchHttpClient,
  });
  const statusBar = new PlaneStatusBar();
  const issueCache = new IssueListCache();
  const tree = new PlaneTreeProvider(auth, issueCache);
  const treeView = vscode.window.createTreeView(PLANE_TREE_VIEW_ID, { treeDataProvider: tree, canSelectMany: true });
  tree.setTreeView(treeView);

  const applyAssignedBadge = (count: number): void => {
    if (!settings.read().showAssignedBadge) {
      treeView.badge = undefined;
      return;
    }
    treeView.badge = count > 0 ? { value: count, tooltip: 'Issues assigned to you' } : undefined;
  };

  const sidebar = new PlaneSidebarView({
    auth,
    settings,
    statusBar,
    output,
    globalState: context.globalState,
    onAuthChanged: () => {
      issueCache.invalidate();
      tree.refresh();
    },
    onAssignedCount: applyAssignedBadge,
  });

  const openPreview = async (input: OpenIssuePreviewInput): Promise<void> => {
    const client = await auth.requireClient();
    const user = await client.currentUser();
    await openPlaneIssuePanel({
      client,
      serverUrl: settings.read().serverUrl,
      workspaceSlug: input.workspaceSlug,
      projectId: input.projectId,
      issueId: input.issueId,
      title: input.title,
      currentUserId: user.id,
    });
  };

  const commandCtx: PlaneCommandContext = { auth, settings, tree, statusBar, openPreview, globalState: context.globalState };

  const runCommand = (action: () => Promise<void>): void => {
    void action().catch((error: unknown) => {
      if (isNotSignedInError(error)) {
        sidebar.openSignInUi();
        return;
      }
      showPlaneError(error);
    });
  };

  context.subscriptions.push(
    output,
    statusBar,
    treeView,
    vscode.window.registerWebviewViewProvider(PlaneSidebarView.viewId, sidebar, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.languages.registerHoverProvider({ scheme: 'file' }, new PlaneHoverProvider({ titles: () => issueCache.hoverTitles() })),
    vscode.commands.registerCommand('plane.openSignIn', () => {
      sidebar.openSignInUi();
    }),
    vscode.commands.registerCommand('plane.refresh', () => {
      issueCache.invalidate();
      sidebar.refresh();
    }),
    vscode.commands.registerCommand('plane.forceReload', () => {
      issueCache.invalidate();
      void sidebar.forceReload();
    }),
    vscode.commands.registerCommand('plane.signOut', () => {
      issueCache.invalidate();
      void sidebar.signOut();
    }),
    vscode.commands.registerCommand('plane.openIssue', (node: unknown) => {
      runCommand(async () => {
        await openIssueCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('plane.updateIssueState', (node: unknown) => {
      runCommand(async () => {
        await updateIssueStateCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('plane.updateIssueAssignee', (node: unknown) => {
      runCommand(async () => {
        await updateIssueAssigneeCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('plane.updateIssuePriority', (node: unknown) => {
      runCommand(async () => {
        await updateIssuePriorityCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('plane.updateIssueLabels', (node: unknown) => {
      runCommand(async () => {
        await updateIssueLabelsCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('plane.updateIssueTitle', (node: unknown) => {
      runCommand(async () => {
        await updateIssueTitleCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('plane.updateIssueDescription', (node: unknown) => {
      runCommand(async () => {
        await updateIssueDescriptionCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('plane.updateIssueDueDate', (node: unknown) => {
      runCommand(async () => {
        await updateIssueDueDateCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('plane.copyIssueKey', (node: unknown) => {
      runCommand(async () => {
        await copyIssueKeyCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('plane.copyIssueUrl', (node: unknown) => {
      runCommand(async () => {
        await copyIssueUrlCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('plane.archiveIssue', (node: unknown) => {
      runCommand(async () => {
        await archiveIssueCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('plane.deleteIssue', (node: unknown) => {
      runCommand(async () => {
        await deleteIssueCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('plane.subscribeIssue', (node: unknown) => {
      runCommand(async () => {
        await subscribeIssueCommand(commandCtx, node);
      });
    }),
    vscode.commands.registerCommand('plane.bulkUpdateIssueState', () => {
      runCommand(async () => {
        await bulkUpdateIssueStateCommand(commandCtx);
      });
    }),
    vscode.commands.registerCommand('plane.exportPatToMcpEnv', () => {
      runCommand(async () => {
        const result = await exportPatToMcpEnv({ auth, settings });
        showPlaneInfo(`Wrote Plane PAT to ${result.envPath} for ${result.displayName || result.email} (${result.serverUrl}). Reload MCP servers next.`);
        output.appendLine(`Exported Plane PAT to ${result.envPath} as ${result.email} (token redacted).`);
      });
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('plane')) {
        tree.refresh();
        sidebar.refresh();
      }
    })
  );

  registerPlaneCommands(context, commandCtx);

  void statusBar.refresh(auth);
}
