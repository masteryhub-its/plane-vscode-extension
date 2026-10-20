import type { IssueEmphasis, IssuePresentation } from './issue-presentation';

export const ISSUE_URI_SCHEME = 'plane-issue';

export interface IssueDecorationData {
  readonly badge: string | undefined;
  readonly tooltip: string | undefined;
  readonly emphasis: IssueEmphasis | undefined;
}

export interface IssueDecorationUri {
  readonly scheme: string;
  readonly path: string;
  readonly query: string;
  toString(): string;
}

const MAX_BADGE_LENGTH = 2;

function parseEmphasis(value: string | null): IssueEmphasis | undefined {
  return value === 'overdue' || value === 'urgent' ? value : undefined;
}

/**
 * A stable pseudo-address for one issue row. The editor asks for a decoration per address, so the badge and the
 * emphasis travel in the query; a changed priority or date gives a new address and the row is redrawn.
 */
export function buildIssueDecorationUri(nodeId: string, view: IssuePresentation): IssueDecorationUri {
  const params = new URLSearchParams();
  if (view.priorityBadge !== undefined) {
    params.set('badge', view.priorityBadge);
    params.set('tooltip', `Priority: ${view.priorityLabel}`);
  }
  if (view.emphasis !== undefined) {
    params.set('emphasis', view.emphasis);
  }
  const path = `/${encodeURIComponent(nodeId)}`;
  const query = params.toString();
  return { scheme: ISSUE_URI_SCHEME, path, query, toString: () => `${ISSUE_URI_SCHEME}:${path}${query.length > 0 ? `?${query}` : ''}` };
}

export function parseIssueDecoration(query: string): IssueDecorationData {
  const params = new URLSearchParams(query);
  const badge = params.get('badge');
  return {
    badge: badge !== null && badge.length > 0 && badge.length <= MAX_BADGE_LENGTH ? badge : undefined,
    tooltip: params.get('tooltip') ?? undefined,
    emphasis: parseEmphasis(params.get('emphasis')),
  };
}
