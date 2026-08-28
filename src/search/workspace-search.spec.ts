import { parseWorkspaceSearchHits } from './workspace-search';

describe('parseWorkspaceSearchHits', () => {
  it('reads issue hits from a workspace search payload', () => {
    const hits = parseWorkspaceSearchHits(
      {
        issue: [
          {
            id: 'i1',
            name: 'Login bug',
            sequence_id: 3,
            project_id: 'p1',
            project__identifier: 'MH',
            workspace__slug: 'masteryhub-its',
          },
        ],
      },
      'masteryhub-its'
    );
    expect(hits).toEqual([
      {
        workspaceSlug: 'masteryhub-its',
        projectId: 'p1',
        issueId: 'i1',
        title: 'Login bug',
        identifier: 'MH',
        sequenceId: 3,
        stateName: '',
        highlight: 'MH-3',
      },
    ]);
  });

  it('returns empty when the search endpoint shape is unknown', () => {
    expect(parseWorkspaceSearchHits({ detail: 'not found' }, 'masteryhub-its')).toEqual([]);
  });
});
