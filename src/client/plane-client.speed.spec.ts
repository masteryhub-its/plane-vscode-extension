import { PlaneClient } from './plane-client';
import type { HttpClient, HttpRequest, HttpResponse } from './http.types';

const SERVER = 'https://plane.test';
const STEP_MS = 25;
const W = 'acme';
const P = 'proj-1';

const ISSUE = {
  id: 'i1',
  name: 'Fix',
  sequence_id: 1,
  project: P,
  project_identifier: 'MH',
  state: 's1',
  state_detail: { id: 's1', name: 'Todo', group: 'unstarted' },
  priority: 'low',
  assignees: [],
  created_at: '',
  updated_at: '',
};

function json(body: unknown): HttpResponse {
  return { status: 200, headers: new Map(), setCookie: [], body: JSON.stringify(body) };
}

interface Timed {
  readonly http: HttpClient;
  readonly maxInFlight: () => number;
  readonly requests: HttpRequest[];
}

/** Answers each request after a short pause and records how many were waiting at the same moment. */
function timedHttp(): Timed {
  let inFlight = 0;
  let max = 0;
  const requests: HttpRequest[] = [];
  const http: HttpClient = async (request) => {
    requests.push(request);
    inFlight += 1;
    max = Math.max(max, inFlight);
    await new Promise((resolve) => setTimeout(resolve, STEP_MS));
    inFlight -= 1;
    const path = request.url.replace(`${SERVER}/api/v1`, '').replace(/\?.*$/u, '');
    if (path === `/workspaces/${W}/projects/`) {
      return json([{ id: P, name: 'Core', identifier: 'MH' }]);
    }
    if (path.endsWith('/issues/') && request.url.endsWith('per_page=1')) {
      return json({ results: [] });
    }
    if (path.endsWith('/issues/')) {
      return json({ results: [ISSUE] });
    }
    return json(ISSUE);
  };
  return { http, maxInFlight: () => max, requests };
}

describe('PlaneClient speed', () => {
  it('looks up the project and probes the issues endpoint at the same time when listing issues', async () => {
    const timed = timedHttp();
    const issues = await new PlaneClient({ serverUrl: SERVER, http: timed.http, token: 't' }).listIssues(W, P);
    expect(issues).toHaveLength(1);
    expect(timed.maxInFlight()).toBe(2);
  });

  it('does the same when opening one issue', async () => {
    const timed = timedHttp();
    await new PlaneClient({ serverUrl: SERVER, http: timed.http, token: 't' }).getIssue(W, P, 'i1');
    expect(timed.maxInFlight()).toBe(2);
  });

  it('finishes in about two round trips, not three', async () => {
    const timed = timedHttp();
    const started = Date.now();
    await new PlaneClient({ serverUrl: SERVER, http: timed.http, token: 't' }).listIssues(W, P);
    expect(Date.now() - started).toBeLessThan(STEP_MS * 3);
  });

  it('shares the project lookup and the probe between concurrent calls', async () => {
    const timed = timedHttp();
    const client = new PlaneClient({ serverUrl: SERVER, http: timed.http, token: 't' });
    await Promise.all([client.listIssues(W, P), client.getIssue(W, P, 'i1')]);
    const projectLookups = timed.requests.filter((request) => request.url.endsWith(`/workspaces/${W}/projects/`));
    const probes = timed.requests.filter((request) => request.url.endsWith('per_page=1'));
    expect(projectLookups).toHaveLength(1);
    expect(probes).toHaveLength(1);
  });
});
