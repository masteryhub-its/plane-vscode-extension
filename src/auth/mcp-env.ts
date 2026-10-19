import { PlaneError, PlaneErrorCode } from '../errors/plane-error';

export type PlaneMcpEnvKeys = {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly workspaceSlug: string;
};

function setOrAppendEnvLine(text: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(text)) {
    return text.replace(re, () => line);
  }
  const trimmed = text.replace(/\s+$/u, '');
  return `${trimmed}${trimmed.length > 0 ? '\n' : ''}${line}\n`;
}

function assertSingleLine(name: string, value: string): string {
  if (/[\r\n]/u.test(value)) {
    throw new PlaneError(`${name} must be a single line`, PlaneErrorCode.INVALID_CONFIG);
  }
  return value;
}

/** Rewrite Plane keys in an mcp.env body. Never wraps values in quotes. */
export function upsertPlaneKeysInMcpEnv(existing: string, keys: PlaneMcpEnvKeys): string {
  const apiKey = assertSingleLine('PLANE_API_KEY', keys.apiKey.trim());
  const baseUrl = assertSingleLine('PLANE_BASE_URL', keys.baseUrl.trim().replace(/\/$/u, ''));
  const workspaceSlug = assertSingleLine('PLANE_WORKSPACE_SLUG', keys.workspaceSlug.trim());
  let text = existing;
  text = setOrAppendEnvLine(text, 'PLANE_API_KEY', apiKey);
  text = setOrAppendEnvLine(text, 'PLANE_BASE_URL', baseUrl);
  text = setOrAppendEnvLine(text, 'PLANE_WORKSPACE_SLUG', workspaceSlug);
  return text.endsWith('\n') ? text : `${text}\n`;
}
