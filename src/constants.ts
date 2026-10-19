export const DEFAULT_SERVER_URL = 'https://app.plane.so';
export const PAT_SECRET_KEY = 'plane.credential';
export const API_PREFIX = '/api/v1';
export const USER_AGENT_PRODUCT = 'Plane-VSCode';

/** Honest product token with the extension's own version, e.g. `Plane-VSCode/1.1.0`. */
export function buildUserAgent(version: string | undefined): string {
  const clean = version?.trim() ?? '';
  return /^[0-9A-Za-z.+-]+$/u.test(clean) ? `${USER_AGENT_PRODUCT}/${clean}` : USER_AGENT_PRODUCT;
}
export const FETCH_TIMEOUT_MS = 60_000;
export const ISSUES_PAGE_SIZE = 100;
export const MAX_ISSUE_PAGES = 50;
export const CREATE_DEFAULTS_KEY = 'plane.createDefaults';
export const SAVED_FILTERS_KEY = 'plane.savedFilters';
