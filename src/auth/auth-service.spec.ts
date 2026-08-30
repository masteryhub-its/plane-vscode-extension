import { HttpMethod } from '../utils/enums/http-method.enum';
import { AuthService } from './auth-service';
import type { HttpClient, HttpRequest, HttpResponse } from '../client/http.types';
import type { PlaneSettings, SecretStore } from '../config/settings.types';

function jsonResponse(status: number, body: unknown): HttpResponse {
  return { status, headers: new Map(), setCookie: [], body: JSON.stringify(body) };
}

class MemorySecretStore implements SecretStore {
  private readonly data = new Map<string, string>();

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

class FixedSettings {
  public constructor(private readonly settings: PlaneSettings) {}

  public read(): PlaneSettings {
    return this.settings;
  }

  public writeServerUrl(): Promise<void> {
    return Promise.resolve();
  }
}

describe('AuthService', () => {
  it('signs in with PAT and validates against users/me', async () => {
    const requests: HttpRequest[] = [];
    const http: HttpClient = (request) => {
      requests.push(request);
      return Promise.resolve(jsonResponse(200, { id: 'u1', email: 'dev@example.com', display_name: 'Dev' }));
    };
    const secrets = new MemorySecretStore();
    const auth = new AuthService({
      secrets,
      settings: new FixedSettings({ serverUrl: 'https://plane.test', defaultWorkspaceSlug: undefined, defaultProjectId: undefined, showAssignedBadge: false }),
      http,
    });
    const user = await auth.signInWithPat({ token: 'plane_api_live' });
    expect(user.email).toBe('dev@example.com');
    expect(requests[0]?.method).toBe(HttpMethod.GET);
    expect(await auth.readToken()).toBe('plane_api_live');
  });

  it('clears credential when server URL changes', async () => {
    const http: HttpClient = () => Promise.resolve(jsonResponse(200, { id: 'u1', email: 'dev@example.com' }));
    const secrets = new MemorySecretStore();
    let serverUrl = 'https://plane.test';
    const settings: PlaneSettings = { serverUrl, defaultWorkspaceSlug: undefined, defaultProjectId: undefined, showAssignedBadge: false };
    const reader = {
      read: () => ({ ...settings, serverUrl }),
      writeServerUrl: (): Promise<void> => Promise.resolve(),
    };
    const auth = new AuthService({ secrets, settings: reader, http });
    await auth.signInWithPat({ token: 'plane_api_live' });
    serverUrl = 'https://other.test';
    expect(await auth.readToken()).toBeUndefined();
  });

  it('uses the configured workspace slug when Plane has no workspace list', async () => {
    const queue = [jsonResponse(404, { error: 'Page not found.' }), jsonResponse(404, { error: 'Page not found.' }), jsonResponse(200, { id: 'w1', name: 'Acme', slug: 'acme' })];
    const http: HttpClient = () => {
      const next = queue.shift();
      if (next === undefined) {
        throw new Error('missing response');
      }
      return Promise.resolve(next);
    };
    const auth = new AuthService({
      secrets: new MemorySecretStore(),
      settings: new FixedSettings({ serverUrl: 'https://plane.test', defaultWorkspaceSlug: 'acme', defaultProjectId: undefined, showAssignedBadge: false }),
      http,
    });
    const workspaces = await auth.createClient('plane_api_test').listWorkspaces();
    expect(workspaces).toEqual([{ id: 'w1', name: 'Acme', slug: 'acme' }]);
  });

  it('does not invent a workspace slug when settings omit one', async () => {
    const queue = [jsonResponse(404, { error: 'Page not found.' }), jsonResponse(404, { error: 'Page not found.' }), jsonResponse(404, { error: 'Page not found.' })];
    const http: HttpClient = () => {
      const next = queue.shift();
      if (next === undefined) {
        throw new Error('missing response');
      }
      return Promise.resolve(next);
    };
    const auth = new AuthService({
      secrets: new MemorySecretStore(),
      settings: new FixedSettings({ serverUrl: 'https://plane.test', defaultWorkspaceSlug: undefined, defaultProjectId: undefined, showAssignedBadge: false }),
      http,
    });
    await expect(auth.createClient('plane_api_test').listWorkspaces()).rejects.toThrow('Set plane.defaultWorkspaceSlug');
  });
});
