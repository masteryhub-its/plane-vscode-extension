import { HttpMethod } from '../utils/enums/http-method.enum';
import { fetchHttpClient } from './fetch-http-client';
import type { HttpRequest } from './http.types';

interface FetchInitCapture {
  readonly redirect?: string;
}

describe('fetchHttpClient', () => {
  it('uses redirect manual', async () => {
    const originalFetch = global.fetch;
    let redirectValue: string | undefined;
    global.fetch = jest.fn((_url: string, init?: FetchInitCapture) => {
      redirectValue = init?.redirect;
      return Promise.resolve(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    }) as typeof fetch;

    const request: HttpRequest = {
      url: 'https://plane.example/api/v1/users/me/',
      method: HttpMethod.GET,
      headers: { Accept: 'application/json' },
    };
    await fetchHttpClient(request);
    expect(redirectValue).toBe('manual');
    global.fetch = originalFetch;
  });
});
