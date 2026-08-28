export interface CreateIssueDefaults {
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly priority: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseCreateIssueDefaults(raw: unknown): CreateIssueDefaults | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const workspaceSlug = raw['workspaceSlug'];
  const projectId = raw['projectId'];
  const priority = raw['priority'];
  if (typeof workspaceSlug !== 'string' || workspaceSlug.length === 0) {
    return undefined;
  }
  if (typeof projectId !== 'string' || projectId.length === 0) {
    return undefined;
  }
  if (typeof priority !== 'string' || priority.length === 0) {
    return undefined;
  }
  return { workspaceSlug, projectId, priority };
}
