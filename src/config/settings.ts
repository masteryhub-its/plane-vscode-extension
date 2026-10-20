import { DEFAULT_SERVER_URL } from '../constants';
import { PlaneError, PlaneErrorCode } from '../errors/plane-error';
import { isAllowedUrlProtocol } from '../utils/url-protocol';
import type { PlaneSettings, RawPlaneSettings } from './settings.types';

export interface InspectedServerUrl {
  readonly globalValue: string | undefined;
  readonly defaultValue: string | undefined;
  readonly workspaceValue: string | undefined;
  readonly workspaceFolderValue: string | undefined;
}

const LOOPBACK_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return LOOPBACK_HOSTS.has(host);
}

export function preferredServerUrlRaw(inspected: InspectedServerUrl): string {
  if (typeof inspected.globalValue === 'string' && inspected.globalValue.trim().length > 0) {
    return inspected.globalValue;
  }
  if (typeof inspected.defaultValue === 'string' && inspected.defaultValue.trim().length > 0) {
    return inspected.defaultValue;
  }
  return DEFAULT_SERVER_URL;
}

export function normalizeServerUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new PlaneError('Server URL is required', PlaneErrorCode.INVALID_CONFIG);
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (cause: unknown) {
    throw new PlaneError('Server URL is invalid', PlaneErrorCode.INVALID_CONFIG, { cause });
  }

  if (!isAllowedUrlProtocol(parsed.protocol)) {
    throw new PlaneError('Server URL must use http or https', PlaneErrorCode.INVALID_CONFIG);
  }

  if (parsed.username !== '' || parsed.password !== '') {
    throw new PlaneError('Server URL must not include credentials', PlaneErrorCode.INVALID_CONFIG);
  }

  if (parsed.protocol === 'http:' && !isLoopbackHost(parsed.hostname)) {
    throw new PlaneError('Server URL must use https unless the host is localhost', PlaneErrorCode.INVALID_CONFIG);
  }

  const path = parsed.pathname.replace(/\/+$/u, '');
  const normalizedPath = path === '/' ? '' : path;
  return `${parsed.origin}${normalizedPath}`;
}

/** The text to show beside an input box when a server URL is not acceptable, or undefined when it is fine. */
export function validateServerUrlInput(raw: string): string | undefined {
  try {
    normalizeServerUrl(raw);
    return undefined;
  } catch (error: unknown) {
    return error instanceof Error ? error.message : 'Server URL is invalid';
  }
}

export function normalizeOptionalSlug(raw: string): string | undefined {
  const trimmed = raw.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

const WORKSPACE_SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/u;

export function isValidWorkspaceSlug(value: string): boolean {
  return WORKSPACE_SLUG_PATTERN.test(value);
}

/** A workspace slug ends up in URLs and in the MCP env file, so anything but a plain slug is ignored. */
export function normalizeWorkspaceSlug(raw: string): string | undefined {
  const trimmed = normalizeOptionalSlug(raw);
  return trimmed !== undefined && isValidWorkspaceSlug(trimmed) ? trimmed : undefined;
}

export function normalizeSettings(raw: RawPlaneSettings): PlaneSettings {
  return {
    serverUrl: normalizeServerUrl(raw.serverUrl.length === 0 ? DEFAULT_SERVER_URL : raw.serverUrl),
    defaultWorkspaceSlug: normalizeWorkspaceSlug(raw.defaultWorkspaceSlug),
    defaultProjectId: normalizeOptionalSlug(raw.defaultProjectId),
    showAssignedBadge: raw.showAssignedBadge,
    mcpEnvPath: normalizeOptionalSlug(raw.mcpEnvPath ?? ''),
  };
}
