import type { PlaneIssue } from '../client/plane.types';
import { mapConcurrent } from '../utils/map-concurrent';
import { assignedToUser } from './filter-my-issues';

export interface MyIssuesSource {
  listWorkspaces(): Promise<readonly { readonly slug: string }[]>;
  listProjects(workspaceSlug: string): Promise<readonly { readonly id: string }[]>;
}

export interface MyIssuesResult {
  readonly issues: readonly PlaneIssue[];
  /** Projects that could not be read; their issues are missing from the list. */
  readonly failedProjects: number;
}

type ListIssues = (workspaceSlug: string, projectId: string) => Promise<readonly PlaneIssue[]>;

const PROJECT_CONCURRENCY = 4;

interface ProjectRef {
  readonly workspaceSlug: string;
  readonly projectId: string;
}

/**
 * The issues assigned to a user across every workspace and project. Projects are read a few at a time, so the list
 * appears in a fraction of the time, and a project that fails is counted instead of losing the whole list. Only when
 * every project fails is the error passed on.
 */
export async function loadMyIssues(source: MyIssuesSource, listIssues: ListIssues, userId: string): Promise<MyIssuesResult> {
  const workspaces = await source.listWorkspaces();
  const projectLists = await mapConcurrent(workspaces, PROJECT_CONCURRENCY, async (workspace) => {
    const projects = await source.listProjects(workspace.slug);
    return projects.map((project): ProjectRef => ({ workspaceSlug: workspace.slug, projectId: project.id }));
  });
  const projects = projectLists.flat();
  let firstError: unknown;
  let failed = 0;
  const perProject = await mapConcurrent(projects, PROJECT_CONCURRENCY, async (project) => {
    try {
      return assignedToUser(await listIssues(project.workspaceSlug, project.projectId), userId);
    } catch (error: unknown) {
      failed += 1;
      firstError ??= error;
      return [];
    }
  });
  if (projects.length > 0 && failed === projects.length) {
    throw firstError instanceof Error ? firstError : new Error('Could not load your issues');
  }
  return { issues: perProject.flat(), failedProjects: failed };
}
