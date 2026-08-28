import { randomBytes } from 'crypto';
import * as vscode from 'vscode';
import type { AuthService } from '../auth/auth-service';
import { buildIssueUrl } from '../client/issue-url';
import { normalizeServerUrl } from '../config/settings';
import { SAVED_FILTERS_KEY } from '../constants';
import type { SettingsStore } from '../config/settings.types';
import { isNotSignedInError } from '../errors/plane-error';
import { formatPlaneError } from '../errors/format-error';
import { parseSavedFilters, type SavedIssueFilter } from '../filter/saved-filters';
import { myIssuesFromCatalog } from '../issue/my-issues';
import { loadSidebarCatalog } from '../sidebar/load-catalog';
import { parseSidebarMessage } from '../sidebar/parse-message';
import { renderSidebarHtml } from '../sidebar/sidebar-html';
import type { SidebarState, SidebarToHost, SidebarWorkspaceSummary } from '../sidebar/sidebar.types';
import { SidebarMessageType } from '../utils/enums/sidebar-message-type.enum';
import { SidebarStatus } from '../utils/enums/sidebar-status.enum';
import { closePlaneIssuePanels, openPlaneIssuePanel } from './issue-panel';
import { openPlaneUrl } from './open-url';
import type { PlaneStatusBar } from './status-bar';

export interface PlaneSidebarViewOptions {
  readonly auth: AuthService;
  readonly settings: SettingsStore;
  readonly statusBar: PlaneStatusBar;
  readonly output: vscode.OutputChannel;
  readonly globalState: vscode.Memento;
  readonly onAuthChanged: () => void;
  readonly onAssignedCount: (count: number) => void;
}

export class PlaneSidebarView implements vscode.WebviewViewProvider {
  public static readonly viewId = 'planePanel';

  private view: vscode.WebviewView | undefined;
  private webview: vscode.Webview | undefined;
  private catalog: readonly SidebarWorkspaceSummary[] = [];
  private email: string | undefined;
  private userName: string | undefined;
  private userId: string | undefined;
  private avatarUrl: string | undefined;
  private lastSyncedLabel: string | undefined;
  private error: string | undefined;
  private busy = false;
  private savedFilters: readonly SavedIssueFilter[] = [];
  private activeFilterId: string | undefined;

  public constructor(private readonly options: PlaneSidebarViewOptions) {
    this.savedFilters = parseSavedFilters(options.globalState.get(SAVED_FILTERS_KEY));
  }

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    this.attach(webviewView.webview);
  }

  public openSignInUi(): void {
    if (this.view !== undefined) {
      this.view.show(true);
      return;
    }
    void vscode.commands.executeCommand(`${PlaneSidebarView.viewId}.focus`);
    const panel = vscode.window.createWebviewPanel('planeSignIn', 'Plane', vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
    });
    this.attach(panel.webview);
  }

  public refresh(): void {
    void this.bootstrap();
  }

  public async forceReload(): Promise<void> {
    this.error = undefined;
    this.catalog = [];
    this.lastSyncedLabel = undefined;
    if (this.webview !== undefined) {
      this.webview.html = '';
    }
    closePlaneIssuePanels();
    this.options.onAuthChanged();
    await this.bootstrap();
  }

  public async signOut(): Promise<void> {
    await this.options.auth.clearCredential();
    this.email = undefined;
    this.userName = undefined;
    this.userId = undefined;
    this.avatarUrl = undefined;
    this.catalog = [];
    this.error = undefined;
    this.lastSyncedLabel = undefined;
    await this.options.statusBar.refresh(this.options.auth);
    this.options.onAuthChanged();
    this.setSignedInContext(false);
    this.render();
  }

  private attach(webview: vscode.Webview): void {
    this.webview = webview;
    webview.options = { enableScripts: true };
    webview.onDidReceiveMessage((message: unknown) => {
      void this.onMessage(message);
    });
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    try {
      const user = await this.options.auth.currentUser();
      if (user === undefined) {
        this.email = undefined;
        this.userName = undefined;
        this.avatarUrl = undefined;
        this.catalog = [];
        this.lastSyncedLabel = undefined;
        this.setSignedInContext(false);
      } else {
        this.email = user.email;
        this.userName = user.displayName;
        this.userId = user.id;
        this.avatarUrl = user.avatarUrl;
        const client = await this.options.auth.requireClient();
        this.catalog = await loadSidebarCatalog(client);
        this.lastSyncedLabel = formatSyncedLabel(new Date());
        this.error = undefined;
        this.setSignedInContext(true);
        this.options.onAssignedCount(myIssuesFromCatalog(this.catalog, this.userId ?? '').length);
      }
    } catch (error: unknown) {
      if (isNotSignedInError(error)) {
        this.email = undefined;
        this.userName = undefined;
        this.avatarUrl = undefined;
        this.catalog = [];
        this.lastSyncedLabel = undefined;
        this.setSignedInContext(false);
      } else {
        this.error = formatPlaneError(error);
        this.options.output.appendLine(`Sidebar load failed: ${this.error}`);
      }
    }
    await this.options.statusBar.refresh(this.options.auth);
    this.options.onAuthChanged();
    this.render();
  }

  private async onMessage(raw: unknown): Promise<void> {
    const message = parseSidebarMessage(raw);
    if (message === undefined) {
      return;
    }
    await this.dispatch(message);
  }

  private async dispatch(message: SidebarToHost): Promise<void> {
    switch (message.type) {
      case SidebarMessageType.SIGN_IN_WITH_PAT:
        await this.runBusy(async () => {
          await this.options.auth.signInWithPat({ token: message.token });
        });
        return;
      case SidebarMessageType.SIGN_OUT:
        await this.signOut();
        return;
      case SidebarMessageType.SET_SERVER_URL:
        await this.runBusy(async () => {
          await this.changeServerUrl(message.serverUrl);
        });
        return;
      case SidebarMessageType.REFRESH:
        await this.bootstrap();
        return;
      case SidebarMessageType.FORCE_RELOAD:
        await this.forceReload();
        return;
      case SidebarMessageType.SEARCH:
        await vscode.commands.executeCommand('plane.search');
        return;
      case SidebarMessageType.OPEN_ISSUE:
        await this.openIssue(message.workspaceSlug, message.projectId, message.issueId);
        return;
      case SidebarMessageType.OPEN_IN_BROWSER:
        await this.openInBrowser(message.workspaceSlug, message.projectId, message.issueId);
        return;
      case SidebarMessageType.TOGGLE_MY_ISSUES:
        return;
      case SidebarMessageType.APPLY_SAVED_FILTER:
        this.activeFilterId = message.filterId.length === 0 ? undefined : message.filterId;
        this.render();
        return;
      case SidebarMessageType.SAVE_FILTER:
        await this.saveFilter(message.name, message.text);
        return;
    }
  }

  private async runBusy(action: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.error = undefined;
    this.render();
    try {
      await action();
      this.error = undefined;
      await this.bootstrap();
    } catch (error: unknown) {
      this.error = formatPlaneError(error);
      this.options.output.appendLine(`Plane request failed: ${this.error}`);
      this.render();
    } finally {
      this.busy = false;
      this.render();
    }
  }

  private async openIssue(workspaceSlug: string, projectId: string, issueId: string): Promise<void> {
    const client = await this.options.auth.requireClient();
    const settings = this.options.settings.read();
    const user = await this.options.auth.currentUser();
    await openPlaneIssuePanel({
      client,
      serverUrl: settings.serverUrl,
      workspaceSlug,
      projectId,
      issueId,
      title: this.issueTitle(workspaceSlug, projectId, issueId),
      currentUserId: user?.id ?? '',
    });
  }

  private async openInBrowser(workspaceSlug: string, projectId: string, issueId: string): Promise<void> {
    const client = await this.options.auth.requireClient();
    const settings = this.options.settings.read();
    const issue = await client.getIssue(workspaceSlug, projectId, issueId);
    await openPlaneUrl(buildIssueUrl(settings.serverUrl, issue));
  }

  private issueTitle(workspaceSlug: string, projectId: string, issueId: string): string {
    for (const workspace of this.catalog) {
      if (workspace.slug !== workspaceSlug) {
        continue;
      }
      for (const project of workspace.projects) {
        if (project.id !== projectId) {
          continue;
        }
        const issue = project.issues.find((item) => item.id === issueId);
        if (issue !== undefined) {
          return `${issue.key} ${issue.title}`;
        }
      }
    }
    return 'Plane issue';
  }

  private render(): void {
    if (this.webview === undefined) {
      return;
    }
    const nonce = randomBytes(16).toString('hex');
    this.webview.html = renderSidebarHtml({
      state: this.snapshot(),
      nonce,
      cspSource: this.webview.cspSource,
    });
  }

  private snapshot(): SidebarState {
    const serverUrl = this.options.settings.read().serverUrl;
    if (this.email === undefined) {
      return {
        status: SidebarStatus.SIGNED_OUT,
        serverUrl,
        error: this.error,
        busy: this.busy,
      };
    }
    return {
      status: SidebarStatus.SIGNED_IN,
      serverUrl,
      userName: this.userName ?? 'Signed in',
      avatarUrl: this.avatarUrl,
      workspaces: this.catalog,
      error: this.error,
      busy: this.busy,
      query: '',
      lastSyncedLabel: this.lastSyncedLabel,
      currentUserId: this.userId,
      savedFilters: this.savedFilters,
      activeFilterId: this.activeFilterId,
    };
  }

  private async saveFilter(name: string, text: string): Promise<void> {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return;
    }
    const trimmedText = text.trim();
    const next: SavedIssueFilter = {
      id: `f-${Date.now()}`,
      name: trimmedName,
      ...(trimmedText.length === 0 ? {} : { text: trimmedText }),
    };
    this.savedFilters = [...this.savedFilters, next];
    this.activeFilterId = next.id;
    await this.options.globalState.update(SAVED_FILTERS_KEY, this.savedFilters);
    this.render();
  }

  private async changeServerUrl(raw: string): Promise<void> {
    const next = normalizeServerUrl(raw);
    const current = this.options.settings.read().serverUrl;
    if (next !== current) {
      await this.options.auth.clearCredential();
      this.email = undefined;
      this.userName = undefined;
      this.avatarUrl = undefined;
      this.catalog = [];
      this.lastSyncedLabel = undefined;
    }
    await this.options.settings.writeServerUrl(next);
  }

  private setSignedInContext(signedIn: boolean): void {
    void vscode.commands.executeCommand('setContext', 'plane.signedIn', signedIn);
  }
}

function formatSyncedLabel(now: Date): string {
  return now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
