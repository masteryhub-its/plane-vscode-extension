import { HttpMethod } from '../utils/enums/http-method.enum';
import { PlaneClient } from './plane-client';
import type { HttpClient, HttpRequest, HttpResponse } from './http.types';

const SERVER = 'https://plane.test';
const W = 'acme';
const P = 'proj-1';
const I = 'issue-1';

function json(status: number, body: unknown): HttpResponse {
  return { status, headers: new Map(), setCookie: [], body: JSON.stringify(body) };
}

const ISSUE = {
  id: I,
  name: 'Fix',
  sequence_id: 1,
  project: P,
  project_identifier: 'MH',
  state: 's1',
  state_detail: { id: 's1', name: 'Todo' },
  priority: 'low',
  assignees: [],
  created_at: '',
  updated_at: '',
};
const PROJECT = { id: P, name: 'Core', identifier: 'MH' };

interface TestClient {
  readonly plane: PlaneClient;
  readonly requests: HttpRequest[];
}

function client(routes: Record<string, unknown>): TestClient {
  const requests: HttpRequest[] = [];
  const http: HttpClient = (request) => {
    requests.push(request);
    const path = request.url.replace(`${SERVER}/api/v1`, '').replace(/\?.*$/u, '');
    if (path === `/workspaces/${W}/projects/`) {
      return Promise.resolve(json(200, [PROJECT]));
    }
    if (path === `/workspaces/${W}/projects/${P}/issues/`) {
      return Promise.resolve(json(200, { results: [] }));
    }
    const key = `${request.method} ${path}`;
    if (key in routes) {
      return Promise.resolve(json(200, routes[key]));
    }
    return Promise.resolve(json(404, {}));
  };
  return { plane: new PlaneClient({ serverUrl: SERVER, http, token: 't' }), requests };
}

describe('PlaneClient resources', () => {
  it('lists states, labels and members', async () => {
    const { plane } = client({
      [`GET /workspaces/${W}/projects/${P}/states/`]: [{ id: 's1', name: 'Todo', group: 'unstarted', color: '#fff' }],
      [`GET /workspaces/${W}/projects/${P}/labels/`]: [{ id: 'l1', name: 'bug', color: '#f00' }],
      [`GET /workspaces/${W}/projects/${P}/members/`]: [{ member: { id: 'u1', display_name: 'Ada', email: 'a@x.y' } }, { id: 'u2', email: 'b@x.y' }, 'junk'],
    });
    expect((await plane.listStates(W, P))[0]?.name).toBe('Todo');
    expect((await plane.listLabels(W, P))[0]?.name).toBe('bug');
    const members = await plane.listMembers(W, P);
    expect(members.map((member) => member.id)).toEqual(['u1', 'u2']);
  });

  it('lists cycles, modules and their issues', async () => {
    const { plane } = client({
      [`GET /workspaces/${W}/projects/${P}/cycles/`]: { results: [{ id: 'c1', name: 'C1', status: 'current' }] },
      [`GET /workspaces/${W}/projects/${P}/cycles/c1/cycle-issues/`]: { results: [{ issue_detail: ISSUE }, { nothing: true }] },
      [`GET /workspaces/${W}/projects/${P}/modules/`]: [{ id: 'm1', name: 'M1', status: 'backlog' }],
      [`GET /workspaces/${W}/projects/${P}/modules/m1/module-issues/`]: [ISSUE],
    });
    expect((await plane.listCycles(W, P))[0]?.id).toBe('c1');
    expect(await plane.listCycleIssues(W, P, 'c1')).toHaveLength(1);
    expect((await plane.listModules(W, P))[0]?.id).toBe('m1');
    expect(await plane.listModuleIssues(W, P, 'm1')).toHaveLength(1);
  });

  it('returns empty lists for optional resources that the server does not have', async () => {
    const { plane } = client({});
    expect(await plane.listCycles(W, P)).toEqual([]);
    expect(await plane.listModules(W, P)).toEqual([]);
    expect(await plane.listPages(W, P)).toEqual([]);
    expect(await plane.listIntake(W, P)).toEqual([]);
    expect(await plane.listTemplates(W, P)).toEqual([]);
    expect(await plane.listAttachments(W, P, I)).toEqual([]);
    expect(await plane.listRelations(W, P, I)).toEqual([]);
    expect(await plane.listWorklogs(W, P, I)).toEqual([]);
  });

  it('reads attachments, relations, pages, intake, templates and worklogs', async () => {
    const { plane } = client({
      [`GET /workspaces/${W}/projects/${P}/issues/${I}/issue-attachments/`]: [{ id: 'a1', attributes: { name: 'spec.pdf' }, asset: 'https://plane.test/f/spec.pdf' }, { name: 'no id' }],
      [`GET /workspaces/${W}/projects/${P}/issues/${I}/issue-relation/`]: [
        { id: 'r1', relation_type: 'blocked_by', issue_detail: { id: 'o', name: 'Other', project_identifier: 'MH', sequence_id: 3 } },
      ],
      [`GET /workspaces/${W}/projects/${P}/pages/`]: [{ id: 'pg1', name: 'Spec' }],
      [`GET /workspaces/${W}/projects/${P}/inbox-issues/`]: [{ id: 'in1', issue_detail: { id: 'x', name: 'Idea' } }],
      [`GET /workspaces/${W}/projects/${P}/issue-templates/`]: [{ id: 't1', name: 'Bug', description_html: '<p>x</p>' }],
      [`GET /workspaces/${W}/projects/${P}/issues/${I}/worklogs/`]: [{ id: 'w1', duration: '1h', description: 'dbg' }],
    });
    expect((await plane.listAttachments(W, P, I))[0]?.name).toBe('spec.pdf');
    expect((await plane.listRelations(W, P, I))[0]?.key).toBe('MH-3');
    expect((await plane.listPages(W, P))[0]?.name).toBe('Spec');
    expect((await plane.listIntake(W, P))[0]?.name).toBe('Idea');
    expect((await plane.listTemplates(W, P))[0]?.name).toBe('Bug');
    expect((await plane.listWorklogs(W, P, I))[0]?.duration).toBe('1h');
  });

  it('creates, updates, archives and deletes issues with the right verbs and bodies', async () => {
    const issuePath = `/workspaces/${W}/projects/${P}/issues/${I}/`;
    const { plane, requests } = client({
      [`POST /workspaces/${W}/projects/${P}/issues/`]: ISSUE,
      [`PATCH ${issuePath}`]: ISSUE,
      [`DELETE ${issuePath}`]: {},
    });
    await plane.createIssue({ workspaceSlug: W, projectId: P, name: 'N', descriptionHtml: '<p>d</p>', priority: 'low', labelIds: ['l1'] });
    await plane.updateIssueFields({ workspaceSlug: W, projectId: P, issueId: I, name: 'New', targetDate: '2026-12-01', labelIds: [] });
    await plane.updateIssueAssignee({ workspaceSlug: W, projectId: P, issueId: I, assigneeIds: ['u1'] });
    await plane.archiveIssue({ workspaceSlug: W, projectId: P, issueId: I });
    await plane.deleteIssue({ workspaceSlug: W, projectId: P, issueId: I });
    const byVerb = requests.filter((request) => !request.url.includes('?per_page=1') && !request.url.endsWith('/projects/')).map((request) => request.method);
    expect(byVerb).toEqual(['POST', 'PATCH', 'PATCH', 'PATCH', 'DELETE']);
    const patch = requests.find((request) => request.method === HttpMethod.PATCH && request.body?.includes('target_date'));
    expect(JSON.parse(patch?.body ?? '{}')).toEqual({ name: 'New', target_date: '2026-12-01', labels: [] });
    const archive = requests.filter((request) => request.method === HttpMethod.PATCH).find((request) => request.body?.includes('archived_at'));
    expect(archive).toBeDefined();
  });

  it('subscribes with POST and unsubscribes with DELETE', async () => {
    const path = `/workspaces/${W}/projects/${P}/issues/${I}/subscribe/`;
    const { plane, requests } = client({ [`POST ${path}`]: {}, [`DELETE ${path}`]: {} });
    await plane.subscribeIssue({ workspaceSlug: W, projectId: P, issueId: I, subscribed: true });
    await plane.subscribeIssue({ workspaceSlug: W, projectId: P, issueId: I, subscribed: false });
    expect(requests.filter((request) => request.url.endsWith('/subscribe/')).map((request) => request.method)).toEqual(['POST', 'DELETE']);
  });

  it('creates and edits comments, then returns the refreshed list', async () => {
    const base = `/workspaces/${W}/projects/${P}/issues/${I}/comments/`;
    const { plane, requests } = client({
      [`POST ${base}`]: {},
      [`PATCH ${base}c1/`]: {},
      [`GET ${base}`]: { results: [{ id: 'c1', comment_html: '<p>hi</p>', actor_detail: { id: 'u1', display_name: 'Ada' }, created_at: '2026-01-01' }] },
    });
    const afterCreate = await plane.createComment({ workspaceSlug: W, projectId: P, issueId: I, html: '<p>hi</p>' });
    const afterEdit = await plane.updateComment({ workspaceSlug: W, projectId: P, issueId: I, commentId: 'c1', html: '<p>hi 2</p>' });
    expect(afterCreate).toHaveLength(1);
    expect(afterEdit).toHaveLength(1);
    expect(JSON.parse(requests.find((request) => request.method === HttpMethod.POST && request.url.endsWith('/comments/'))?.body ?? '{}')).toEqual({ comment_html: '<p>hi</p>' });
  });

  it('lists sub-issues from either response shape', async () => {
    const path = `/workspaces/${W}/projects/${P}/issues/${I}/sub-issues/`;
    expect(await client({ [`GET ${path}`]: { sub_issues: [ISSUE] } }).plane.listSubIssues(W, P, I)).toHaveLength(1);
    expect(await client({ [`GET ${path}`]: { results: [ISSUE] } }).plane.listSubIssues(W, P, I)).toHaveLength(1);
    expect(await client({ [`GET ${path}`]: [ISSUE] }).plane.listSubIssues(W, P, I)).toHaveLength(1);
  });

  it('sends the search keyword as a query parameter', async () => {
    const { plane, requests } = client({ [`GET /workspaces/${W}/search/`]: { issue: [] } });
    await plane.searchWorkspace(W, 'login bug');
    expect(requests.at(-1)?.url).toContain('search=login+bug');
    expect(requests.at(-1)?.url).toContain('query_type=issue');
  });

  it('rejects a response that is not valid JSON', async () => {
    const http: HttpClient = () => Promise.resolve({ status: 200, headers: new Map(), setCookie: [], body: '<html>' });
    await expect(new PlaneClient({ serverUrl: SERVER, http, token: 't' }).currentUser()).rejects.toThrow('not valid JSON');
  });

  it('accepts an empty body for a write that returns nothing', async () => {
    const http: HttpClient = () => Promise.resolve({ status: 200, headers: new Map(), setCookie: [], body: '' });
    await expect(new PlaneClient({ serverUrl: SERVER, http, token: 't' }).deleteIssue({ workspaceSlug: W, projectId: P, issueId: I })).resolves.toBeUndefined();
  });

  it('names Cloudflare when it blocks the API', async () => {
    const http: HttpClient = () => Promise.resolve({ status: 403, headers: new Map(), setCookie: [], body: '<title>Error 1010</title>' });
    await expect(new PlaneClient({ serverUrl: SERVER, http, token: 't' }).currentUser()).rejects.toThrow('Cloudflare');
  });

  it('reports the retry delay when rate limited', async () => {
    const http: HttpClient = () => Promise.resolve({ status: 429, headers: new Map([['retry-after', '30']]), setCookie: [], body: '' });
    await expect(new PlaneClient({ serverUrl: SERVER, http, token: 't' }).currentUser()).rejects.toThrow('30 seconds');
  });
});
