import * as vscode from 'vscode';
import type { AuthService } from '../auth/auth-service';
import { isNotSignedInError } from '../errors/plane-error';
import { loadMyIssues } from '../issue/load-my-issues';
import type { PlaneIssue, PlaneWorkspace } from '../client/plane.types';
import { filterIssues, type TreeFilter, type TreeFilterContext } from '../filter/tree-filter';
import type { IssueListCache } from '../sync/issue-list-cache';
import { accountKeyOf, SavedCache, type SavedContext, type SavedStore } from '../sync/saved-cache';
import {
  groupIssuesByState,
  MY_ISSUES_TREE_NODE,
  parseIssueNode,
  toCycleNode,
  toErrorNode,
  toIssueNode,
  toModuleNode,
  toProjectNode,
  toStateNode,
  toWorkspaceNode,
  type PlaneTreeIssueNode,
  type PlaneTreeNode,
} from '../tree/tree-model';
import { sortStatesByGroup } from '../tree/state-group-order';
import { escapeMarkdown } from '../utils/markdown-escape';
import { buildIssueDecorationUri } from '../tree/issue-decoration';
import { presentIssue, type IssueIconSpec, type PresentableIssue } from '../tree/issue-presentation';
import { PlaneTreeKind } from '../utils/enums/plane-tree-kind.enum';
import { formatPlaneError } from '../errors/format-error';

export const PLANE_TREE_VIEW_ID = 'planeExplorer';

export interface TreeSavedStores {
  readonly workspaces: SavedStore;
  readonly myIssues: SavedStore;
}

function everyItemHasId<T>(value: unknown): readonly T[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null && typeof (item as { id?: unknown }).id === 'string') ? (value as readonly T[]) : undefined;
}

function toThemeIcon(spec: IssueIconSpec): vscode.ThemeIcon {
  return new vscode.ThemeIcon(spec.id, spec.color === undefined ? undefined : new vscode.ThemeColor(spec.color));
}

function presentableFor(node: PlaneTreeIssueNode): PresentableIssue {
  return (
    node.presentable ?? {
      id: node.issueId,
      name: node.label,
      projectIdentifier: node.projectIdentifier,
      sequenceId: node.sequenceId,
      stateName: node.stateName,
      priority: '',
      targetDate: undefined,
      assigneeNames: [],
    }
  );
}

function setSignedIn(signedIn: boolean): void {
  void vscode.commands.executeCommand('setContext', 'plane.signedIn', signedIn);
}

export class PlaneTreeProvider implements vscode.TreeDataProvider<PlaneTreeNode> {
  private readonly emitter = new vscode.EventEmitter<PlaneTreeNode | undefined>();
  private treeView: vscode.TreeView<PlaneTreeNode> | undefined;
  private assignedCount = 0;
  private filter: TreeFilter | undefined;
  private userId: string | undefined;

  public readonly onDidChangeTreeData: vscode.Event<PlaneTreeNode | undefined> = this.emitter.event;

  private readonly workspacesCache: SavedCache<readonly PlaneWorkspace[]>;
  private readonly myIssuesCache: SavedCache<readonly PlaneIssue[]>;

  public constructor(
    private readonly auth: AuthService,
    private readonly issueCache: IssueListCache,
    stores: TreeSavedStores,
    private readonly serverUrl: () => string,
    notify: (message: string) => void
  ) {
    const common = {
      now: (): number => Date.now(),
      onRefreshed: (): void => {
        this.emitter.fire(undefined);
      },
      onRefreshFailed: (message: string): void => {
        notify(`Showing your saved view. Could not refresh: ${message}`);
      },
    };
    this.workspacesCache = new SavedCache<readonly PlaneWorkspace[]>({ ...common, store: stores.workspaces, validate: everyItemHasId<PlaneWorkspace> });
    this.myIssuesCache = new SavedCache<readonly PlaneIssue[]>({ ...common, store: stores.myIssues, validate: everyItemHasId<PlaneIssue> });
  }

  /** Forgets the saved copies too, for signing out, switching server or a full reload. */
  public async resetSaved(): Promise<void> {
    this.userId = undefined;
    await Promise.all([this.workspacesCache.reset(), this.myIssuesCache.reset()]);
  }

  private async savedContext(): Promise<SavedContext> {
    return { serverUrl: this.serverUrl(), accountKey: accountKeyOf((await this.auth.readToken()) ?? '') };
  }

  public setTreeView(view: vscode.TreeView<PlaneTreeNode>): void {
    this.treeView = view;
    this.showFilter();
  }

  public activeFilter(): TreeFilter | undefined {
    return this.filter;
  }

  /** Shows only the issues that pass the filter in every issue list; undefined shows them all again. */
  public setFilter(filter: TreeFilter | undefined): void {
    this.filter = filter;
    this.showFilter();
    this.emitter.fire(undefined);
  }

  private showFilter(): void {
    if (this.treeView !== undefined) {
      this.treeView.description = this.filter === undefined ? '' : `Filter: ${this.filter.name}`;
    }
    void vscode.commands.executeCommand('setContext', 'plane.filterActive', this.filter !== undefined);
  }

  private async filterContext(client: Awaited<ReturnType<AuthService['requireClient']>>): Promise<TreeFilterContext> {
    if (this.filter?.mine === true && this.userId === undefined) {
      this.userId = (await client.currentUser()).id;
    }
    return this.userId === undefined ? { now: new Date() } : { userId: this.userId, now: new Date() };
  }

  /** Redraws the tree. What was last saved is shown at once and refreshed in the background. */
  public refresh(): void {
    this.issueCache.invalidate();
    this.workspacesCache.invalidate();
    this.myIssuesCache.invalidate();
    this.emitter.fire(undefined);
  }

  public selectedIssueNodes(): readonly PlaneTreeIssueNode[] {
    const selected = this.treeView?.selection ?? [];
    return selected.map(parseIssueNode).filter((node): node is PlaneTreeIssueNode => node !== undefined);
  }

  public getTreeItem(element: PlaneTreeNode): vscode.TreeItem {
    if (element.kind === PlaneTreeKind.ACTION) {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.contextValue = 'planeSignIn';
      item.iconPath = new vscode.ThemeIcon('key');
      item.command = { command: 'plane.openSignIn', title: 'Sign in to Plane' };
      return item;
    }

    if (element.kind === PlaneTreeKind.ERROR) {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.contextValue = 'planeError';
      item.description = element.message;
      item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'));
      item.tooltip = new vscode.MarkdownString(`${escapeMarkdown(element.message)}\n\nClick to try again.`);
      item.command = { command: 'plane.refresh', title: 'Try again' };
      return item;
    }

    if (element.kind === PlaneTreeKind.MY_ISSUES) {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = 'planeMyIssues';
      item.iconPath = new vscode.ThemeIcon('account');
      item.id = PlaneTreeKind.MY_ISSUES;
      return item;
    }

    if (element.kind === PlaneTreeKind.WORKSPACE) {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = 'planeWorkspace';
      item.iconPath = new vscode.ThemeIcon('root-folder');
      item.id = `${PlaneTreeKind.WORKSPACE}:${element.slug}`;
      return item;
    }

    if (element.kind === PlaneTreeKind.PROJECT) {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = 'planeProject';
      item.iconPath = new vscode.ThemeIcon('project');
      item.id = `${PlaneTreeKind.PROJECT}:${element.id}`;
      item.tooltip = element.description.length > 0 ? element.description : element.identifier;
      return item;
    }

    if (element.kind === PlaneTreeKind.STATE) {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = 'planeState';
      item.iconPath = new vscode.ThemeIcon('circle-outline');
      item.id = `${PlaneTreeKind.STATE}:${element.workspaceSlug}:${element.projectId}:${element.id}`;
      return item;
    }

    if (element.kind === PlaneTreeKind.CYCLE) {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = 'planeCycle';
      item.iconPath = new vscode.ThemeIcon('sync');
      item.id = `${PlaneTreeKind.CYCLE}:${element.id}`;
      return item;
    }

    if (element.kind === PlaneTreeKind.MODULE) {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
      item.contextValue = 'planeModule';
      item.iconPath = new vscode.ThemeIcon('package');
      item.id = `${PlaneTreeKind.MODULE}:${element.id}`;
      return item;
    }

    const view = presentIssue(presentableFor(element), new Date());
    const item = new vscode.TreeItem(view.label, vscode.TreeItemCollapsibleState.None);
    item.contextValue = 'planeIssue';
    item.description = view.description;
    item.iconPath = toThemeIcon(view.icon);
    item.resourceUri = vscode.Uri.from(buildIssueDecorationUri(element.id, view));
    item.tooltip = new vscode.MarkdownString(view.tooltip.map(escapeMarkdown).join('\n\n'));
    item.id = element.id;
    item.command = {
      command: 'plane.openIssue',
      title: 'Open Plane issue',
      arguments: [element],
    };
    return item;
  }

  public async getChildren(element?: PlaneTreeNode): Promise<PlaneTreeNode[]> {
    try {
      if (element === undefined) {
        const client = await this.auth.requireClient();
        const { data: workspaces } = await this.workspacesCache.read(await this.savedContext(), () => client.listWorkspaces());
        setSignedIn(true);
        return [MY_ISSUES_TREE_NODE, ...workspaces.map(toWorkspaceNode)];
      }

      if (element.kind === PlaneTreeKind.MY_ISSUES) {
        return this.loadMyIssues();
      }

      if (element.kind === PlaneTreeKind.WORKSPACE) {
        const client = await this.auth.requireClient();
        const projects = await client.listProjects(element.slug);
        return projects.map((project) => toProjectNode(element.slug, project));
      }

      if (element.kind === PlaneTreeKind.PROJECT) {
        const client = await this.auth.requireClient();
        const [states, issues, cycles, modules] = await Promise.all([
          client.listStates(element.workspaceSlug, element.id).catch(() => []),
          this.issueCache.listIssues(client, element.workspaceSlug, element.id, Date.now()),
          client.listCycles(element.workspaceSlug, element.id),
          client.listModules(element.workspaceSlug, element.id),
        ]);
        const orderedStates = states.length > 0 ? sortStatesByGroup(states) : [];
        const stateNodes =
          orderedStates.length > 0
            ? orderedStates.map((state) => toStateNode(element.workspaceSlug, element.id, state.id, state.name))
            : [...groupIssuesByState(issues).keys()].map((name) => toStateNode(element.workspaceSlug, element.id, name, name));
        return [...stateNodes, ...cycles.map((cycle) => toCycleNode(element.workspaceSlug, element.id, cycle)), ...modules.map((module) => toModuleNode(element.workspaceSlug, element.id, module))];
      }

      if (element.kind === PlaneTreeKind.STATE) {
        const client = await this.auth.requireClient();
        const issues = filterIssues(await this.issueCache.listIssues(client, element.workspaceSlug, element.projectId, Date.now()), this.filter, await this.filterContext(client));
        const grouped = groupIssuesByState(issues);
        const byName = grouped.get(element.label) ?? [];
        const byId = issues.filter((issue) => issue.stateId === element.id);
        const bucket = byName.length > 0 ? byName : byId;
        return bucket.map(toIssueNode);
      }

      if (element.kind === PlaneTreeKind.CYCLE) {
        const client = await this.auth.requireClient();
        const issues = filterIssues(await client.listCycleIssues(element.workspaceSlug, element.projectId, element.id), this.filter, await this.filterContext(client));
        return issues.map(toIssueNode);
      }

      if (element.kind === PlaneTreeKind.MODULE) {
        const client = await this.auth.requireClient();
        const issues = filterIssues(await client.listModuleIssues(element.workspaceSlug, element.projectId, element.id), this.filter, await this.filterContext(client));
        return issues.map(toIssueNode);
      }

      return [];
    } catch (error: unknown) {
      if (element === undefined && isNotSignedInError(error)) {
        // An empty tree lets the signed-out welcome view show.
        setSignedIn(false);
        return [];
      }
      if (element === undefined) {
        // Still signed in: show why the list is empty, with a way to try again, not the sign-in welcome.
        setSignedIn(await this.hasToken());
        return [toErrorNode(formatPlaneError(error))];
      }
      return [];
    }
  }

  public parseIssueFromNode(nodeArg: unknown): PlaneTreeIssueNode | undefined {
    return parseIssueNode(nodeArg);
  }

  public assignedIssueCount(): number {
    return this.assignedCount;
  }

  private async hasToken(): Promise<boolean> {
    try {
      return (await this.auth.readToken()) !== undefined;
    } catch {
      return true;
    }
  }

  private async loadMyIssues(): Promise<PlaneTreeNode[]> {
    const client = await this.auth.requireClient();
    const { data: issues } = await this.myIssuesCache.read(await this.savedContext(), async () => {
      const user = await client.currentUser();
      const result = await loadMyIssues(client, (workspaceSlug, projectId) => this.issueCache.listIssues(client, workspaceSlug, projectId, Date.now()), user.id);
      if (result.failedProjects > 0) {
        vscode.window.setStatusBarMessage(`Your issues: ${result.failedProjects} project(s) could not be loaded, so some issues may be missing. Sync to try again.`, 10_000);
      }
      return result.issues;
    });
    this.assignedCount = issues.length;
    return filterIssues(issues, this.filter, await this.filterContext(client)).map(toIssueNode);
  }
}
