import { API_PREFIX, HTTP_USER_AGENT, ISSUES_PAGE_SIZE, MAX_ISSUE_PAGES } from '../constants';
import { isPlaneError, PlaneError, PlaneErrorCode } from '../errors/plane-error';
import { HttpMethod } from '../utils/enums/http-method.enum';
import { credentialHeaders } from './credential-headers';
import type { HttpClient } from './http.types';
import type {
  CreateCommentInput,
  CreateIssueInput,
  IssueRef,
  ListIssuesQuery,
  PlaneAttachment,
  PlaneCycle,
  PlaneIntakeItem,
  PlaneIssue,
  PlaneIssueRelation,
  PlaneLabel,
  PlaneMember,
  PlaneModule,
  PlanePage,
  PlaneProject,
  PlaneState,
  PlaneTemplate,
  PlaneUser,
  PlaneWorklog,
  PlaneWorkspace,
  SubscribeIssueInput,
  UpdateCommentInput,
  UpdateIssueAssigneeInput,
  UpdateIssueFieldsInput,
  UpdateIssueStateInput,
} from './plane.types';
import { formatIssueKey } from '../issue/issue-key';
import { parseWorkspaceSearchHits } from '../search/workspace-search';
import type { IssueSearchHit } from '../search/search-issues';
import { parsePlaneRelationType } from '../utils/plane-relation-type';
import { parseComments, type PlaneComment } from '../issue/parse-comments';
import { retryAfterMessage } from './retry-after';

export interface PlaneClientOptions {
  readonly serverUrl: string;
  readonly http: HttpClient;
  readonly token?: string;
  readonly fallbackWorkspaceSlug?: string;
}

type IssueCollectionSegment = 'issues' | 'work-items';

interface PlaneClientState {
  issueCollectionByProject: Map<string, IssueCollectionSegment>;
}

function projectKey(workspaceSlug: string, projectId: string): string {
  return `${workspaceSlug}:${projectId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
}

function parseUser(raw: unknown): PlaneUser {
  if (!isRecord(raw)) {
    throw new PlaneError('User response is malformed', PlaneErrorCode.UNEXPECTED_RESPONSE);
  }
  const email = readString(raw['email']);
  const displayNameRaw = readString(raw['display_name']);
  const firstName = readString(raw['first_name']);
  const lastName = readString(raw['last_name']);
  const fallbackName = `${firstName} ${lastName}`.trim();
  return {
    id: readString(raw['id']),
    email,
    displayName: displayNameRaw.length > 0 ? displayNameRaw : fallbackName.length > 0 ? fallbackName : email,
    avatarUrl: readOptionalString(raw['avatar']),
  };
}

function parseWorkspace(raw: unknown): PlaneWorkspace {
  if (!isRecord(raw)) {
    throw new PlaneError('Workspace response is malformed', PlaneErrorCode.UNEXPECTED_RESPONSE);
  }
  return {
    id: readString(raw['id']),
    name: readString(raw['name']),
    slug: readString(raw['slug']),
  };
}

function parseUserSettingsWorkspace(raw: unknown): PlaneWorkspace | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const workspace = raw['workspace'];
  if (!isRecord(workspace)) {
    return undefined;
  }
  const slug = readString(workspace['last_workspace_slug']) || readString(workspace['fallback_workspace_slug']);
  if (slug.length === 0) {
    return undefined;
  }
  const id = readString(workspace['last_workspace_id']) || readString(workspace['fallback_workspace_id']);
  const name = readString(workspace['last_workspace_name']);
  return {
    id: id.length > 0 ? id : slug,
    name: name.length > 0 ? name : slug,
    slug,
  };
}

function parseProject(raw: unknown): PlaneProject {
  if (!isRecord(raw)) {
    throw new PlaneError('Project response is malformed', PlaneErrorCode.UNEXPECTED_RESPONSE);
  }
  return {
    id: readString(raw['id']),
    name: readString(raw['name']),
    identifier: readString(raw['identifier']),
    description: readString(raw['description']),
    emoji: readString(raw['emoji']),
  };
}

function parseState(raw: unknown): PlaneState {
  if (!isRecord(raw)) {
    throw new PlaneError('State response is malformed', PlaneErrorCode.UNEXPECTED_RESPONSE);
  }
  return {
    id: readString(raw['id']),
    name: readString(raw['name']),
    group: readString(raw['group']),
    color: readString(raw['color']),
  };
}

function parseMember(raw: unknown): PlaneMember | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const memberRaw = raw['member'];
  if (isRecord(memberRaw)) {
    const email = readString(memberRaw['email']);
    const displayName = readString(memberRaw['display_name']);
    return {
      id: readString(memberRaw['id']),
      displayName: displayName.length > 0 ? displayName : email,
      email,
      avatarUrl: readOptionalString(memberRaw['avatar']),
    };
  }
  const email = readString(raw['email']);
  const displayName = readString(raw['display_name']);
  const id = readString(raw['id']);
  if (id.length === 0) {
    return undefined;
  }
  return {
    id,
    displayName: displayName.length > 0 ? displayName : email,
    email,
    avatarUrl: readOptionalString(raw['avatar']),
  };
}

function parseAssignees(raw: unknown): readonly { readonly id: string; readonly name: string }[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const assignees: { id: string; name: string }[] = [];
  for (const item of raw) {
    if (!isRecord(item)) {
      continue;
    }
    const id = readString(item['id']);
    if (id.length === 0) {
      continue;
    }
    const displayName = readString(item['display_name']);
    const email = readString(item['email']);
    assignees.push({ id, name: displayName.length > 0 ? displayName : email });
  }
  return assignees;
}

function parseIdList(raw: unknown): readonly string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.length > 0) {
      ids.push(item);
      continue;
    }
    if (isRecord(item)) {
      const id = readString(item['id']);
      if (id.length > 0) {
        ids.push(id);
      }
    }
  }
  return ids;
}

function parseLabelNames(raw: unknown): readonly string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const names: string[] = [];
  for (const item of raw) {
    if (isRecord(item)) {
      const name = readString(item['name']);
      if (name.length > 0) {
        names.push(name);
      }
    }
  }
  return names;
}

function parseLabel(raw: unknown): PlaneLabel {
  if (!isRecord(raw)) {
    throw new PlaneError('Label response is malformed', PlaneErrorCode.UNEXPECTED_RESPONSE);
  }
  return {
    id: readString(raw['id']),
    name: readString(raw['name']),
    color: readString(raw['color']),
  };
}

function parseIssue(raw: unknown, workspaceSlug: string, project: PlaneProject): PlaneIssue {
  if (!isRecord(raw)) {
    throw new PlaneError('Issue response is malformed', PlaneErrorCode.UNEXPECTED_RESPONSE);
  }
  const stateRaw = raw['state_detail'];
  const stateIdFromDetail = isRecord(stateRaw) ? readString(stateRaw['id']) : '';
  const stateNameFromDetail = isRecord(stateRaw) ? readString(stateRaw['name']) : '';
  const assignees = parseAssignees(raw['assignees']);
  const identifierRaw = readString(raw['project_identifier']);
  return {
    id: readString(raw['id']),
    name: readString(raw['name']),
    descriptionHtml: readString(raw['description_html']),
    descriptionPlain: readString(raw['description']),
    sequenceId: readNumber(raw['sequence_id']),
    projectId: readString(raw['project']) || project.id,
    workspaceSlug,
    projectIdentifier: identifierRaw.length > 0 ? identifierRaw : project.identifier,
    stateId: readString(raw['state']) || stateIdFromDetail,
    stateName: stateNameFromDetail,
    priority: readString(raw['priority']),
    assigneeIds: assignees.map((item) => item.id),
    assigneeNames: assignees.map((item) => item.name),
    createdAt: readString(raw['created_at']),
    updatedAt: readString(raw['updated_at']),
    targetDate: readOptionalString(raw['target_date']),
    createdById: readOptionalString(raw['created_by']),
    parentId: readOptionalString(raw['parent']),
    labelIds: parseIdList(raw['labels']),
    labelNames: parseLabelNames(raw['label_details'] ?? raw['labels']),
  };
}

function parseCycle(raw: unknown): PlaneCycle {
  if (!isRecord(raw)) {
    throw new PlaneError('Cycle response is malformed', PlaneErrorCode.UNEXPECTED_RESPONSE);
  }
  return {
    id: readString(raw['id']),
    name: readString(raw['name']),
    status: readString(raw['status']),
    startDate: readOptionalString(raw['start_date']),
    endDate: readOptionalString(raw['end_date']),
  };
}

function parseModule(raw: unknown): PlaneModule {
  if (!isRecord(raw)) {
    throw new PlaneError('Module response is malformed', PlaneErrorCode.UNEXPECTED_RESPONSE);
  }
  return {
    id: readString(raw['id']),
    name: readString(raw['name']),
    status: readString(raw['status']),
  };
}

function parseAttachment(raw: unknown): PlaneAttachment | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const id = readString(raw['id']);
  if (id.length === 0) {
    return undefined;
  }
  const attributes = raw['attributes'];
  const name = isRecord(attributes) ? readString(attributes['name']) : readString(raw['name'] ?? raw['asset']);
  return {
    id,
    name: name.length > 0 ? name : id,
    url: readString(raw['asset'] ?? raw['url']),
  };
}

function parseRelation(raw: unknown): PlaneIssueRelation | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const id = readString(raw['id']);
  if (id.length === 0) {
    return undefined;
  }
  const detail = isRecord(raw['issue_detail']) ? raw['issue_detail'] : raw;
  const identifier = isRecord(detail) ? readString(detail['project_identifier']) : '';
  const sequenceId = isRecord(detail) ? readNumber(detail['sequence_id']) : 0;
  const issueId = readString(raw['issue']) || (isRecord(detail) ? readString(detail['id']) : '');
  return {
    id,
    type: parsePlaneRelationType(raw['relation_type']),
    issueId,
    name: isRecord(detail) ? readString(detail['name']) : '',
    key: formatIssueKey(identifier, sequenceId, issueId),
  };
}

function parsePage(raw: unknown, workspaceSlug: string, projectId: string): PlanePage | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const id = readString(raw['id']);
  if (id.length === 0) {
    return undefined;
  }
  return {
    id,
    name: readString(raw['name']),
    projectId,
    workspaceSlug,
  };
}

function parseIntake(raw: unknown): PlaneIntakeItem | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const nested = isRecord(raw['issue_detail']) ? raw['issue_detail'] : raw;
  const id = readString(raw['id']) || readString(nested['id']);
  if (id.length === 0) {
    return undefined;
  }
  return {
    id,
    name: readString(nested['name']),
    issueId: readOptionalString(raw['issue'] ?? nested['id']),
  };
}

function parseTemplate(raw: unknown): PlaneTemplate | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const id = readString(raw['id']);
  if (id.length === 0) {
    return undefined;
  }
  return {
    id,
    name: readString(raw['name']),
    descriptionHtml: readString(raw['description_html']),
  };
}

function parseWorklog(raw: unknown): PlaneWorklog | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const id = readString(raw['id']);
  if (id.length === 0) {
    return undefined;
  }
  return {
    id,
    duration: readString(raw['duration'] ?? raw['logged_time']),
    description: readString(raw['description']),
  };
}

function parseOptionalList<T>(raw: unknown, mapItem: (item: unknown) => T | undefined): readonly T[] {
  const items = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw['results']) ? raw['results'] : [];
  return items.map(mapItem).filter((item): item is T => item !== undefined);
}

function parseList<T>(raw: unknown, mapItem: (item: unknown) => T): readonly T[] {
  if (Array.isArray(raw)) {
    return raw.map(mapItem);
  }
  if (isRecord(raw) && Array.isArray(raw['results'])) {
    return raw['results'].map(mapItem);
  }
  throw new PlaneError('List response is malformed', PlaneErrorCode.UNEXPECTED_RESPONSE);
}

function parseNextCursor(raw: unknown): string | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const cursor = raw['next_cursor'] ?? raw['next_page_results'] ?? raw['cursor'];
  return typeof cursor === 'string' && cursor.length > 0 ? cursor : undefined;
}

function isCloudflare1010(body: string): boolean {
  return body.includes('error-1010') || body.includes('Error 1010');
}

export class PlaneClient {
  private readonly state: PlaneClientState = { issueCollectionByProject: new Map() };

  public constructor(private readonly options: PlaneClientOptions) {}

  public async currentUser(): Promise<PlaneUser> {
    const raw = await this.requestJson(`${this.apiRoot()}/users/me/`, HttpMethod.GET);
    return parseUser(raw);
  }

  public async listWorkspaces(): Promise<readonly PlaneWorkspace[]> {
    const fromCollection = await this.tryListWorkspaces(`${this.apiRoot()}/workspaces/`);
    if (fromCollection.length > 0) {
      return fromCollection;
    }
    const fromCurrentUser = await this.tryListWorkspaces(`${this.apiRoot()}/users/me/workspaces/`);
    if (fromCurrentUser.length > 0) {
      return fromCurrentUser;
    }
    const slug = this.options.fallbackWorkspaceSlug;
    if (slug !== undefined && slug.length > 0) {
      return [await this.getWorkspaceBySlug(slug)];
    }
    const fromUserSettings = parseUserSettingsWorkspace(await this.requestJsonOrEmpty(`${this.apiRoot()}/users/me/settings/`, HttpMethod.GET));
    if (fromUserSettings !== undefined) {
      return [fromUserSettings];
    }
    throw new PlaneError('Set plane.defaultWorkspaceSlug to your workspace slug.', PlaneErrorCode.NOT_FOUND);
  }

  public async listProjects(workspaceSlug: string): Promise<readonly PlaneProject[]> {
    const raw = await this.requestJson(`${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/`, HttpMethod.GET);
    return parseList(raw, parseProject);
  }

  public async listStates(workspaceSlug: string, projectId: string): Promise<readonly PlaneState[]> {
    const raw = await this.requestJson(`${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/states/`, HttpMethod.GET);
    return parseList(raw, parseState);
  }

  public async listMembers(workspaceSlug: string, projectId: string): Promise<readonly PlaneMember[]> {
    const raw = await this.requestJson(`${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/members/`, HttpMethod.GET);
    const parsed = parseList(raw, parseMember);
    return parsed.filter((member): member is PlaneMember => member !== undefined);
  }

  public async listIssues(workspaceSlug: string, projectId: string, query?: ListIssuesQuery): Promise<readonly PlaneIssue[]> {
    const project = await this.findProject(workspaceSlug, projectId);
    const segment = await this.resolveIssueCollectionSegment(workspaceSlug, projectId);
    const items: PlaneIssue[] = [];
    let cursor: string | undefined;
    let page = 0;
    do {
      const params = new URLSearchParams();
      params.set('per_page', String(ISSUES_PAGE_SIZE));
      params.set('expand', 'assignees,state_detail');
      if (cursor !== undefined) {
        params.set('cursor', cursor);
      }
      if (query?.search !== undefined && query.search.trim().length > 0) {
        params.set('search', query.search.trim());
      }
      const url = `${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/${segment}/?${params.toString()}`;
      const raw = await this.requestJson(url, HttpMethod.GET);
      const pageItems = parseList(raw, (item) => parseIssue(item, workspaceSlug, project));
      items.push(...pageItems);
      cursor = parseNextCursor(raw);
      page += 1;
    } while (cursor !== undefined && page < MAX_ISSUE_PAGES);
    return items;
  }

  public async getIssue(workspaceSlug: string, projectId: string, issueId: string): Promise<PlaneIssue> {
    const project = await this.findProject(workspaceSlug, projectId);
    const segment = await this.resolveIssueCollectionSegment(workspaceSlug, projectId);
    const raw = await this.requestJson(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/${segment}/${encodeURIComponent(issueId)}/?expand=assignees,state_detail`,
      HttpMethod.GET
    );
    return parseIssue(raw, workspaceSlug, project);
  }

  public async createIssue(input: CreateIssueInput): Promise<PlaneIssue> {
    const segment = await this.resolveIssueCollectionSegment(input.workspaceSlug, input.projectId);
    const payload: Record<string, unknown> = {
      name: input.name,
      description_html: input.descriptionHtml,
      priority: input.priority,
    };
    if (input.labelIds !== undefined) {
      payload['labels'] = [...input.labelIds];
    }
    const raw = await this.requestJson(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(input.workspaceSlug)}/projects/${encodeURIComponent(input.projectId)}/${segment}/`,
      HttpMethod.POST,
      JSON.stringify(payload)
    );
    const project = await this.findProject(input.workspaceSlug, input.projectId);
    return parseIssue(raw, input.workspaceSlug, project);
  }

  public async updateIssueState(input: UpdateIssueStateInput): Promise<PlaneIssue> {
    const segment = await this.resolveIssueCollectionSegment(input.workspaceSlug, input.projectId);
    const body = JSON.stringify({ state: input.stateId });
    const raw = await this.requestJson(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(input.workspaceSlug)}/projects/${encodeURIComponent(input.projectId)}/${segment}/${encodeURIComponent(input.issueId)}/`,
      HttpMethod.PATCH,
      body
    );
    const project = await this.findProject(input.workspaceSlug, input.projectId);
    return parseIssue(raw, input.workspaceSlug, project);
  }

  public async updateIssueAssignee(input: UpdateIssueAssigneeInput): Promise<PlaneIssue> {
    const segment = await this.resolveIssueCollectionSegment(input.workspaceSlug, input.projectId);
    const body = JSON.stringify({ assignees: [...input.assigneeIds] });
    const raw = await this.requestJson(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(input.workspaceSlug)}/projects/${encodeURIComponent(input.projectId)}/${segment}/${encodeURIComponent(input.issueId)}/`,
      HttpMethod.PATCH,
      body
    );
    const project = await this.findProject(input.workspaceSlug, input.projectId);
    return parseIssue(raw, input.workspaceSlug, project);
  }

  public async updateIssueFields(input: UpdateIssueFieldsInput): Promise<PlaneIssue> {
    const segment = await this.resolveIssueCollectionSegment(input.workspaceSlug, input.projectId);
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) {
      payload['name'] = input.name;
    }
    if (input.descriptionHtml !== undefined) {
      payload['description_html'] = input.descriptionHtml;
    }
    if (input.priority !== undefined) {
      payload['priority'] = input.priority;
    }
    if (input.labelIds !== undefined) {
      payload['labels'] = [...input.labelIds];
    }
    if (input.targetDate !== undefined) {
      payload['target_date'] = input.targetDate;
    }
    const raw = await this.requestJson(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(input.workspaceSlug)}/projects/${encodeURIComponent(input.projectId)}/${segment}/${encodeURIComponent(input.issueId)}/`,
      HttpMethod.PATCH,
      JSON.stringify(payload)
    );
    const project = await this.findProject(input.workspaceSlug, input.projectId);
    return parseIssue(raw, input.workspaceSlug, project);
  }

  public async listComments(workspaceSlug: string, projectId: string, issueId: string): Promise<readonly PlaneComment[]> {
    const segment = await this.resolveIssueCollectionSegment(workspaceSlug, projectId);
    const raw = await this.requestJson(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/${segment}/${encodeURIComponent(issueId)}/comments/`,
      HttpMethod.GET
    );
    return parseComments(raw);
  }

  public async listLabels(workspaceSlug: string, projectId: string): Promise<readonly PlaneLabel[]> {
    const raw = await this.requestJson(`${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/labels/`, HttpMethod.GET);
    return parseList(raw, parseLabel);
  }

  public async listSubIssues(workspaceSlug: string, projectId: string, issueId: string): Promise<readonly PlaneIssue[]> {
    const project = await this.findProject(workspaceSlug, projectId);
    const segment = await this.resolveIssueCollectionSegment(workspaceSlug, projectId);
    const raw = await this.requestJson(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/${segment}/${encodeURIComponent(issueId)}/sub-issues/`,
      HttpMethod.GET
    );
    const items = isRecord(raw) && Array.isArray(raw['sub_issues']) ? raw['sub_issues'] : isRecord(raw) && Array.isArray(raw['results']) ? raw['results'] : Array.isArray(raw) ? raw : [];
    return items.map((item) => parseIssue(item, workspaceSlug, project));
  }

  public async listCycles(workspaceSlug: string, projectId: string): Promise<readonly PlaneCycle[]> {
    const raw = await this.requestJsonOrEmpty(`${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/cycles/`, HttpMethod.GET);
    return parseOptionalList(raw, parseCycle);
  }

  public async listCycleIssues(workspaceSlug: string, projectId: string, cycleId: string): Promise<readonly PlaneIssue[]> {
    const project = await this.findProject(workspaceSlug, projectId);
    const raw = await this.requestJsonOrEmpty(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/cycles/${encodeURIComponent(cycleId)}/cycle-issues/`,
      HttpMethod.GET
    );
    return parseOptionalList(raw, (item) => {
      const detail = isRecord(item) && isRecord(item['issue_detail']) ? item['issue_detail'] : item;
      if (!isRecord(detail) || readString(detail['id']).length === 0) {
        return undefined;
      }
      return parseIssue(detail, workspaceSlug, project);
    });
  }

  public async listModules(workspaceSlug: string, projectId: string): Promise<readonly PlaneModule[]> {
    const raw = await this.requestJsonOrEmpty(`${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/modules/`, HttpMethod.GET);
    return parseOptionalList(raw, parseModule);
  }

  public async listModuleIssues(workspaceSlug: string, projectId: string, moduleId: string): Promise<readonly PlaneIssue[]> {
    const project = await this.findProject(workspaceSlug, projectId);
    const raw = await this.requestJsonOrEmpty(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/modules/${encodeURIComponent(moduleId)}/module-issues/`,
      HttpMethod.GET
    );
    return parseOptionalList(raw, (item) => {
      const detail = isRecord(item) && isRecord(item['issue_detail']) ? item['issue_detail'] : item;
      if (!isRecord(detail) || readString(detail['id']).length === 0) {
        return undefined;
      }
      return parseIssue(detail, workspaceSlug, project);
    });
  }

  public async listAttachments(workspaceSlug: string, projectId: string, issueId: string): Promise<readonly PlaneAttachment[]> {
    const segment = await this.resolveIssueCollectionSegment(workspaceSlug, projectId);
    const raw = await this.requestJsonOrEmpty(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/${segment}/${encodeURIComponent(issueId)}/issue-attachments/`,
      HttpMethod.GET
    );
    return parseOptionalList(raw, parseAttachment);
  }

  public async listRelations(workspaceSlug: string, projectId: string, issueId: string): Promise<readonly PlaneIssueRelation[]> {
    const segment = await this.resolveIssueCollectionSegment(workspaceSlug, projectId);
    const raw = await this.requestJsonOrEmpty(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/${segment}/${encodeURIComponent(issueId)}/issue-relation/`,
      HttpMethod.GET
    );
    return parseOptionalList(raw, parseRelation);
  }

  public async listPages(workspaceSlug: string, projectId: string): Promise<readonly PlanePage[]> {
    const raw = await this.requestJsonOrEmpty(`${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/pages/`, HttpMethod.GET);
    return parseOptionalList(raw, (item) => parsePage(item, workspaceSlug, projectId));
  }

  public async listIntake(workspaceSlug: string, projectId: string): Promise<readonly PlaneIntakeItem[]> {
    const raw = await this.requestJsonOrEmpty(`${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/inbox-issues/`, HttpMethod.GET);
    return parseOptionalList(raw, parseIntake);
  }

  public async listTemplates(workspaceSlug: string, projectId: string): Promise<readonly PlaneTemplate[]> {
    const raw = await this.requestJsonOrEmpty(`${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/issue-templates/`, HttpMethod.GET);
    return parseOptionalList(raw, parseTemplate);
  }

  public async listWorklogs(workspaceSlug: string, projectId: string, issueId: string): Promise<readonly PlaneWorklog[]> {
    const segment = await this.resolveIssueCollectionSegment(workspaceSlug, projectId);
    const raw = await this.requestJsonOrEmpty(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/${segment}/${encodeURIComponent(issueId)}/worklogs/`,
      HttpMethod.GET
    );
    return parseOptionalList(raw, parseWorklog);
  }

  public async createComment(input: CreateCommentInput): Promise<readonly PlaneComment[]> {
    const segment = await this.resolveIssueCollectionSegment(input.workspaceSlug, input.projectId);
    await this.requestJson(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(input.workspaceSlug)}/projects/${encodeURIComponent(input.projectId)}/${segment}/${encodeURIComponent(input.issueId)}/comments/`,
      HttpMethod.POST,
      JSON.stringify({ comment_html: input.html })
    );
    return this.listComments(input.workspaceSlug, input.projectId, input.issueId);
  }

  public async updateComment(input: UpdateCommentInput): Promise<readonly PlaneComment[]> {
    const segment = await this.resolveIssueCollectionSegment(input.workspaceSlug, input.projectId);
    await this.requestJson(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(input.workspaceSlug)}/projects/${encodeURIComponent(input.projectId)}/${segment}/${encodeURIComponent(input.issueId)}/comments/${encodeURIComponent(input.commentId)}/`,
      HttpMethod.PATCH,
      JSON.stringify({ comment_html: input.html })
    );
    return this.listComments(input.workspaceSlug, input.projectId, input.issueId);
  }

  public async archiveIssue(input: IssueRef): Promise<PlaneIssue> {
    const segment = await this.resolveIssueCollectionSegment(input.workspaceSlug, input.projectId);
    const raw = await this.requestJson(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(input.workspaceSlug)}/projects/${encodeURIComponent(input.projectId)}/${segment}/${encodeURIComponent(input.issueId)}/`,
      HttpMethod.PATCH,
      JSON.stringify({ archived_at: new Date().toISOString() })
    );
    const project = await this.findProject(input.workspaceSlug, input.projectId);
    return parseIssue(raw, input.workspaceSlug, project);
  }

  public async deleteIssue(input: IssueRef): Promise<void> {
    const segment = await this.resolveIssueCollectionSegment(input.workspaceSlug, input.projectId);
    await this.requestJson(
      `${this.apiRoot()}/workspaces/${encodeURIComponent(input.workspaceSlug)}/projects/${encodeURIComponent(input.projectId)}/${segment}/${encodeURIComponent(input.issueId)}/`,
      HttpMethod.DELETE
    );
  }

  public async subscribeIssue(input: SubscribeIssueInput): Promise<void> {
    const segment = await this.resolveIssueCollectionSegment(input.workspaceSlug, input.projectId);
    const url = `${this.apiRoot()}/workspaces/${encodeURIComponent(input.workspaceSlug)}/projects/${encodeURIComponent(input.projectId)}/${segment}/${encodeURIComponent(input.issueId)}/subscribe/`;
    await this.requestJson(url, input.subscribed ? HttpMethod.POST : HttpMethod.DELETE);
  }

  public async searchWorkspace(workspaceSlug: string, keyword: string): Promise<readonly IssueSearchHit[]> {
    const params = new URLSearchParams();
    params.set('search', keyword);
    params.set('query_type', 'issue');
    const raw = await this.requestJsonOrEmpty(`${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/search/?${params.toString()}`, HttpMethod.GET);
    return parseWorkspaceSearchHits(raw, workspaceSlug);
  }

  private async tryListWorkspaces(url: string): Promise<readonly PlaneWorkspace[]> {
    const raw = await this.requestJsonOrEmpty(url, HttpMethod.GET);
    if (!Array.isArray(raw) && !(isRecord(raw) && Array.isArray(raw['results']))) {
      return [];
    }
    try {
      return parseList(raw, parseWorkspace);
    } catch {
      return [];
    }
  }

  private async getWorkspaceBySlug(slug: string): Promise<PlaneWorkspace> {
    try {
      const raw = await this.requestJson(`${this.apiRoot()}/workspaces/${encodeURIComponent(slug)}/`, HttpMethod.GET);
      if (isRecord(raw) && isRecord(raw['workspace'])) {
        return parseWorkspace(raw['workspace']);
      }
      return parseWorkspace(raw);
    } catch (error: unknown) {
      if (isPlaneError(error) && (error.code === PlaneErrorCode.NOT_FOUND || error.code === PlaneErrorCode.UNAUTHENTICATED)) {
        return { id: slug, name: slug, slug };
      }
      throw error;
    }
  }

  private async findProject(workspaceSlug: string, projectId: string): Promise<PlaneProject> {
    const projects = await this.listProjects(workspaceSlug);
    const match = projects.find((project) => project.id === projectId);
    if (match === undefined) {
      throw new PlaneError('Project not found', PlaneErrorCode.NOT_FOUND);
    }
    return match;
  }

  private async resolveIssueCollectionSegment(workspaceSlug: string, projectId: string): Promise<IssueCollectionSegment> {
    const key = projectKey(workspaceSlug, projectId);
    const cached = this.state.issueCollectionByProject.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const issuesUrl = `${this.apiRoot()}/workspaces/${encodeURIComponent(workspaceSlug)}/projects/${encodeURIComponent(projectId)}/issues/?per_page=1`;
    const response = await this.options.http({
      url: issuesUrl,
      method: HttpMethod.GET,
      headers: this.buildHeaders(),
    });
    const segment: IssueCollectionSegment = response.status === 404 ? 'work-items' : 'issues';
    this.state.issueCollectionByProject.set(key, segment);
    return segment;
  }

  private apiRoot(): string {
    return `${this.options.serverUrl.replace(/\/+$/u, '')}${API_PREFIX}`;
  }

  private buildHeaders(): Readonly<Record<string, string>> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': HTTP_USER_AGENT,
      ...credentialHeaders(this.options.token),
    };
  }

  private async requestJsonOrEmpty(url: string, method: HttpMethod, body?: string): Promise<unknown> {
    try {
      return await this.requestJson(url, method, body);
    } catch (error: unknown) {
      if (isPlaneError(error) && error.code === PlaneErrorCode.NOT_FOUND) {
        return [];
      }
      throw error;
    }
  }

  private async requestJson(url: string, method: HttpMethod, body?: string): Promise<unknown> {
    const response = await this.options.http({
      url,
      method,
      headers: this.buildHeaders(),
      ...(body === undefined ? {} : { body }),
    });

    if (response.status === 408) {
      throw new PlaneError('Plane API timed out. Try Force reload.', PlaneErrorCode.HTTP_ERROR);
    }
    if (response.status === 403 && isCloudflare1010(response.body)) {
      throw new PlaneError('Cloudflare blocked the Plane API (error 1010). Allow API clients on /api/v1 or disable Bot Fight Mode for that path.', PlaneErrorCode.HTTP_ERROR);
    }
    if (response.status === 401 || response.status === 403) {
      throw new PlaneError('Plane authentication failed', PlaneErrorCode.UNAUTHENTICATED);
    }
    if (response.status === 404) {
      throw new PlaneError('Plane resource not found', PlaneErrorCode.NOT_FOUND);
    }
    if (response.status === 429) {
      throw new PlaneError(retryAfterMessage(response.headers), PlaneErrorCode.RATE_LIMITED);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new PlaneError(`Plane request failed (${response.status})`, PlaneErrorCode.HTTP_ERROR);
    }
    if (response.body.trim().length === 0) {
      return {};
    }
    try {
      return JSON.parse(response.body) as unknown;
    } catch (cause: unknown) {
      throw new PlaneError('Plane response is not valid JSON', PlaneErrorCode.UNEXPECTED_RESPONSE, { cause });
    }
  }
}
