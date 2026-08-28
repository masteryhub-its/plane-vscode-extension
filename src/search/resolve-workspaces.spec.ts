import { resolveSearchWorkspaces } from './resolve-workspaces';

describe('resolveSearchWorkspaces', () => {
  const workspaces = [
    { id: 'w1', name: 'MH', slug: 'masteryhub-its' },
    { id: 'w2', name: 'Other', slug: 'other' },
  ];

  it('filters to default slug when present', () => {
    expect(resolveSearchWorkspaces('masteryhub-its', workspaces)).toHaveLength(1);
  });

  it('returns all workspaces when default missing', () => {
    expect(resolveSearchWorkspaces(undefined, workspaces)).toHaveLength(2);
  });
});
