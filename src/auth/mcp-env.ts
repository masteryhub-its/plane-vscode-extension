export type PlaneMcpEnvKeys = {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly workspaceSlug: string;
};

function setOrAppendEnvLine(text: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(text)) {
    return text.replace(re, line);
  }
  const trimmed = text.replace(/\s+$/u, '');
  return `${trimmed}${trimmed.length > 0 ? '\n' : ''}${line}\n`;
}

/** Rewrite Plane keys in an mcp.env body. Never wraps values in quotes. */
export function upsertPlaneKeysInMcpEnv(existing: string, keys: PlaneMcpEnvKeys): string {
  let text = existing;
  text = setOrAppendEnvLine(text, 'PLANE_API_KEY', keys.apiKey.trim());
  text = setOrAppendEnvLine(text, 'PLANE_BASE_URL', keys.baseUrl.trim().replace(/\/$/u, ''));
  text = setOrAppendEnvLine(text, 'PLANE_WORKSPACE_SLUG', keys.workspaceSlug.trim());
  return text.endsWith('\n') ? text : `${text}\n`;
}
