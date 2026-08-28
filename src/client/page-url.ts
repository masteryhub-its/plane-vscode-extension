export interface BuildPageUrlInput {
  readonly serverUrl: string;
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly pageId: string;
}

export interface BuildProjectPagesUrlInput {
  readonly serverUrl: string;
  readonly workspaceSlug: string;
  readonly projectId: string;
}

function stripSlash(url: string): string {
  return url.replace(/\/+$/u, '');
}

export function buildPageUrl(input: BuildPageUrlInput): string {
  return `${stripSlash(input.serverUrl)}/${input.workspaceSlug}/projects/${input.projectId}/pages/${input.pageId}`;
}

export function buildProjectPagesUrl(input: BuildProjectPagesUrlInput): string {
  return `${stripSlash(input.serverUrl)}/${input.workspaceSlug}/projects/${input.projectId}/pages`;
}
