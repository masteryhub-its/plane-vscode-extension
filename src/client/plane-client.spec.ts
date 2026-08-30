import { API_PREFIX } from '../constants';
import { credentialHeaders } from './credential-headers';
import { PlaneClient } from './plane-client';
import type { HttpClient, HttpRequest, HttpResponse } from './http.types';

function jsonResponse(status: number, body: unknown): HttpResponse {
  return {
    status,
    headers: new Map([['content-type', 'application/json']]),
    setCookie: [],
    body: JSON.stringify(body),
  };
}

interface FakeHttp {
  readonly client: HttpClient;
  readonly requests: HttpRequest[];
}

function createFakeHttp(responses: HttpResponse[]): FakeHttp {
  const requests: HttpRequest[] = [];
  const queue = [...responses];
  const client: HttpClient = (request: HttpRequest): Promise<HttpResponse> => {
    requests.push(request);
    const next = queue.shift();
    if (next === undefined) {
      throw new Error('No fake response queued');
    }
    return Promise.resolve(next);
  };
  return { client, requests };
}

const SERVER = 'https://plane.example.test';
const SLUG = 'acme';
const PROJECT_ID = 'proj-1';
const ISSUE_ID = 'issue-1';

describe('PlaneClient', () => {
  it('loads current user with X-API-Key', async () => {
    const { client, requests } = createFakeHttp([jsonResponse(200, { id: 'u1', email: 'dev@example.com', display_name: 'Dev' })]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    const user = await plane.currentUser();
    expect(user.email).toBe('dev@example.com');
    expect(requests[0]?.headers['X-API-Key']).toBe('plane_api_test');
    expect(requests[0]?.headers['User-Agent']).toContain('Chrome/');
    expect(requests[0]?.url).toBe(`${SERVER}${API_PREFIX}/users/me/`);
  });

  it('falls back from issues to work-items on 404', async () => {
    const issueBody = {
      results: [
        {
          id: ISSUE_ID,
          name: 'Fix login',
          sequence_id: 42,
          project: PROJECT_ID,
          project_identifier: 'MH',
          state: 'state-1',
          state_detail: { id: 'state-1', name: 'Todo' },
          priority: 'high',
          assignees: [],
          description_html: '<p>Details</p>',
          created_at: '2026-01-01',
          updated_at: '2026-01-02',
        },
      ],
    };
    const { client, requests } = createFakeHttp([jsonResponse(200, [{ id: PROJECT_ID, name: 'Core', identifier: 'MH' }]), jsonResponse(404, {}), jsonResponse(200, issueBody)]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    const issues = await plane.listIssues(SLUG, PROJECT_ID);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.name).toBe('Fix login');
    expect(requests.some((request) => request.url.includes('/work-items/'))).toBe(true);
  });

  it('creates an issue via PATCH state', async () => {
    const project = { id: PROJECT_ID, name: 'Core', identifier: 'MH' };
    const issue = {
      id: ISSUE_ID,
      name: 'Fix login',
      sequence_id: 42,
      project: PROJECT_ID,
      project_identifier: 'MH',
      state: 'state-2',
      state_detail: { id: 'state-2', name: 'Done' },
      priority: 'high',
      assignees: [],
      description_html: '',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    };
    const { client } = createFakeHttp([jsonResponse(200, {}), jsonResponse(200, issue), jsonResponse(200, [project])]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    const updated = await plane.updateIssueState({ workspaceSlug: SLUG, projectId: PROJECT_ID, issueId: ISSUE_ID, stateId: 'state-2' });
    expect(updated.stateName).toBe('Done');
  });

  it('patches title, priority, labels, and due date', async () => {
    const project = { id: PROJECT_ID, name: 'Core', identifier: 'MH' };
    const issue = {
      id: ISSUE_ID,
      name: 'Renamed',
      sequence_id: 42,
      project: PROJECT_ID,
      project_identifier: 'MH',
      state: 'state-1',
      state_detail: { id: 'state-1', name: 'Todo' },
      priority: 'urgent',
      labels: ['lab-1'],
      target_date: '2026-09-01',
      assignees: [],
      description_html: '<p>Updated</p>',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    };
    const { client, requests } = createFakeHttp([jsonResponse(200, {}), jsonResponse(200, issue), jsonResponse(200, [project])]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    const updated = await plane.updateIssueFields({
      workspaceSlug: SLUG,
      projectId: PROJECT_ID,
      issueId: ISSUE_ID,
      name: 'Renamed',
      descriptionHtml: '<p>Updated</p>',
      priority: 'urgent',
      labelIds: ['lab-1'],
      targetDate: '2026-09-01',
    });
    expect(updated.name).toBe('Renamed');
    expect(updated.priority).toBe('urgent');
    expect(updated.targetDate).toBe('2026-09-01');
    expect(JSON.parse(requests[1]?.body ?? '{}')).toEqual({
      name: 'Renamed',
      description_html: '<p>Updated</p>',
      priority: 'urgent',
      labels: ['lab-1'],
      target_date: '2026-09-01',
    });
  });

  it('lists comments newest first', async () => {
    const { client } = createFakeHttp([
      jsonResponse(200, {}),
      jsonResponse(200, {
        results: [
          { id: 'c1', comment_html: '<p>Old</p>', created_at: '2026-01-01T00:00:00Z', actor_detail: { display_name: 'Ada' } },
          { id: 'c2', comment_html: '<p>New</p>', created_at: '2026-02-01T00:00:00Z', actor_detail: { display_name: 'Sara' } },
        ],
      }),
    ]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    const comments = await plane.listComments(SLUG, PROJECT_ID, ISSUE_ID);
    expect(comments.map((comment) => comment.id)).toEqual(['c2', 'c1']);
  });

  it('lists project labels', async () => {
    const { client } = createFakeHttp([jsonResponse(200, [{ id: 'lab-1', name: 'bug', color: '#ff0000' }])]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    await expect(plane.listLabels(SLUG, PROJECT_ID)).resolves.toEqual([{ id: 'lab-1', name: 'bug', color: '#ff0000' }]);
  });

  it('lists sub-issues', async () => {
    const project = { id: PROJECT_ID, name: 'Core', identifier: 'MH' };
    const child = {
      id: 'child-1',
      name: 'Child',
      sequence_id: 43,
      project: PROJECT_ID,
      project_identifier: 'MH',
      state: 'state-1',
      state_detail: { id: 'state-1', name: 'Todo' },
      priority: 'none',
      assignees: [],
      description_html: '',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    };
    const { client } = createFakeHttp([jsonResponse(200, [project]), jsonResponse(200, {}), jsonResponse(200, { sub_issues: [child] })]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    const children = await plane.listSubIssues(SLUG, PROJECT_ID, ISSUE_ID);
    expect(children[0]?.id).toBe('child-1');
  });

  it('surfaces a 429 with retry-after seconds', async () => {
    const headers = new Map([['retry-after', '8']]);
    const { client } = createFakeHttp([
      {
        status: 429,
        headers,
        setCookie: [],
        body: '{}',
      },
    ]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    await expect(plane.currentUser()).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      message: 'Plane rate limit reached. Try again in 8 seconds.',
    });
  });

  it('explains Cloudflare 1010 instead of treating it as a bad PAT', async () => {
    const { client } = createFakeHttp([
      jsonResponse(403, {
        type: 'https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/',
      }),
    ]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    await expect(plane.currentUser()).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      message: 'Cloudflare blocked the Plane API (error 1010). Allow API clients on /api/v1 or disable Bot Fight Mode for that path.',
    });
  });

  it('explains an API timeout', async () => {
    const { client } = createFakeHttp([{ status: 408, headers: new Map(), setCookie: [], body: '' }]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    await expect(plane.currentUser()).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      message: 'Plane API timed out. Try Force reload.',
    });
  });

  it('lists cycles and treats missing cycle routes as empty', async () => {
    const { client } = createFakeHttp([jsonResponse(200, [{ id: 'cyc-1', name: 'Sprint 1', status: 'current' }]), jsonResponse(404, {})]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    await expect(plane.listCycles(SLUG, PROJECT_ID)).resolves.toEqual([{ id: 'cyc-1', name: 'Sprint 1', status: 'current', startDate: undefined, endDate: undefined }]);
    await expect(plane.listModules(SLUG, PROJECT_ID)).resolves.toEqual([]);
  });

  it('posts a comment and archives an issue', async () => {
    const project = { id: PROJECT_ID, name: 'Core', identifier: 'MH' };
    const issue = {
      id: ISSUE_ID,
      name: 'Fix login',
      sequence_id: 42,
      project: PROJECT_ID,
      project_identifier: 'MH',
      state: 'state-1',
      state_detail: { id: 'state-1', name: 'Todo' },
      priority: 'high',
      assignees: [],
      description_html: '',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    };
    const { client, requests } = createFakeHttp([
      jsonResponse(200, {}),
      jsonResponse(200, { id: 'c1', comment_html: '<p>Hi</p>', created_at: '2026-03-01T00:00:00Z', actor_detail: { display_name: 'Ada' } }),
      jsonResponse(200, { results: [{ id: 'c1', comment_html: '<p>Hi</p>', created_at: '2026-03-01T00:00:00Z', actor_detail: { display_name: 'Ada' } }] }),
      jsonResponse(200, issue),
      jsonResponse(200, [project]),
    ]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    const comments = await plane.createComment({ workspaceSlug: SLUG, projectId: PROJECT_ID, issueId: ISSUE_ID, html: '<p>Hi</p>' });
    expect(comments[0]?.html).toBe('<p>Hi</p>');
    expect(JSON.parse(requests[1]?.body ?? '{}')).toEqual({ comment_html: '<p>Hi</p>' });
    const archived = await plane.archiveIssue({ workspaceSlug: SLUG, projectId: PROJECT_ID, issueId: ISSUE_ID });
    expect(archived.id).toBe(ISSUE_ID);
    const archiveBody: unknown = JSON.parse(requests[3]?.body ?? '{}');
    expect(typeof archiveBody === 'object' && archiveBody !== null && !Array.isArray(archiveBody) && typeof (archiveBody as Record<string, unknown>)['archived_at'] === 'string').toBe(true);
  });

  it('uses users/me/workspaces when the workspace collection 404s', async () => {
    const { client } = createFakeHttp([jsonResponse(404, { error: 'Page not found.' }), jsonResponse(200, [{ id: 'w1', name: 'MasteryHub', slug: SLUG }])]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    const workspaces = await plane.listWorkspaces();
    expect(workspaces).toEqual([{ id: 'w1', name: 'MasteryHub', slug: SLUG }]);
  });

  it('loads the configured workspace when Plane has no workspace list API', async () => {
    const { client } = createFakeHttp([
      jsonResponse(404, { error: 'Page not found.' }),
      jsonResponse(404, { error: 'Page not found.' }),
      jsonResponse(200, { id: 'w1', name: 'MasteryHub', slug: SLUG }),
    ]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test', fallbackWorkspaceSlug: SLUG });
    const workspaces = await plane.listWorkspaces();
    expect(workspaces).toEqual([{ id: 'w1', name: 'MasteryHub', slug: SLUG }]);
  });

  it('uses last visited workspace from users/me/settings when lists 404', async () => {
    const { client } = createFakeHttp([
      jsonResponse(404, { error: 'Page not found.' }),
      jsonResponse(404, { error: 'Page not found.' }),
      jsonResponse(200, {
        id: 'u1',
        email: 'dev@example.com',
        workspace: {
          last_workspace_id: 'w1',
          last_workspace_slug: SLUG,
          last_workspace_name: 'Acme',
          fallback_workspace_slug: '',
        },
      }),
    ]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    const workspaces = await plane.listWorkspaces();
    expect(workspaces).toEqual([{ id: 'w1', name: 'Acme', slug: SLUG }]);
  });

  it('uses fallback workspace slug from users/me/settings when last visited is empty', async () => {
    const { client } = createFakeHttp([
      jsonResponse(404, { error: 'Page not found.' }),
      jsonResponse(404, { error: 'Page not found.' }),
      jsonResponse(200, {
        id: 'u1',
        email: 'dev@example.com',
        workspace: {
          last_workspace_id: null,
          last_workspace_slug: null,
          fallback_workspace_id: 'w2',
          fallback_workspace_slug: SLUG,
        },
      }),
    ]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    const workspaces = await plane.listWorkspaces();
    expect(workspaces).toEqual([{ id: 'w2', name: SLUG, slug: SLUG }]);
  });

  it('tells the user to set a workspace slug when none is configured', async () => {
    const { client } = createFakeHttp([jsonResponse(404, { error: 'Page not found.' }), jsonResponse(404, { error: 'Page not found.' }), jsonResponse(404, { error: 'Page not found.' })]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    await expect(plane.listWorkspaces()).rejects.toThrow('Set plane.defaultWorkspaceSlug');
  });

  it('uses the workspace slug itself when retrieve also 404s', async () => {
    const { client } = createFakeHttp([jsonResponse(404, { error: 'Page not found.' }), jsonResponse(404, { error: 'Page not found.' }), jsonResponse(404, { error: 'Page not found.' })]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test', fallbackWorkspaceSlug: SLUG });
    const workspaces = await plane.listWorkspaces();
    expect(workspaces).toEqual([{ id: SLUG, name: SLUG, slug: SLUG }]);
  });

  it('uses the workspace slug itself when retrieve requires session auth', async () => {
    const { client } = createFakeHttp([
      jsonResponse(404, { error: 'Page not found.' }),
      jsonResponse(404, { error: 'Page not found.' }),
      jsonResponse(401, { detail: 'Authentication credentials were not provided.' }),
    ]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test', fallbackWorkspaceSlug: SLUG });
    const workspaces = await plane.listWorkspaces();
    expect(workspaces).toEqual([{ id: SLUG, name: SLUG, slug: SLUG }]);
  });

  it('parses workspace search hits', async () => {
    const { client } = createFakeHttp([
      jsonResponse(200, {
        issue: [{ id: ISSUE_ID, name: 'Login bug', sequence_id: 3, project_id: PROJECT_ID, project__identifier: 'MH', workspace__slug: SLUG }],
      }),
    ]);
    const plane = new PlaneClient({ serverUrl: SERVER, http: client, token: 'plane_api_test' });
    const hits = await plane.searchWorkspace(SLUG, 'login');
    expect(hits[0]?.title).toBe('Login bug');
    expect(hits[0]?.highlight).toBe('MH-3');
  });
});

describe('credentialHeaders', () => {
  it('returns X-API-Key when token is set', () => {
    expect(credentialHeaders('plane_api_abc')).toEqual({ 'X-API-Key': 'plane_api_abc' });
  });

  it('returns empty object without token', () => {
    expect(credentialHeaders(undefined)).toEqual({});
  });
});
