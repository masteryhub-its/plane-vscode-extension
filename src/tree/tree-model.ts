import type { PlaneCycle, PlaneIssue, PlaneModule, PlaneProject, PlaneWorkspace } from '../client/plane.types';
import { formatIssueKey } from '../issue/issue-key';
import { PlaneTreeKind } from '../utils/enums/plane-tree-kind.enum';

export interface PlaneTreeActionNode {
  readonly kind: PlaneTreeKind.ACTION;
  readonly label: string;
}

export interface PlaneTreeWorkspaceNode {
  readonly kind: PlaneTreeKind.WORKSPACE;
  readonly id: string;
  readonly slug: string;
  readonly label: string;
}

export interface PlaneTreeProjectNode {
  readonly kind: PlaneTreeKind.PROJECT;
  readonly workspaceSlug: string;
  readonly id: string;
  readonly label: string;
  readonly identifier: string;
  readonly description: string;
}

export interface PlaneTreeStateNode {
  readonly kind: PlaneTreeKind.STATE;
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly id: string;
  readonly label: string;
}

export interface PlaneTreeIssueNode {
  readonly kind: PlaneTreeKind.ISSUE;
  readonly id: string;
  readonly label: string;
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
  readonly sequenceId: number;
  readonly projectIdentifier: string;
  readonly stateName: string;
}

export interface PlaneTreeMyIssuesNode {
  readonly kind: PlaneTreeKind.MY_ISSUES;
  readonly label: string;
}

export interface PlaneTreeCycleNode {
  readonly kind: PlaneTreeKind.CYCLE;
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly id: string;
  readonly label: string;
}

export interface PlaneTreeModuleNode {
  readonly kind: PlaneTreeKind.MODULE;
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly id: string;
  readonly label: string;
}

export type PlaneTreeNode =
  PlaneTreeActionNode | PlaneTreeWorkspaceNode | PlaneTreeProjectNode | PlaneTreeStateNode | PlaneTreeIssueNode | PlaneTreeMyIssuesNode | PlaneTreeCycleNode | PlaneTreeModuleNode;

export const SIGN_IN_TREE_NODE: PlaneTreeActionNode = {
  kind: PlaneTreeKind.ACTION,
  label: 'Sign in to Plane',
};

export const MY_ISSUES_TREE_NODE: PlaneTreeMyIssuesNode = {
  kind: PlaneTreeKind.MY_ISSUES,
  label: 'My issues',
};

export function toWorkspaceNode(workspace: PlaneWorkspace): PlaneTreeWorkspaceNode {
  return {
    kind: PlaneTreeKind.WORKSPACE,
    id: workspace.id,
    slug: workspace.slug,
    label: workspace.name.length > 0 ? workspace.name : workspace.slug,
  };
}

export function toProjectNode(workspaceSlug: string, project: PlaneProject): PlaneTreeProjectNode {
  const emoji = project.emoji.length > 0 ? `${project.emoji} ` : '';
  return {
    kind: PlaneTreeKind.PROJECT,
    workspaceSlug,
    id: project.id,
    label: `${emoji}${project.name} (${project.identifier})`,
    identifier: project.identifier,
    description: project.description,
  };
}

export function toStateNode(workspaceSlug: string, projectId: string, stateId: string, stateName: string): PlaneTreeStateNode {
  return {
    kind: PlaneTreeKind.STATE,
    workspaceSlug,
    projectId,
    id: stateId,
    label: stateName,
  };
}

export function toCycleNode(workspaceSlug: string, projectId: string, cycle: PlaneCycle): PlaneTreeCycleNode {
  return {
    kind: PlaneTreeKind.CYCLE,
    workspaceSlug,
    projectId,
    id: cycle.id,
    label: cycle.name,
  };
}

export function toModuleNode(workspaceSlug: string, projectId: string, module: PlaneModule): PlaneTreeModuleNode {
  return {
    kind: PlaneTreeKind.MODULE,
    workspaceSlug,
    projectId,
    id: module.id,
    label: module.name,
  };
}

export function toIssueNode(issue: PlaneIssue): PlaneTreeIssueNode {
  const key = formatIssueKey(issue.projectIdentifier, issue.sequenceId, issue.id);
  return {
    kind: PlaneTreeKind.ISSUE,
    id: `${issue.workspaceSlug}:${issue.projectId}:${issue.id}`,
    label: `${key} ${issue.name}`,
    workspaceSlug: issue.workspaceSlug,
    projectId: issue.projectId,
    issueId: issue.id,
    sequenceId: issue.sequenceId,
    projectIdentifier: issue.projectIdentifier,
    stateName: issue.stateName,
  };
}

export function parseIssueNode(value: unknown): PlaneTreeIssueNode | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const node = value as Partial<PlaneTreeIssueNode>;
  if (node.kind !== PlaneTreeKind.ISSUE) {
    return undefined;
  }
  if (typeof node.workspaceSlug !== 'string' || typeof node.projectId !== 'string' || typeof node.issueId !== 'string' || typeof node.label !== 'string') {
    return undefined;
  }
  return node as PlaneTreeIssueNode;
}

export function parseIssueNodes(values: readonly unknown[]): readonly PlaneTreeIssueNode[] {
  return values.map(parseIssueNode).filter((node): node is PlaneTreeIssueNode => node !== undefined);
}

export function groupIssuesByState(issues: readonly PlaneIssue[]): ReadonlyMap<string, readonly PlaneIssue[]> {
  const groups = new Map<string, PlaneIssue[]>();
  for (const issue of issues) {
    const key = issue.stateName.length > 0 ? issue.stateName : issue.stateId;
    const bucket = groups.get(key);
    if (bucket === undefined) {
      groups.set(key, [issue]);
    } else {
      bucket.push(issue);
    }
  }
  return groups;
}
