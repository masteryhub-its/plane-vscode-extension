import { HttpMethod } from '../utils/enums/http-method.enum';
import { fetchHttpClient } from './fetch-http-client';
import type { HttpRequest } from './http.types';

interface FetchInitCapture {
  readonly redirect?: string;
  readonly signal?: AbortSignal;
}

describe('fetchHttpClient', () => {
  it('uses redirect manual and an abort signal', async () => {
    const originalFetch = global.fetch;
    let redirectValue: string | undefined;
    let signal: AbortSignal | undefined;
    global.fetch = jest.fn((_url: string, init?: FetchInitCapture) => {
      redirectValue = init?.redirect;
      signal = init?.signal;
      return Promise.resolve(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    }) as typeof fetch;

    const request: HttpRequest = {
      url: 'https://plane.example/api/v1/users/me/',
      method: HttpMethod.GET,
      headers: { Accept: 'application/json' },
    };
    await fetchHttpClient(request);
    expect(redirectValue).toBe('manual');
    expect(signal).toBeInstanceOf(AbortSignal);
    global.fetch = originalFetch;
  });

  it('returns 408 when fetch times out', async () => {
    const originalFetch = global.fetch;
    class FakeTimeoutError extends Error {
      public override readonly name = 'TimeoutError';
    }
    global.fetch = jest.fn(() => Promise.reject(new FakeTimeoutError('The operation was aborted due to timeout'))) as typeof fetch;
    const request: HttpRequest = {
      url: 'https://plane.example/api/v1/users/me/',
      method: HttpMethod.GET,
      headers: { Accept: 'application/json' },
    };
    const response = await fetchHttpClient(request);
    expect(response.status).toBe(408);
    global.fetch = originalFetch;
  });
});
