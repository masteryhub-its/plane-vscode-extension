import { buildIssueDecorationUri, parseIssueDecoration, ISSUE_URI_SCHEME } from './issue-decoration';
import type { IssuePresentation } from './issue-presentation';

function view(overrides: Partial<IssuePresentation> = {}): IssuePresentation {
  return {
    label: 'Fix',
    description: 'ENG-1',
    icon: { id: 'circle-outline', color: undefined },
    priorityBadge: 'H',
    priorityLabel: 'High',
    emphasis: undefined,
    tooltip: [],
    ...overrides,
  };
}

describe('issue decoration uri', () => {
  it('round-trips the badge, priority label and emphasis', () => {
    const uri = buildIssueDecorationUri('ws:proj:issue/1', view({ emphasis: 'overdue', priorityBadge: '!!', priorityLabel: 'Urgent' }));
    expect(uri.scheme).toBe(ISSUE_URI_SCHEME);
    expect(parseIssueDecoration(uri.query)).toEqual({ badge: '!!', tooltip: 'Priority: Urgent', emphasis: 'overdue' });
  });

  it('omits what is not there', () => {
    const uri = buildIssueDecorationUri('a', view({ priorityBadge: undefined, priorityLabel: 'None', emphasis: undefined }));
    expect(parseIssueDecoration(uri.query)).toEqual({ badge: undefined, tooltip: undefined, emphasis: undefined });
  });

  it('gives a different uri when the decoration changes, so the editor redraws the row', () => {
    expect(buildIssueDecorationUri('a', view()).toString()).not.toBe(buildIssueDecorationUri('a', view({ emphasis: 'urgent' })).toString());
  });

  it('keeps ids with unusual characters in the path', () => {
    expect(buildIssueDecorationUri('ws:proj:issue/1 ?#', view()).path).toBe(`/${encodeURIComponent('ws:proj:issue/1 ?#')}`);
  });

  it('ignores an unknown emphasis value and an over-long badge', () => {
    expect(parseIssueDecoration('badge=ABCDEF&emphasis=weird')).toEqual({ badge: undefined, tooltip: undefined, emphasis: undefined });
  });
});
