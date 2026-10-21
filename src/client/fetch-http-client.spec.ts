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

  it('gives up after six attempts at a read and says why', async () => {
    const script = scripted([failure('UND_ERR_CONNECT_TIMEOUT')]);
    await expect(createFetchHttpClient({ sleep: noWait })(get)).rejects.toThrow(/Cannot reach server\.example: the connection timed out/u);
    expect(script.calls()).toBe(6);
  });

  it('does not retry a certificate problem', async () => {
    const script = scripted([failure('CERT_HAS_EXPIRED'), ok()]);
    await expect(createFetchHttpClient({ sleep: noWait })(get)).rejects.toThrow(/Cannot reach/u);
    expect(script.calls()).toBe(1);
  });

  it('waits a little longer before each new attempt', async () => {
    scripted([failure('UND_ERR_CONNECT_TIMEOUT'), failure('UND_ERR_CONNECT_TIMEOUT'), ok()]);
    const waits: number[] = [];
    await createFetchHttpClient({ sleep: (ms) => (waits.push(ms), Promise.resolve()) })(post);
    expect(waits).toHaveLength(2);
    expect(waits[1]).toBeGreaterThan(waits[0] ?? 0);
  });
});

interface FetchInitWithSignal {
  readonly signal?: AbortSignal;
}

interface AbortableInit {
  readonly signal?: AbortSignal;
}

describe('hedged reads', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /** A fetch whose first call hangs until aborted and whose later calls answer at once. */
  interface HangingFetch {
    readonly calls: () => number;
    readonly firstAborted: () => boolean;
  }

  function firstHangs(): HangingFetch {
    let calls = 0;
    let aborted = false;
    globalThis.fetch = ((_url: string, init?: FetchInitWithSignal) => {
      calls += 1;
      if (calls === 1) {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            aborted = true;
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        });
      }
      return Promise.resolve(new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }));
    }) as typeof fetch;
    return { calls: () => calls, firstAborted: () => aborted };
  }

  const get = { url: 'https://server.example/x', method: HttpMethod.GET, headers: {} } as const;
  const post = { url: 'https://server.example/x', method: HttpMethod.POST, headers: {}, body: '{}' } as const;

  it('does not wait out a hung connection: a second attempt answers while the first is still stuck', async () => {
    const script = firstHangs();
    const started = Date.now();
    const response = await createFetchHttpClient({ sleep: () => Promise.resolve(), hedgeDelayMs: 25 })(get);
    expect(response.status).toBe(200);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(script.calls()).toBe(2);
    expect(script.firstAborted()).toBe(true);
  });

  it('starts only one request when the answer comes quickly', async () => {
    let calls = 0;
    globalThis.fetch = () => {
      calls += 1;
      return Promise.resolve(new Response('{}', { status: 200 }));
    };
    await createFetchHttpClient({ sleep: () => Promise.resolve(), hedgeDelayMs: 200 })(get);
    expect(calls).toBe(1);
  });

  it('also overtakes a hung connection for a POST that only reads', async () => {
    const script = firstHangs();
    const response = await createFetchHttpClient({ sleep: () => Promise.resolve(), hedgeDelayMs: 25 })({ ...post, safeToRepeat: true });
    expect(response.status).toBe(200);
    expect(script.calls()).toBe(2);
  });

  it('never starts a second copy of a write, however slow the first is', async () => {
    let calls = 0;
    globalThis.fetch = () => {
      calls += 1;
      return new Promise<Response>((resolve) => setTimeout(() => resolve(new Response('{}', { status: 200 })), 80));
    };
    const response = await createFetchHttpClient({ sleep: () => Promise.resolve(), hedgeDelayMs: 10 })(post);
    expect(response.status).toBe(200);
    expect(calls).toBe(1);
  });

  it('still reads the body of a rate-limit answer after the other attempts are cancelled', async () => {
    globalThis.fetch = ((_url: string, init?: AbortableInit) => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const fail = (): void => controller.error(new DOMException('This operation was aborted', 'AbortError'));
          if (init?.signal?.aborted === true) {
            fail();
            return;
          }
          init?.signal?.addEventListener('abort', fail, { once: true });
          setTimeout(() => {
            try {
              controller.enqueue(new TextEncoder().encode('slow down'));
              controller.close();
            } catch {
              // already cancelled
            }
          }, 30);
        },
      });
      return Promise.resolve(new Response(stream, { status: 429, headers: { 'retry-after': '3' } }));
    }) as typeof fetch;
    const response = await createFetchHttpClient({ sleep: () => Promise.resolve(), hedgeDelayMs: 10 })(get);
    expect(response.status).toBe(429);
    expect(response.body).toBe('slow down');
  });

  it('waits out a short rate limit and asks again, up to twice', async () => {
    const waits: number[] = [];
    let calls = 0;
    globalThis.fetch = () => {
      calls += 1;
      return Promise.resolve(calls <= 2 ? new Response('slow down', { status: 429, headers: { 'retry-after': '2' } }) : new Response('{}', { status: 200 }));
    };
    const response = await createFetchHttpClient({
      sleep: (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
      hedgeDelayMs: 10,
    })(get);
    expect(response.status).toBe(200);
    expect(waits).toEqual([2000, 2000]);
    expect(calls).toBe(3);
  });

  it('gives up with the rate-limit answer after two waits', async () => {
    let calls = 0;
    globalThis.fetch = () => {
      calls += 1;
      return Promise.resolve(new Response('slow down', { status: 429, headers: { 'retry-after': '1' } }));
    };
    const response = await createFetchHttpClient({ sleep: () => Promise.resolve(), hedgeDelayMs: 10 })(get);
    expect(response.status).toBe(429);
    expect(calls).toBe(3);
  });

  it('returns a rate-limit answer as it is instead of asking again', async () => {
    let calls = 0;
    globalThis.fetch = () => {
      calls += 1;
      return Promise.resolve(new Response('slow down', { status: 429, headers: { 'retry-after': '30' } }));
    };
    const response = await createFetchHttpClient({ sleep: () => Promise.resolve(), hedgeDelayMs: 10 })(get);
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('30');
    expect(calls).toBe(1);
  });
});

describe('connections that never answer', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const get = { url: 'https://server.example/x', method: HttpMethod.GET, headers: {} } as const;

  /** A fetch that never answers, only ending when its signal is aborted. */
  interface NeverAnswering {
    readonly calls: () => number;
  }

  function neverAnswers(): NeverAnswering {
    let calls = 0;
    globalThis.fetch = ((_url: string, init?: FetchInitWithSignal) => {
      calls += 1;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      });
    }) as typeof fetch;
    return { calls: () => calls };
  }

  it('abandons attempts that get no answer and reports a connection timeout, not a bare timeout', async () => {
    const script = neverAnswers();
    const client = createFetchHttpClient({ sleep: () => Promise.resolve(), hedgeDelayMs: 5, headersTimeoutMs: 30 });
    await expect(client(get)).rejects.toThrow(/Cannot reach server\.example: the connection timed out/u);
    expect(script.calls()).toBe(6);
  });

  it('does not cut off a slow download once the response has started', async () => {
    globalThis.fetch = () => {
      const body = new ReadableStream<Uint8Array>({
        start(controller): void {
          setTimeout(() => {
            controller.enqueue(new TextEncoder().encode('{"ok":true}'));
            controller.close();
          }, 80);
        },
      });
      return Promise.resolve(new Response(body, { status: 200 }));
    };
    const response = await createFetchHttpClient({ sleep: () => Promise.resolve(), hedgeDelayMs: 500, headersTimeoutMs: 20 })(get);
    expect(response.status).toBe(200);
    expect(response.body).toBe('{"ok":true}');
  });
});
