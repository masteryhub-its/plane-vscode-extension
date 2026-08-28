import { PlaneClient } from '../client/plane-client';
import type { HttpClient, HttpRequest, HttpResponse } from '../client/http.types';
import { loadSidebarCatalog } from './load-catalog';

function jsonResponse(status: number, body: unknown): HttpResponse {
  return { status, headers: new Map(), setCookie: [], body: JSON.stringify(body) };
}

describe('loadSidebarCatalog', () => {
  it('loads workspaces, projects, and issues', async () => {
    const responses: HttpResponse[] = [
      jsonResponse(200, [{ id: 'w1', name: 'MasteryHub', slug: 'masteryhub-its' }]),
      jsonResponse(200, [{ id: 'p1', name: 'Core', identifier: 'MH' }]),
      jsonResponse(200, [{ id: 'p1', name: 'Core', identifier: 'MH' }]),
      jsonResponse(404, {}),
      jsonResponse(200, {
        results: [{ id: 'i1', name: 'Bug', sequence_id: 1, project: 'p1', project_identifier: 'MH', state: 's1', state_detail: { name: 'Todo' }, assignees: [] }],
      }),
    ];
    const queue = [...responses];
    const http: HttpClient = (_request: HttpRequest) => {
      const next = queue.shift();
      if (next === undefined) {
        throw new Error('missing response');
      }
      return Promise.resolve(next);
    };
    const client = new PlaneClient({ serverUrl: 'https://plane.test', http, token: 'plane_api_test' });
    const catalog = await loadSidebarCatalog(client);
    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.projects[0]?.issues[0]?.key).toBe('MH-1');
  });
});
