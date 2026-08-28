import type { PlaneWorkspace } from '../client/plane.types';

export function resolveSearchWorkspaces(defaultWorkspaceSlug: string | undefined, workspaces: readonly PlaneWorkspace[]): readonly PlaneWorkspace[] {
  if (defaultWorkspaceSlug === undefined || defaultWorkspaceSlug.length === 0) {
    return workspaces;
  }
  const match = workspaces.filter((workspace) => workspace.slug === defaultWorkspaceSlug);
  return match.length > 0 ? match : workspaces;
}
