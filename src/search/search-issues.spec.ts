import { PlaneClient } from '../client/plane-client';
import type { HttpClient, HttpResponse } from '../client/http.types';
import { searchIssues } from './search-issues';

function jsonResponse(status: number, body: unknown): HttpResponse {
  return { status, headers: new Map(), setCookie: [], body: JSON.stringify(body) };
}

describe('searchIssues', () => {
  it('returns hits matching keyword', async () => {
    const responses: HttpResponse[] = [
      jsonResponse(404, {}),
      jsonResponse(200, [{ id: 'p1', name: 'Core', identifier: 'MH' }]),
      jsonResponse(200, [{ id: 'p1', name: 'Core', identifier: 'MH' }]),
      jsonResponse(404, {}),
      jsonResponse(200, {
        results: [
          {
            id: 'i1',
            name: 'Login bug',
            sequence_id: 3,
            project: 'p1',
            project_identifier: 'MH',
            state: 's1',
            state_detail: { name: 'Todo' },
            assignees: [],
            description_html: 'broken auth',
          },
        ],
      }),
    ];
    const queue = [...responses];
    const http: HttpClient = () => {
      const next = queue.shift();
      if (next === undefined) {
        throw new Error('missing response');
      }
      return Promise.resolve(next);
    };
    const client = new PlaneClient({ serverUrl: 'https://plane.test', http, token: 'plane_api_test' });
    const hits = await searchIssues({
      client,
      workspaces: [{ id: 'w1', name: 'MH', slug: 'masteryhub-its' }],
      keyword: 'login',
      defaultProjectId: undefined,
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.title).toBe('Login bug');
  });
});
