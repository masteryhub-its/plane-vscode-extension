import { ISSUES_PAGE_SIZE, MAX_ISSUE_PAGES } from '../constants';
import { PlaneClient } from './plane-client';
import type { HttpClient, HttpRequest, HttpResponse } from './http.types';

const SERVER = 'https://plane.test';
const SLUG = 'acme';
const PROJECT_ID = 'proj-1';
const ISSUE_ID = 'issue-1';
const PROJECTS_URL = `${SERVER}/api/v1/workspaces/${SLUG}/projects/`;
const PROBE_URL = `${SERVER}/api/v1/workspaces/${SLUG}/projects/${PROJECT_ID}/issues/?per_page=1`;

function json(status: number, body: unknown): HttpResponse {
  return { status, headers: new Map([['content-type', 'application/json']]), setCookie: [], body: JSON.stringify(body) };
}

const ISSUE = {
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

interface Routed {
  readonly http: HttpClient;
  readonly requests: HttpRequest[];
  count(url: string): number;
}

function routed(handler: (request: HttpRequest) => HttpResponse): Routed {
  const requests: HttpRequest[] = [];
  const http: HttpClient = (request) => {
    requests.push(request);
    return Promise.resolve(handler(request));
  };
  return { http, requests, count: (url) => requests.filter((request) => request.url === url).length };
}

function plane(http: HttpClient, extra: { onWarning?: (message: string) => void } = {}): PlaneClient {
  return new PlaneClient({ serverUrl: SERVER, http, token: 'plane_api_test', ...extra });
}

describe('PlaneClient error mapping', () => {
  it('points at the workspace slug and server URL when a resource is not found', async () => {
    const { http } = routed(() => json(404, {}));
    await expect(plane(http).listProjects('wrong-slug')).rejects.toThrow(/workspace slug/u);
  });

  it('reports a 403 as a permission problem, not a bad token', async () => {
    const { http } = routed(() => json(403, { detail: 'You do not have permission.' }));
    await expect(plane(http).listProjects(SLUG)).rejects.toThrow('permission denied');
  });

  it('explains a redirect instead of a bare failure', async () => {
    const { http } = routed(() => ({ status: 301, headers: new Map([['location', 'https://plane.test/']]), setCookie: [], body: '' }));
    await expect(plane(http).listProjects(SLUG)).rejects.toThrow(/redirected.*plane\.serverUrl/u);
  });

  it('says a timed-out write may have been applied', async () => {
    const { http } = routed(() => ({ status: 408, headers: new Map(), setCookie: [], body: '' }));
    await expect(plane(http).deleteIssue({ workspaceSlug: SLUG, projectId: PROJECT_ID, issueId: ISSUE_ID })).rejects.toThrow('may have been applied');
  });
});

describe('PlaneClient listIssues truncation', () => {
  it('warns when the page limit cuts the list short', async () => {
    const warnings: string[] = [];
    const { http } = routed((request) => {
      if (request.url === PROJECTS_URL) {
        return json(200, [{ id: PROJECT_ID, name: 'Core', identifier: 'MH' }]);
      }
      if (request.url === PROBE_URL) {
        return json(200, { results: [] });
      }
      return json(200, { results: [ISSUE], next_cursor: 'more' });
    });
    const issues = await plane(http, { onWarning: (message) => warnings.push(message) }).listIssues(SLUG, PROJECT_ID);
    expect(issues).toHaveLength(MAX_ISSUE_PAGES);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(String(MAX_ISSUE_PAGES * ISSUES_PAGE_SIZE));
  });

  it('does not warn when the list ends on its own', async () => {
    const warnings: string[] = [];
    const { http } = routed((request) => {
      if (request.url === PROJECTS_URL) {
        return json(200, [{ id: PROJECT_ID, name: 'Core', identifier: 'MH' }]);
      }
      if (request.url === PROBE_URL) {
        return json(200, { results: [] });
      }
      return json(200, { results: [ISSUE] });
    });
    await plane(http, { onWarning: (message) => warnings.push(message) }).listIssues(SLUG, PROJECT_ID);
    expect(warnings).toEqual([]);
  });
});

describe('PlaneClient request sharing', () => {
  it('loads the project list once for repeated lookups', async () => {
    const r = routed((request) => {
      if (request.url === PROJECTS_URL) {
        return json(200, [{ id: PROJECT_ID, name: 'Core', identifier: 'MH' }]);
      }
      if (request.url === PROBE_URL) {
        return json(200, { results: [] });
      }
      return json(200, ISSUE);
    });
    const client = plane(r.http);
    await client.getIssue(SLUG, PROJECT_ID, ISSUE_ID);
    await client.getIssue(SLUG, PROJECT_ID, ISSUE_ID);
    expect(r.count(PROJECTS_URL)).toBe(1);
  });

  it('shares one probe between concurrent callers', async () => {
    const r = routed((request) => (request.url === PROBE_URL ? json(200, { results: [] }) : json(200, { results: [] })));
    const client = plane(r.http);
    await Promise.all([client.listComments(SLUG, PROJECT_ID, 'a'), client.listComments(SLUG, PROJECT_ID, 'b')]);
    expect(r.count(PROBE_URL)).toBe(1);
  });

  it('does not remember a probe that failed for a transient reason', async () => {
    const r = routed((request) => (request.url === PROBE_URL ? json(500, {}) : json(200, { results: [] })));
    const client = plane(r.http);
    await client.listComments(SLUG, PROJECT_ID, 'a');
    await client.listComments(SLUG, PROJECT_ID, 'b');
    expect(r.count(PROBE_URL)).toBe(2);
  });

  it('remembers a successful probe', async () => {
    const r = routed((request) => (request.url === PROBE_URL ? json(200, { results: [] }) : json(200, { results: [] })));
    const client = plane(r.http);
    await client.listComments(SLUG, PROJECT_ID, 'a');
    await client.listComments(SLUG, PROJECT_ID, 'b');
    expect(r.count(PROBE_URL)).toBe(1);
  });
});

describe('PlaneClient writes', () => {
  it('still returns the saved issue when the project lookup afterwards fails', async () => {
    const r = routed((request) => {
      if (request.url === PROJECTS_URL) {
        return json(500, {});
      }
      if (request.url === PROBE_URL) {
        return json(200, { results: [] });
      }
      return json(200, ISSUE);
    });
    const issue = await plane(r.http).updateIssueState({ workspaceSlug: SLUG, projectId: PROJECT_ID, issueId: ISSUE_ID, stateId: 'state-2' });
    expect(issue.id).toBe(ISSUE_ID);
  });
});
