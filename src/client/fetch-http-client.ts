import { FETCH_TIMEOUT_MS } from '../constants';
import { PlaneError, PlaneErrorCode } from '../errors/plane-error';
import { HttpMethod } from '../utils/enums/http-method.enum';
import type { HttpClient, HttpRequest, HttpResponse } from './http.types';
import { classifyNetworkFailure, describeNetworkFailure } from './network-error';

function readSetCookie(headers: Headers): readonly string[] {
  if ('getSetCookie' in headers && typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const single = headers.get('set-cookie');
  return single === null ? [] : [single];
}

interface FetchRequestInit {
  method: HttpMethod;
  headers: Readonly<Record<string, string>>;
  body?: string;
  redirect: 'manual';
  signal: AbortSignal;
}

function isTimeoutError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

const TIMEOUT_RESPONSE: HttpResponse = {
  status: 408,
  headers: new Map(),
  setCookie: [],
  body: '',
};

async function fetchOnce(request: HttpRequest): Promise<HttpResponse | undefined> {
  const init: FetchRequestInit = {
    method: request.method,
    headers: request.headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  };
  if (request.body !== undefined) {
    init.body = request.body;
  }
  try {
    const response = await fetch(request.url, init);
    const headers = new Map<string, string>();
    response.headers.forEach((value, key) => {
      headers.set(key.toLowerCase(), value);
    });
    const buffer = await response.arrayBuffer();
    const bodyBytes = new Uint8Array(buffer);
    return {
      status: response.status,
      headers,
      setCookie: readSetCookie(response.headers),
      body: new TextDecoder().decode(bodyBytes),
      bodyBytes,
    };
  } catch (error: unknown) {
    if (isTimeoutError(error)) {
      return undefined;
    }
    throw error;
  }
}

function isIdempotent(method: HttpMethod): boolean {
  return method === HttpMethod.GET;
}

export interface FetchClientOptions {
  /** Pauses between attempts; replaced in tests. */
  readonly sleep?: (ms: number) => Promise<void>;
}

const MAX_NETWORK_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function mayRetry(error: unknown, method: HttpMethod): boolean {
  const kind = classifyNetworkFailure(error);
  return kind === 'before-connect' || (kind === 'ambiguous' && isIdempotent(method));
}

/** One request, repeated a couple of times when the connection itself failed (see `classifyNetworkFailure`). */
async function fetchWithNetworkRetry(request: HttpRequest, sleep: (ms: number) => Promise<void>): Promise<HttpResponse | undefined> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetchOnce(request);
    } catch (error: unknown) {
      if (attempt >= MAX_NETWORK_ATTEMPTS || !mayRetry(error, request.method)) {
        throw new PlaneError(describeNetworkFailure(error, request.url, 'plane.serverUrl'), PlaneErrorCode.HTTP_ERROR, { cause: error });
      }
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
}

export function createFetchHttpClient(options: FetchClientOptions = {}): HttpClient {
  const sleep = options.sleep ?? defaultSleep;
  return async (request: HttpRequest): Promise<HttpResponse> => {
    const first = await fetchWithNetworkRetry(request, sleep);
    if (first !== undefined) {
      return first;
    }
    if (!isIdempotent(request.method)) {
      return TIMEOUT_RESPONSE;
    }
    const retry = await fetchWithNetworkRetry(request, sleep);
    return retry ?? TIMEOUT_RESPONSE;
  };
}

export const fetchHttpClient: HttpClient = createFetchHttpClient();
