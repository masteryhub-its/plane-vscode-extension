export const DEFAULT_SERVER_URL = 'https://app.plane.so';
export const PAT_SECRET_KEY = 'plane.credential';
export const API_PREFIX = '/api/v1';
/** Cloudflare Bot Fight Mode (error 1010) blocks Node/curl UAs; a Chrome-like UA is required for /api/v1. */
export const HTTP_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Plane-VSCode/0.5.2';
export const FETCH_TIMEOUT_MS = 60_000;
export const ISSUES_PAGE_SIZE = 100;
export const MAX_ISSUE_PAGES = 50;
export const CREATE_DEFAULTS_KEY = 'plane.createDefaults';
export const SAVED_FILTERS_KEY = 'plane.savedFilters';
