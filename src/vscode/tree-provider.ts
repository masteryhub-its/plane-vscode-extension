import * as vscode from 'vscode';
import type { AuthService } from '../auth/auth-service';
import { isNotSignedInError } from '../errors/plane-error';
import { assignedToUser } from '../issue/filter-my-issues';
import type { IssueListCache } from '../sync/issue-list-cache';
import {
  groupIssuesByState,
  MY_ISSUES_TREE_NODE,
  parseIssueNode,
  SIGN_IN_TREE_NODE,
  toCycleNode,
  toIssueNode,
  toModuleNode,
  toProjectNode,
  toStateNode,
  toWorkspaceNode,
  type PlaneTreeIssueNode,
  type PlaneTreeNode,
} from '../tree/tree-model';
import { sortStatesByGroup } from '../tree/state-group-order';
import { PlaneTreeKind } from '../utils/enums/plane-tree-kind.enum';
import { showPlaneError } from './messages';

export const PLANE_TREE_VIEW_ID = 'planeExplorer';

export class PlaneTreeProvider implements vscode.TreeDataProvider<PlaneTreeNode> {
  private readonly emitter = new vscode.EventEmitter<PlaneTreeNode | undefined>();
  private treeView: vscode.TreeView<PlaneTreeNode> | undefined;
  private assignedCount = 0;

  public readonly onDidChangeTreeData: vscode.Event<PlaneTreeNode | undefined> = this.emitter.event;

  public constructor(
    private readonly auth: AuthService,
    private readonly issueCache: IssueListCache
  ) {}

  public setTreeView(view: vscode.TreeView<PlaneTreeNode>): void {
    this.treeView = view;
  }

  public refresh(): void {
    this.issueCache.invalidate();
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

    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.contextValue = 'planeIssue';
    item.iconPath = new vscode.ThemeIcon('issue-opened');
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
        const workspaces = await client.listWorkspaces();
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
        const issues = await this.issueCache.listIssues(client, element.workspaceSlug, element.projectId, Date.now());
        const grouped = groupIssuesByState(issues);
        const byName = grouped.get(element.label) ?? [];
        const byId = issues.filter((issue) => issue.stateId === element.id);
        const bucket = byName.length > 0 ? byName : byId;
        return bucket.map(toIssueNode);
      }

      if (element.kind === PlaneTreeKind.CYCLE) {
        const client = await this.auth.requireClient();
        const issues = await client.listCycleIssues(element.workspaceSlug, element.projectId, element.id);
        return issues.map(toIssueNode);
      }

      if (element.kind === PlaneTreeKind.MODULE) {
        const client = await this.auth.requireClient();
        const issues = await client.listModuleIssues(element.workspaceSlug, element.projectId, element.id);
        return issues.map(toIssueNode);
      }

      return [];
    } catch (error: unknown) {
      if (element === undefined && isNotSignedInError(error)) {
        return [SIGN_IN_TREE_NODE];
      }
      if (element === undefined) {
        showPlaneError(error);
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

  private async loadMyIssues(): Promise<PlaneTreeNode[]> {
    const client = await this.auth.requireClient();
    const user = await client.currentUser();
    const workspaces = await client.listWorkspaces();
    const mine = [];
    for (const workspace of workspaces) {
      const projects = await client.listProjects(workspace.slug);
      for (const project of projects) {
        const issues = await this.issueCache.listIssues(client, workspace.slug, project.id, Date.now());
        mine.push(...assignedToUser(issues, user.id));
      }
    }
    this.assignedCount = mine.length;
    return mine.map(toIssueNode);
  }
}
