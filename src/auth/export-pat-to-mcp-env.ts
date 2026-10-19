import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { AuthService } from '../auth/auth-service';
import { upsertPlaneKeysInMcpEnv } from '../auth/mcp-env';
import { PlaneError, PlaneErrorCode } from '../errors/plane-error';
import { isValidWorkspaceSlug } from '../config/settings';
import type { PlaneSettings, SettingsReader } from '../config/settings.types';

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

export function defaultMcpEnvPath(home: string = os.homedir()): string {
  return path.join(home, '.config', 'masteryhub', 'mcp.env');
}

/** Empty means the default path; a leading `~` expands to the home directory; anything else must be absolute. */
export function resolveMcpEnvPath(raw: string | undefined, home: string = os.homedir()): string {
  const trimmed = raw?.trim() ?? '';
  if (trimmed.length === 0) {
    return defaultMcpEnvPath(home);
  }
  if (trimmed === '~' || trimmed.startsWith('~/')) {
    return path.join(home, trimmed.slice(1));
  }
  if (!path.isAbsolute(trimmed)) {
    throw new PlaneError('plane.mcpEnvPath must be an absolute path (a leading ~ is allowed)', PlaneErrorCode.INVALID_CONFIG);
  }
  return trimmed;
}

export type McpEnvWritePreview = {
  readonly envPath: string;
  readonly lines: readonly string[];
};

function requireWorkspaceSlug(settings: PlaneSettings): string {
  const slug = settings.defaultWorkspaceSlug?.trim();
  if (slug === undefined || slug.length === 0) {
    throw new PlaneError('Set plane.defaultWorkspaceSlug in your editor settings before exporting (e.g. your workspace slug).', PlaneErrorCode.UNEXPECTED_RESPONSE);
  }
  if (!isValidWorkspaceSlug(slug)) {
    throw new PlaneError('The workspace slug may only contain letters, digits, hyphens and underscores.', PlaneErrorCode.INVALID_CONFIG);
  }
  return slug;
}

/** Exactly what the export will write, for the confirmation dialog. The token itself is never shown. */
export function mcpEnvWritePreview(settings: PlaneSettings, home: string = os.homedir()): McpEnvWritePreview {
  const slug = requireWorkspaceSlug(settings);
  return {
    envPath: resolveMcpEnvPath(settings.mcpEnvPath, home),
    lines: ['PLANE_API_KEY=<your token>', `PLANE_BASE_URL=${settings.serverUrl.replace(/\/$/u, '')}`, `PLANE_WORKSPACE_SLUG=${slug}`],
  };
}

export async function exportPatToMcpEnv(input: ExportPatToMcpEnvInput): Promise<ExportPatToMcpEnvResult> {
  const token = await input.auth.readToken();
  if (token === undefined) {
    throw new PlaneError('Sign in to Plane first', PlaneErrorCode.NOT_SIGNED_IN);
  }

  const settings = input.settings.read();
  const workspaceSlug = requireWorkspaceSlug(settings);
  const envPath = input.envPath ?? resolveMcpEnvPath(settings.mcpEnvPath);
  const user = await input.auth.createClient(token).currentUser();

  await fs.mkdir(path.dirname(envPath), { recursive: true });
  let existing = '';
  try {
    existing = await fs.readFile(envPath, 'utf8');
  } catch (error: unknown) {
    const isEnoent = typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT';
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
  await fs.chmod(envPath, 0o600);

  return {
    envPath,
    email: user.email,
    displayName: user.displayName,
    serverUrl: settings.serverUrl,
  };
}
