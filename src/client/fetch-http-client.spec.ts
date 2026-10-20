import { HttpMethod } from '../utils/enums/http-method.enum';
import { createFetchHttpClient, fetchHttpClient } from './fetch-http-client';
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

  it('retries a timed-out GET once', async () => {
    const originalFetch = global.fetch;
    class FakeTimeoutError extends Error {
      public override readonly name = 'TimeoutError';
    }
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new FakeTimeoutError('timeout'))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    global.fetch = fetchMock as typeof fetch;
    const request: HttpRequest = {
      url: 'https://plane.example/api/v1/users/me/',
      method: HttpMethod.GET,
      headers: { Accept: 'application/json' },
    };
    const response = await fetchHttpClient(request);
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    global.fetch = originalFetch;
  });

  it('does not retry a timed-out write', async () => {
    const originalFetch = global.fetch;
    class FakeTimeoutError extends Error {
      public override readonly name = 'TimeoutError';
    }
    const fetchMock = jest.fn(() => Promise.reject(new FakeTimeoutError('timeout')));
    global.fetch = fetchMock as typeof fetch;
    const request: HttpRequest = {
      url: 'https://plane.example/api/v1/issues/',
      method: HttpMethod.POST,
      headers: { Accept: 'application/json' },
      body: '{}',
    };
    const response = await fetchHttpClient(request);
    expect(response.status).toBe(408);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    global.fetch = originalFetch;
  });

  it('turns a bare "fetch failed" into a message that names the host and the cause', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('x'), { code: 'UND_ERR_CONNECT_TIMEOUT' }) }));
    try {
      await expect(fetchHttpClient({ url: 'https://plane.example/path?secret=1', method: HttpMethod.GET, headers: {} })).rejects.toThrow(/Cannot reach plane.example: the connection timed out/u);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('network retries', () => {
  const originalFetch = globalThis.fetch;
  const noWait = (): Promise<void> => Promise.resolve();

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function failure(code: string): TypeError {
    return Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('x'), { code }) });
  }

  interface ScriptedFetch {
    readonly calls: () => number;
  }

  function scripted(steps: readonly (Error | Response)[]): ScriptedFetch {
    let calls = 0;
    globalThis.fetch = (() => {
      const step = steps[Math.min(calls, steps.length - 1)];
      calls += 1;
      return step instanceof Error ? Promise.reject(step) : Promise.resolve(step);
    }) as typeof fetch;
    return { calls: () => calls };
  }

  const ok = (): Response => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  const get = { url: 'https://server.example/x', method: HttpMethod.GET, headers: {} } as const;
  const post = { url: 'https://server.example/x', method: HttpMethod.POST, headers: {}, body: '{}' } as const;

  it('retries a connection that timed out and then succeeds', async () => {
    const script = scripted([failure('UND_ERR_CONNECT_TIMEOUT'), failure('UND_ERR_CONNECT_TIMEOUT'), ok()]);
    const response = await createFetchHttpClient({ sleep: noWait })(get);
    expect(response.status).toBe(200);
    expect(script.calls()).toBe(3);
  });

  it('retries a write too when the connection never opened, because nothing reached the server', async () => {
    const script = scripted([failure('UND_ERR_CONNECT_TIMEOUT'), ok()]);
    const response = await createFetchHttpClient({ sleep: noWait })(post);
    expect(response.status).toBe(200);
    expect(script.calls()).toBe(2);
  });

  it('retries a reset connection for a read', async () => {
    const script = scripted([failure('ECONNRESET'), ok()]);
    expect((await createFetchHttpClient({ sleep: noWait })(get)).status).toBe(200);
    expect(script.calls()).toBe(2);
  });

  it('does not retry a reset connection for a write, which may already have been applied', async () => {
    const script = scripted([failure('ECONNRESET'), ok()]);
    await expect(createFetchHttpClient({ sleep: noWait })(post)).rejects.toThrow(/Cannot reach/u);
    expect(script.calls()).toBe(1);
  });

  it('gives up after three attempts and says why', async () => {
    const script = scripted([failure('UND_ERR_CONNECT_TIMEOUT')]);
    await expect(createFetchHttpClient({ sleep: noWait })(get)).rejects.toThrow(/Cannot reach server\.example: the connection timed out/u);
    expect(script.calls()).toBe(3);
  });

  it('does not retry a certificate problem', async () => {
    const script = scripted([failure('CERT_HAS_EXPIRED'), ok()]);
    await expect(createFetchHttpClient({ sleep: noWait })(get)).rejects.toThrow(/Cannot reach/u);
    expect(script.calls()).toBe(1);
  });

  it('waits a little longer before each new attempt', async () => {
    scripted([failure('UND_ERR_CONNECT_TIMEOUT'), failure('UND_ERR_CONNECT_TIMEOUT'), ok()]);
    const waits: number[] = [];
    await createFetchHttpClient({ sleep: (ms) => (waits.push(ms), Promise.resolve()) })(get);
    expect(waits).toHaveLength(2);
    expect(waits[1]).toBeGreaterThan(waits[0] ?? 0);
  });
});
