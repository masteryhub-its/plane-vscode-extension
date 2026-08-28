import * as vscode from 'vscode';
import type { AuthService } from '../auth/auth-service';
import type { PlaneClient } from '../client/plane-client';
import type { PlaneMember, PlaneProject, PlaneState, PlaneTemplate, PlaneWorkspace } from '../client/plane.types';
import type { SettingsReader } from '../config/settings.types';
import { isNotSignedInError } from '../errors/plane-error';
import { detectIssueKeys, detectPlaneUrls } from '../issue/detect-links';
import { resolveSearchWorkspaces } from '../search/resolve-workspaces';
import { searchIssues } from '../search/search-issues';
import { CREATE_DEFAULTS_KEY } from '../constants';
import { parseCreateIssueDefaults, type CreateIssueDefaults } from '../filter/create-defaults';
import { draftFromIntake, draftFromTemplate, type CreateIssueDraft } from '../issue/create-issue-draft';
import { ARCHIVE_CONFIRM_ACTION, DELETE_CONFIRM_ACTION, isArchiveConfirmed, isDeleteConfirmed, isOverwriteConfirmed, OVERWRITE_CONFIRM_ACTION } from '../issue/confirm-issue-action';
import { formatIssueKey } from '../issue/issue-key';
import { buildIssueUrl } from '../client/issue-url';
import { bulkStateChangeInputs } from '../tree/bulk-state';
import { parseIssueNode, parseIssueNodes, toIssueNode, type PlaneTreeIssueNode } from '../tree/tree-model';
import { PlanePriority } from '../utils/enums/plane-priority.enum';
import { planePriorityLabel } from '../utils/plane-priority';
import { showPlaneError, showPlaneInfo } from './messages';
import { openPlaneUrl } from './open-url';
import type { PlaneStatusBar } from './status-bar';
import type { PlaneTreeProvider } from './tree-provider';

export interface OpenIssuePreviewInput {
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
  readonly title: string;
}

export interface PlaneCommandContext {
  readonly auth: AuthService;
  readonly settings: SettingsReader;
  readonly tree: PlaneTreeProvider;
  readonly statusBar: PlaneStatusBar;
  readonly openPreview: (input: OpenIssuePreviewInput) => Promise<void>;
  readonly globalState: vscode.Memento;
}

interface IssuePickItem extends vscode.QuickPickItem {
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
}

interface WorkspacePickItem extends vscode.QuickPickItem {
  readonly workspaceSlug: string;
}

interface ProjectPickItem extends vscode.QuickPickItem {
  readonly workspaceSlug: string;
  readonly projectId: string;
}

interface StatePickItem extends vscode.QuickPickItem {
  readonly stateId: string;
}

interface MemberPickItem extends vscode.QuickPickItem {
  readonly memberId: string;
}

interface PriorityPickItem extends vscode.QuickPickItem {
  readonly priority: PlanePriority;
}

interface LabelPickItem extends vscode.QuickPickItem {
  readonly labelId: string;
}

interface TemplatePickItem extends vscode.QuickPickItem {
  readonly template: PlaneTemplate | undefined;
}

interface IntakePickItem extends vscode.QuickPickItem {
  readonly intakeId: string;
  readonly name: string;
  readonly issueId: string | undefined;
}

async function refreshUi(ctx: PlaneCommandContext): Promise<void> {
  ctx.tree.refresh();
  await ctx.statusBar.refresh(ctx.auth);
}

export async function signInCommand(ctx: PlaneCommandContext): Promise<void> {
  const token = await vscode.window.showInputBox({
    title: 'Plane personal access token',
    prompt: 'Paste a PAT from Plane → Profile → Personal Access Tokens. Stored in Secret Storage.',
    password: true,
    ignoreFocusOut: true,
  });
  if (token === undefined) {
    return;
  }
  const user = await ctx.auth.signInWithPat({ token });
  showPlaneInfo(`Signed in as ${user.displayName}`);
  await refreshUi(ctx);
}

export async function signOutCommand(ctx: PlaneCommandContext): Promise<void> {
  await ctx.auth.clearCredential();
  showPlaneInfo('Signed out of Plane');
  await refreshUi(ctx);
}

export async function openIssueCommand(ctx: PlaneCommandContext, nodeArg?: unknown): Promise<void> {
  const fromTree = parseIssueNode(nodeArg);
  if (fromTree !== undefined) {
    await ctx.openPreview({
      workspaceSlug: fromTree.workspaceSlug,
      projectId: fromTree.projectId,
      issueId: fromTree.issueId,
      title: fromTree.label,
    });
    return;
  }

  const client = await ctx.auth.requireClient();
  const workspaceSlug = await pickWorkspaceSlug(ctx, await client.listWorkspaces());
  if (workspaceSlug === undefined) {
    return;
  }
  const projectId = await pickProjectId(client, workspaceSlug);
  if (projectId === undefined) {
    return;
  }
  const issues = await client.listIssues(workspaceSlug, projectId);
  const items: IssuePickItem[] = issues.map((issue) => {
    const node = toIssueNode(issue);
    return {
      label: node.label,
      description: issue.stateName,
      workspaceSlug,
      projectId,
      issueId: issue.id,
    };
  });
  const selected = await vscode.window.showQuickPick(items, { title: 'Open Plane issue', matchOnDescription: true });
  if (selected === undefined) {
    return;
  }
  await ctx.openPreview({
    workspaceSlug: selected.workspaceSlug,
    projectId: selected.projectId,
    issueId: selected.issueId,
    title: selected.label,
  });
}

export async function searchCommand(ctx: PlaneCommandContext): Promise<void> {
  const keyword = await vscode.window.showInputBox({
    title: 'Search Plane issues',
    prompt: 'Search by title, key, or description',
    ignoreFocusOut: true,
  });
  if (keyword === undefined || keyword.trim().length === 0) {
    return;
  }

  const client = await ctx.auth.requireClient();
  const settings = ctx.settings.read();
  const workspaces = resolveSearchWorkspaces(settings.defaultWorkspaceSlug, await client.listWorkspaces());
  const hits = await searchIssues({
    client,
    workspaces,
    keyword,
    defaultProjectId: settings.defaultProjectId,
  });

  if (hits.length === 0) {
    showPlaneInfo('No Plane issues matched');
    return;
  }

  const items: IssuePickItem[] = hits.map((hit) => ({
    label: hit.title,
    description: hit.highlight,
    workspaceSlug: hit.workspaceSlug,
    projectId: hit.projectId,
    issueId: hit.issueId,
  }));
  const selected = await vscode.window.showQuickPick(items, { title: 'Plane search results', matchOnDescription: true });
  if (selected === undefined) {
    return;
  }
  await ctx.openPreview({
    workspaceSlug: selected.workspaceSlug,
    projectId: selected.projectId,
    issueId: selected.issueId,
    title: selected.label,
  });
}

export interface CreateIssuePrefill {
  readonly draft: CreateIssueDraft | undefined;
  readonly workspaceSlug: string | undefined;
  readonly projectId: string | undefined;
}

export async function createIssueCommand(ctx: PlaneCommandContext, prefill?: CreateIssuePrefill): Promise<void> {
  const client = await ctx.auth.requireClient();
  const defaults = parseCreateIssueDefaults(ctx.globalState.get(CREATE_DEFAULTS_KEY));
  const workspaceSlug = prefill?.workspaceSlug ?? (await pickWorkspaceSlug(ctx, await client.listWorkspaces()));
  if (workspaceSlug === undefined) {
    return;
  }
  const projectId = prefill?.projectId ?? (await pickProject(client, workspaceSlug))?.projectId;
  if (projectId === undefined) {
    return;
  }

  let nextDraft = prefill?.draft;
  if (nextDraft === undefined && prefill?.projectId === undefined) {
    const picked = await pickTemplateDraft(client, workspaceSlug, projectId);
    if (picked === 'cancelled') {
      return;
    }
    nextDraft = picked;
  }

  const title = await vscode.window.showInputBox({ title: 'Issue title', ignoreFocusOut: true, value: nextDraft?.name ?? '' });
  if (title === undefined || title.trim().length === 0) {
    return;
  }
  const description = await vscode.window.showInputBox({
    title: 'Issue description (plain text)',
    ignoreFocusOut: true,
    value: nextDraft !== undefined && nextDraft.descriptionHtml.length > 0 ? stripHtml(nextDraft.descriptionHtml) : '',
  });
  const priority = defaults === undefined ? await pickPriority() : await pickPriority(defaults.priority);
  if (priority === undefined) {
    return;
  }
  const labels = await client.listLabels(workspaceSlug, projectId).catch(() => []);
  const labelItems: LabelPickItem[] = labels.map((item) => ({ label: item.name, description: item.color, labelId: item.id }));
  const selectedLabels = labelItems.length === 0 ? [] : await vscode.window.showQuickPick(labelItems, { title: 'Labels (optional)', canPickMany: true });
  if (selectedLabels === undefined && labelItems.length > 0) {
    return;
  }

  const descriptionHtml = description === undefined || description.trim().length === 0 ? (nextDraft?.descriptionHtml ?? '') : `<p>${escapePlainText(description.trim())}</p>`;

  const issue = await client.createIssue({
    workspaceSlug,
    projectId,
    name: title.trim(),
    descriptionHtml,
    priority,
    ...(selectedLabels !== undefined && selectedLabels.length > 0 ? { labelIds: selectedLabels.map((item) => item.labelId) } : {}),
  });

  await ctx.globalState.update(CREATE_DEFAULTS_KEY, { workspaceSlug, projectId, priority } satisfies CreateIssueDefaults);

  showPlaneInfo(`Created ${issue.projectIdentifier}-${issue.sequenceId}`);
  ctx.tree.refresh();
  await ctx.openPreview({
    workspaceSlug,
    projectId,
    issueId: issue.id,
    title: issue.name,
  });
}

export async function convertIntakeCommand(ctx: PlaneCommandContext): Promise<void> {
  const client = await ctx.auth.requireClient();
  const workspaceSlug = await pickWorkspaceSlug(ctx, await client.listWorkspaces());
  if (workspaceSlug === undefined) {
    return;
  }
  const projectPick = await pickProject(client, workspaceSlug);
  if (projectPick === undefined) {
    return;
  }
  const items = await client.listIntake(workspaceSlug, projectPick.projectId);
  if (items.length === 0) {
    showPlaneInfo('No intake items in this project');
    return;
  }
  const picks: IntakePickItem[] = items.map((item) => ({
    label: item.name,
    description: item.issueId === undefined ? 'New issue' : 'Already converted',
    intakeId: item.id,
    name: item.name,
    issueId: item.issueId,
  }));
  const selected = await vscode.window.showQuickPick(picks, { title: 'Convert intake item' });
  if (selected === undefined) {
    return;
  }
  if (selected.issueId !== undefined) {
    await ctx.openPreview({
      workspaceSlug,
      projectId: projectPick.projectId,
      issueId: selected.issueId,
      title: selected.name,
    });
    return;
  }
  await createIssueCommand(ctx, {
    draft: draftFromIntake({ id: selected.intakeId, name: selected.name, issueId: selected.issueId }),
    workspaceSlug,
    projectId: projectPick.projectId,
  });
}

export async function updateIssueStateCommand(ctx: PlaneCommandContext, nodeArg?: unknown): Promise<void> {
  const issueNode = requireIssueNode(nodeArg);
  const client = await ctx.auth.requireClient();
  const states = await client.listStates(issueNode.workspaceSlug, issueNode.projectId);
  const selected = await pickState(states);
  if (selected === undefined) {
    return;
  }
  await client.updateIssueState({
    workspaceSlug: issueNode.workspaceSlug,
    projectId: issueNode.projectId,
    issueId: issueNode.issueId,
    stateId: selected.stateId,
  });
  showPlaneInfo('Issue state updated');
  ctx.tree.refresh();
}

export async function updateIssueAssigneeCommand(ctx: PlaneCommandContext, nodeArg?: unknown): Promise<void> {
  const issueNode = requireIssueNode(nodeArg);
  const client = await ctx.auth.requireClient();
  const members = await client.listMembers(issueNode.workspaceSlug, issueNode.projectId);
  const selected = await pickMember(members);
  if (selected === undefined) {
    return;
  }
  const assigneeIds = selected.memberId.length === 0 ? [] : [selected.memberId];
  await client.updateIssueAssignee({
    workspaceSlug: issueNode.workspaceSlug,
    projectId: issueNode.projectId,
    issueId: issueNode.issueId,
    assigneeIds,
  });
  showPlaneInfo('Issue assignee updated');
  ctx.tree.refresh();
}

export async function updateIssuePriorityCommand(ctx: PlaneCommandContext, nodeArg?: unknown): Promise<void> {
  const issueNode = requireIssueNode(nodeArg);
  const priority = await pickPriority();
  if (priority === undefined) {
    return;
  }
  const client = await ctx.auth.requireClient();
  await client.updateIssueFields({
    workspaceSlug: issueNode.workspaceSlug,
    projectId: issueNode.projectId,
    issueId: issueNode.issueId,
    priority,
  });
  showPlaneInfo('Issue priority updated');
  ctx.tree.refresh();
}

export async function updateIssueLabelsCommand(ctx: PlaneCommandContext, nodeArg?: unknown): Promise<void> {
  const issueNode = requireIssueNode(nodeArg);
  const client = await ctx.auth.requireClient();
  const labels = await client.listLabels(issueNode.workspaceSlug, issueNode.projectId);
  const items: LabelPickItem[] = labels.map((item) => ({ label: item.name, description: item.color, labelId: item.id }));
  const selected = await vscode.window.showQuickPick(items, { title: 'Select labels', canPickMany: true });
  if (selected === undefined) {
    return;
  }
  await client.updateIssueFields({
    workspaceSlug: issueNode.workspaceSlug,
    projectId: issueNode.projectId,
    issueId: issueNode.issueId,
    labelIds: selected.map((item) => item.labelId),
  });
  showPlaneInfo('Issue labels updated');
  ctx.tree.refresh();
}

export async function updateIssueTitleCommand(ctx: PlaneCommandContext, nodeArg?: unknown): Promise<void> {
  const issueNode = requireIssueNode(nodeArg);
  const name = await vscode.window.showInputBox({ title: 'Issue title', value: issueNode.label, ignoreFocusOut: true });
  if (name === undefined || name.trim().length === 0) {
    return;
  }
  const confirmed = await vscode.window.showWarningMessage(`Overwrite title with “${name.trim()}”?`, { modal: true }, OVERWRITE_CONFIRM_ACTION);
  if (!isOverwriteConfirmed(confirmed)) {
    return;
  }
  const client = await ctx.auth.requireClient();
  await client.updateIssueFields({
    workspaceSlug: issueNode.workspaceSlug,
    projectId: issueNode.projectId,
    issueId: issueNode.issueId,
    name: name.trim(),
  });
  showPlaneInfo('Issue title updated');
  ctx.tree.refresh();
}

export async function updateIssueDescriptionCommand(ctx: PlaneCommandContext, nodeArg?: unknown): Promise<void> {
  const issueNode = requireIssueNode(nodeArg);
  const description = await vscode.window.showInputBox({ title: 'Issue description (plain text)', ignoreFocusOut: true });
  if (description === undefined) {
    return;
  }
  const confirmed = await vscode.window.showWarningMessage('Overwrite the issue description?', { modal: true }, OVERWRITE_CONFIRM_ACTION);
  if (!isOverwriteConfirmed(confirmed)) {
    return;
  }
  const client = await ctx.auth.requireClient();
  await client.updateIssueFields({
    workspaceSlug: issueNode.workspaceSlug,
    projectId: issueNode.projectId,
    issueId: issueNode.issueId,
    descriptionHtml: description.trim().length === 0 ? '' : `<p>${escapePlainText(description.trim())}</p>`,
  });
  showPlaneInfo('Issue description updated');
  ctx.tree.refresh();
}

export async function updateIssueDueDateCommand(ctx: PlaneCommandContext, nodeArg?: unknown): Promise<void> {
  const issueNode = requireIssueNode(nodeArg);
  const targetDate = await vscode.window.showInputBox({ title: 'Due date (YYYY-MM-DD)', ignoreFocusOut: true });
  if (targetDate === undefined) {
    return;
  }
  const client = await ctx.auth.requireClient();
  await client.updateIssueFields({
    workspaceSlug: issueNode.workspaceSlug,
    projectId: issueNode.projectId,
    issueId: issueNode.issueId,
    targetDate: targetDate.trim().length === 0 ? null : targetDate.trim(),
  });
  showPlaneInfo('Issue due date updated');
  ctx.tree.refresh();
}

export async function copyIssueKeyCommand(_ctx: PlaneCommandContext, nodeArg?: unknown): Promise<void> {
  const issueNode = requireIssueNode(nodeArg);
  const key = formatIssueKey(issueNode.projectIdentifier, issueNode.sequenceId, issueNode.issueId);
  await vscode.env.clipboard.writeText(key);
  showPlaneInfo(`Copied ${key}`);
}

export async function copyIssueUrlCommand(ctx: PlaneCommandContext, nodeArg?: unknown): Promise<void> {
  const issueNode = requireIssueNode(nodeArg);
  const url = buildIssueUrl(ctx.settings.read().serverUrl, {
    workspaceSlug: issueNode.workspaceSlug,
    projectId: issueNode.projectId,
    issueId: issueNode.issueId,
    projectIdentifier: issueNode.projectIdentifier,
    sequenceId: issueNode.sequenceId,
  });
  await vscode.env.clipboard.writeText(url);
  showPlaneInfo('Copied issue URL');
}

export async function archiveIssueCommand(ctx: PlaneCommandContext, nodeArg?: unknown): Promise<void> {
  const issueNode = requireIssueNode(nodeArg);
  const choice = await vscode.window.showWarningMessage(`Archive ${issueNode.label}?`, { modal: true }, ARCHIVE_CONFIRM_ACTION);
  if (!isArchiveConfirmed(choice)) {
    return;
  }
  const client = await ctx.auth.requireClient();
  await client.archiveIssue({ workspaceSlug: issueNode.workspaceSlug, projectId: issueNode.projectId, issueId: issueNode.issueId });
  showPlaneInfo('Issue archived');
  ctx.tree.refresh();
}

export async function deleteIssueCommand(ctx: PlaneCommandContext, nodeArg?: unknown): Promise<void> {
  const issueNode = requireIssueNode(nodeArg);
  const choice = await vscode.window.showWarningMessage(`Delete ${issueNode.label}? This cannot be undone.`, { modal: true }, DELETE_CONFIRM_ACTION);
  if (!isDeleteConfirmed(choice)) {
    return;
  }
  const client = await ctx.auth.requireClient();
  await client.deleteIssue({ workspaceSlug: issueNode.workspaceSlug, projectId: issueNode.projectId, issueId: issueNode.issueId });
  showPlaneInfo('Issue deleted');
  ctx.tree.refresh();
}

export async function subscribeIssueCommand(ctx: PlaneCommandContext, nodeArg?: unknown): Promise<void> {
  const issueNode = requireIssueNode(nodeArg);
  const items = [
    { label: 'Subscribe', subscribed: true },
    { label: 'Unsubscribe', subscribed: false },
  ];
  const selected = await vscode.window.showQuickPick(items, { title: 'Issue notifications' });
  if (selected === undefined) {
    return;
  }
  const client = await ctx.auth.requireClient();
  await client.subscribeIssue({
    workspaceSlug: issueNode.workspaceSlug,
    projectId: issueNode.projectId,
    issueId: issueNode.issueId,
    subscribed: selected.subscribed,
  });
  showPlaneInfo(selected.subscribed ? 'Subscribed to issue' : 'Unsubscribed from issue');
}

export async function bulkUpdateIssueStateCommand(ctx: PlaneCommandContext): Promise<void> {
  const selected = parseIssueNodes([...ctx.tree.selectedIssueNodes()]);
  if (selected.length === 0) {
    showPlaneInfo('Select one or more issues in the Issues tree');
    return;
  }
  const client = await ctx.auth.requireClient();
  const first = selected[0];
  if (first === undefined) {
    return;
  }
  const states = await client.listStates(first.workspaceSlug, first.projectId);
  const picked = await pickState(states);
  if (picked === undefined) {
    return;
  }
  for (const input of bulkStateChangeInputs(selected, picked.stateId)) {
    await client.updateIssueState(input);
  }
  showPlaneInfo(`Updated state on ${selected.length} issues`);
  ctx.tree.refresh();
}

export async function openLinkCommand(ctx: PlaneCommandContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    showPlaneInfo('Open a file with a Plane link or issue key first');
    return;
  }
  const documentText = editor.document.getText();
  const selection = editor.selection.isEmpty ? documentText : editor.document.getText(editor.selection);
  const settings = ctx.settings.read();
  const urls = detectPlaneUrls(selection, settings.serverUrl);
  if (urls.length > 0) {
    await openPlaneUrl(urls[0]?.url ?? settings.serverUrl);
    return;
  }
  const keys = detectIssueKeys(selection);
  if (keys.length === 0) {
    showPlaneInfo('No Plane issue key or URL found in selection');
    return;
  }
  await searchCommand(ctx);
}

export async function refreshCommand(ctx: PlaneCommandContext): Promise<void> {
  await refreshUi(ctx);
}

function requireIssueNode(nodeArg: unknown): PlaneTreeIssueNode {
  const node = parseIssueNode(nodeArg);
  if (node === undefined) {
    throw new Error('Select a Plane issue first');
  }
  return node;
}

async function pickWorkspaceSlug(ctx: PlaneCommandContext, workspaces: readonly PlaneWorkspace[]): Promise<string | undefined> {
  const defaultSlug = ctx.settings.read().defaultWorkspaceSlug;
  if (defaultSlug !== undefined && workspaces.some((workspace) => workspace.slug === defaultSlug)) {
    return defaultSlug;
  }
  if (workspaces.length === 1) {
    return workspaces[0]?.slug;
  }
  const items: WorkspacePickItem[] = workspaces.map((workspace) => ({
    label: workspace.name.length > 0 ? workspace.name : workspace.slug,
    description: workspace.slug,
    workspaceSlug: workspace.slug,
  }));
  const selected = await vscode.window.showQuickPick(items, { title: 'Select Plane workspace' });
  return selected?.workspaceSlug;
}

async function pickProject(client: Awaited<ReturnType<PlaneCommandContext['auth']['requireClient']>>, workspaceSlug: string): Promise<ProjectPickItem | undefined> {
  const projects = await client.listProjects(workspaceSlug);
  const items: ProjectPickItem[] = projects.map((project: PlaneProject) => ({
    label: project.name,
    description: project.identifier,
    workspaceSlug,
    projectId: project.id,
  }));
  return vscode.window.showQuickPick(items, { title: 'Select Plane project' });
}

async function pickProjectId(client: Awaited<ReturnType<PlaneCommandContext['auth']['requireClient']>>, workspaceSlug: string): Promise<string | undefined> {
  const selected = await pickProject(client, workspaceSlug);
  return selected?.projectId;
}

async function pickState(states: readonly PlaneState[]): Promise<StatePickItem | undefined> {
  const items: StatePickItem[] = states.map((state) => ({
    label: state.name,
    description: state.group,
    stateId: state.id,
  }));
  return vscode.window.showQuickPick(items, { title: 'Select issue state' });
}

async function pickMember(members: readonly PlaneMember[]): Promise<MemberPickItem | undefined> {
  const items: MemberPickItem[] = [
    { label: 'Unassigned', description: 'Clear assignee', memberId: '' },
    ...members.map((member) => ({
      label: member.displayName,
      memberId: member.id,
    })),
  ];
  return vscode.window.showQuickPick(items, { title: 'Select assignee' });
}

async function pickPriority(preferred?: string): Promise<PlanePriority | undefined> {
  const items: PriorityPickItem[] = Object.values(PlanePriority).map((priority) => ({
    label: planePriorityLabel(priority),
    priority,
    picked: preferred === priority,
  }));
  const selected = await vscode.window.showQuickPick(items, { title: 'Select priority' });
  return selected?.priority;
}

function escapePlainText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function pickTemplateDraft(client: PlaneClient, workspaceSlug: string, projectId: string): Promise<CreateIssueDraft | undefined | 'cancelled'> {
  const templates = await client.listTemplates(workspaceSlug, projectId).catch(() => []);
  if (templates.length === 0) {
    return undefined;
  }
  const items: TemplatePickItem[] = [{ label: 'No template', template: undefined }, ...templates.map((template) => ({ label: template.name, template }))];
  const selected = await vscode.window.showQuickPick(items, { title: 'Issue template' });
  if (selected === undefined) {
    return 'cancelled';
  }
  return selected.template === undefined ? undefined : draftFromTemplate(selected.template);
}

export function registerPlaneCommands(context: vscode.ExtensionContext, ctx: PlaneCommandContext): void {
  const wrap = (handler: (...args: unknown[]) => Promise<void>): ((...args: unknown[]) => void) => {
    return (...args: unknown[]): void => {
      void handler(...args).catch((error: unknown) => {
        if (isNotSignedInError(error)) {
          void vscode.commands.executeCommand('plane.openSignIn');
          return;
        }
        showPlaneError(error);
      });
    };
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'plane.search',
      wrap(async () => {
        await searchCommand(ctx);
      })
    ),
    vscode.commands.registerCommand(
      'plane.createIssue',
      wrap(async () => {
        await createIssueCommand(ctx);
      })
    ),
    vscode.commands.registerCommand(
      'plane.openLink',
      wrap(async () => {
        await openLinkCommand(ctx);
      })
    ),
    vscode.commands.registerCommand(
      'plane.convertIntake',
      wrap(async () => {
        await convertIntakeCommand(ctx);
      })
    )
  );
}
