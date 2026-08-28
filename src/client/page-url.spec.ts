import { buildPageUrl, buildProjectPagesUrl } from './page-url';

describe('page-url', () => {
  it('builds project page and pages index URLs', () => {
    expect(buildPageUrl({ serverUrl: 'https://plane.test/', workspaceSlug: 'acme', projectId: 'p1', pageId: 'pg-1' })).toBe('https://plane.test/acme/projects/p1/pages/pg-1');
    expect(buildProjectPagesUrl({ serverUrl: 'https://plane.test', workspaceSlug: 'acme', projectId: 'p1' })).toBe('https://plane.test/acme/projects/p1/pages');
  });
});
