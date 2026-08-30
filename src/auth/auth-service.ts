import { PlaneClient } from '../client/plane-client';
import type { BoundPlaneCredential, PlaneUser, SignInWithPatInput } from '../client/plane.types';
import type { HttpClient } from '../client/http.types';
import type { SecretStore, SettingsReader } from '../config/settings.types';
import { PAT_SECRET_KEY } from '../constants';
import { PlaneError, PlaneErrorCode } from '../errors/plane-error';
import { deserializeBoundCredential, serializeBoundCredential } from './credential-codec';

export interface CreateAuthServiceInput {
  readonly secrets: SecretStore;
  readonly settings: SettingsReader;
  readonly http: HttpClient;
}

export class AuthService {
  public constructor(private readonly input: CreateAuthServiceInput) {}

  public async readToken(): Promise<string | undefined> {
    const raw = await this.input.secrets.get(PAT_SECRET_KEY);
    if (raw === undefined || raw.trim().length === 0) {
      return undefined;
    }

    let bound: BoundPlaneCredential;
    try {
      bound = deserializeBoundCredential(raw);
    } catch {
      await this.clearCredential();
      return undefined;
    }

    const serverUrl = this.input.settings.read().serverUrl;
    if (bound.serverUrl !== serverUrl) {
      await this.clearCredential();
      return undefined;
    }

    return bound.token;
  }

  public async writeToken(token: string): Promise<void> {
    const serverUrl = this.input.settings.read().serverUrl;
    await this.input.secrets.store(PAT_SECRET_KEY, serializeBoundCredential({ serverUrl, token }));
  }

  public async clearCredential(): Promise<void> {
    await this.input.secrets.delete(PAT_SECRET_KEY);
  }

  public createClient(token?: string): PlaneClient {
    const settings = this.input.settings.read();
    const resolvedToken = token ?? undefined;
    const fallbackWorkspaceSlug = settings.defaultWorkspaceSlug;
    return new PlaneClient({
      serverUrl: settings.serverUrl,
      http: this.input.http,
      ...(resolvedToken === undefined ? {} : { token: resolvedToken }),
      ...(fallbackWorkspaceSlug === undefined ? {} : { fallbackWorkspaceSlug }),
    });
  }

  public async requireClient(): Promise<PlaneClient> {
    const token = await this.readToken();
    if (token === undefined) {
      throw new PlaneError('Sign in to Plane first', PlaneErrorCode.NOT_SIGNED_IN);
    }
    return this.createClient(token);
  }

  public async signInWithPat(input: SignInWithPatInput): Promise<PlaneUser> {
    const token = input.token.trim();
    if (token.length === 0) {
      throw new PlaneError('Personal access token is required', PlaneErrorCode.AUTHENTICATION_FAILED);
    }
    const user = await this.createClient(token).currentUser();
    await this.writeToken(token);
    return user;
  }

  public async currentUser(): Promise<PlaneUser | undefined> {
    const token = await this.readToken();
    if (token === undefined) {
      return undefined;
    }
    return this.createClient(token).currentUser();
  }
}
