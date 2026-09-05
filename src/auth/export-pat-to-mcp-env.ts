import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { AuthService } from '../auth/auth-service';
import { upsertPlaneKeysInMcpEnv } from '../auth/mcp-env';
import { PlaneError, PlaneErrorCode } from '../errors/plane-error';
import type { SettingsReader } from '../config/settings.types';

export type ExportPatToMcpEnvInput = {
  readonly auth: AuthService;
  readonly settings: SettingsReader;
  readonly envPath?: string;
};

export type ExportPatToMcpEnvResult = {
  readonly envPath: string;
  readonly email: string;
  readonly displayName: string;
  readonly serverUrl: string;
};

export function defaultMcpEnvPath(): string {
  return path.join(os.homedir(), '.config', 'masteryhub', 'mcp.env');
}

export async function exportPatToMcpEnv(input: ExportPatToMcpEnvInput): Promise<ExportPatToMcpEnvResult> {
  const token = await input.auth.readToken();
  if (token === undefined) {
    throw new PlaneError('Sign in to Plane first', PlaneErrorCode.NOT_SIGNED_IN);
  }

  const settings = input.settings.read();
  const workspaceSlug = settings.defaultWorkspaceSlug?.trim();
  if (workspaceSlug === undefined || workspaceSlug.length === 0) {
    throw new PlaneError(
      'Set plane.defaultWorkspaceSlug in Cursor settings before exporting (e.g. your workspace slug).',
      PlaneErrorCode.UNEXPECTED_RESPONSE,
    );
  }
  const user = await input.auth.createClient(token).currentUser();
  const envPath = input.envPath ?? defaultMcpEnvPath();

  await fs.mkdir(path.dirname(envPath), { recursive: true });
  let existing = '';
  try {
    existing = await fs.readFile(envPath, 'utf8');
  } catch (error: unknown) {
    const isEnoent =
      typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT';
    if (!isEnoent) {
      throw error;
    }
  }

  const next = upsertPlaneKeysInMcpEnv(existing, {
    apiKey: token,
    baseUrl: settings.serverUrl,
    workspaceSlug,
  });
  await fs.writeFile(envPath, next, { mode: 0o600 });

  return {
    envPath,
    email: user.email,
    displayName: user.displayName,
    serverUrl: settings.serverUrl,
  };
}
