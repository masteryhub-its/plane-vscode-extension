import { AuthService } from './auth-service';
import { PAT_SECRET_KEY } from '../constants';
import { PlaneErrorCode } from '../errors/plane-error';
import type { HttpClient, HttpResponse } from '../client/http.types';
import type { PlaneSettings, SecretStore } from '../config/settings.types';

const ok = (body: unknown): HttpResponse => ({ status: 200, headers: new Map(), setCookie: [], body: JSON.stringify(body) });

class Memory implements SecretStore {
  public readonly data = new Map<string, string>();
  public get(key: string): Promise<string | undefined> {
    return Promise.resolve(this.data.get(key));
  }
  public store(key: string, value: string): Promise<void> {
    this.data.set(key, value);
    return Promise.resolve();
  }
  public delete(key: string): Promise<void> {
    this.data.delete(key);
    return Promise.resolve();
  }
}

const SETTINGS: PlaneSettings = { serverUrl: 'https://plane.test', defaultWorkspaceSlug: undefined, defaultProjectId: undefined, showAssignedBadge: false, mcpEnvPath: undefined };
const http: HttpClient = () => Promise.resolve(ok({ id: 'u1', email: 'dev@example.com', display_name: 'Dev' }));

function service(secrets: Memory): AuthService {
  return new AuthService({ secrets, settings: { read: () => SETTINGS }, http });
}

describe('AuthService edge cases', () => {
  it('treats a missing or blank secret as signed out', async () => {
    const secrets = new Memory();
    expect(await service(secrets).readToken()).toBeUndefined();
    secrets.data.set(PAT_SECRET_KEY, '   ');
    expect(await service(secrets).readToken()).toBeUndefined();
  });

  it('clears a stored value that is not a valid credential', async () => {
    const secrets = new Memory();
    secrets.data.set(PAT_SECRET_KEY, 'not json');
    expect(await service(secrets).readToken()).toBeUndefined();
    expect(secrets.data.has(PAT_SECRET_KEY)).toBe(false);
  });

  it('refuses to build a client while signed out', async () => {
    await expect(service(new Memory()).requireClient()).rejects.toMatchObject({ code: PlaneErrorCode.NOT_SIGNED_IN });
  });

  it('rejects an empty token without calling the server', async () => {
    const calls: string[] = [];
    const auth = new AuthService({ secrets: new Memory(), settings: { read: () => SETTINGS }, http: (request) => (calls.push(request.url), http(request)) });
    await expect(auth.signInWithPat({ token: '   ' })).rejects.toMatchObject({ code: PlaneErrorCode.AUTHENTICATION_FAILED });
    expect(calls).toEqual([]);
  });

  it('does not store a token the server rejects', async () => {
    const secrets = new Memory();
    const auth = new AuthService({ secrets, settings: { read: () => SETTINGS }, http: () => Promise.resolve({ status: 401, headers: new Map(), setCookie: [], body: '{}' }) });
    await expect(auth.signInWithPat({ token: 'bad' })).rejects.toThrow('authentication failed');
    expect(secrets.data.size).toBe(0);
  });

  it('returns the signed-in user and builds a client when a token is stored', async () => {
    const secrets = new Memory();
    const auth = service(secrets);
    await auth.signInWithPat({ token: 'plane_api_live' });
    expect((await auth.currentUser())?.email).toBe('dev@example.com');
    await expect(auth.requireClient()).resolves.toBeDefined();
    await auth.clearCredential();
    expect(await auth.currentUser()).toBeUndefined();
  });

  it('passes the user agent and warning hook to the clients it builds', async () => {
    const seen: Record<string, string>[] = [];
    const auth = new AuthService({
      secrets: new Memory(),
      settings: { read: () => SETTINGS },
      http: (request) => (seen.push({ ...request.headers }), http(request)),
      userAgent: 'Plane-VSCode/1.2.3',
      onWarning: () => undefined,
    });
    await auth.createClient('plane_api_x').currentUser();
    expect(seen[0]?.['User-Agent']).toBe('Plane-VSCode/1.2.3');
  });
});
