import { SidebarStatus } from '../utils/enums/sidebar-status.enum';
import { renderSidebarHtml } from './sidebar-html';

describe('renderSidebarHtml', () => {
  it('escapes signed-out server URL and sets CSP img-src to cspSource only', () => {
    const html = renderSidebarHtml({
      state: {
        status: SidebarStatus.SIGNED_OUT,
        serverUrl: 'https://plane.test"><img',
        error: undefined,
        busy: false,
      },
      nonce: 'abc123',
      cspSource: 'vscode-webview://test',
    });
    expect(html).toContain('img-src vscode-webview://test;');
    expect(html).not.toContain('plane.test"><img');
    expect(html).toContain('Sign in with PAT');
    expect(html).toContain('Server URL (Global only)');
  });

  it('shows Global-only server URL and never renders email', () => {
    const html = renderSidebarHtml({
      state: {
        status: SidebarStatus.SIGNED_IN,
        serverUrl: 'https://plane.masteryhub-its.com',
        userName: 'Ada',
        avatarUrl: undefined,
        workspaces: [],
        error: undefined,
        busy: false,
        query: '',
        lastSyncedLabel: undefined,
        currentUserId: undefined,
        savedFilters: [],
        activeFilterId: undefined,
      },
      nonce: 'n1',
      cspSource: 'vscode-webview://test',
    });
    expect(html).toContain('https://plane.masteryhub-its.com');
    expect(html).toContain('(Global only)');
    expect(html).toContain('Ada');
    expect(html).not.toContain('@');
    expect(html).not.toContain('My issues');
  });

  it('renders a My issues section for the current user', () => {
    const html = renderSidebarHtml({
      state: {
        status: SidebarStatus.SIGNED_IN,
        serverUrl: 'https://plane.masteryhub-its.com',
        userName: 'Ada',
        avatarUrl: undefined,
        workspaces: [
          {
            id: 'w1',
            slug: 'acme',
            label: 'Acme',
            projects: [
              {
                id: 'p1',
                name: 'Core',
                identifier: 'MH',
                issues: [{ id: 'i1', key: 'MH-1', title: 'Mine', stateName: 'Todo', assigneeIds: ['u1'], labelIds: [], workspaceSlug: 'acme', projectId: 'p1' }],
              },
            ],
          },
        ],
        error: undefined,
        busy: false,
        query: '',
        lastSyncedLabel: undefined,
        currentUserId: 'u1',
        savedFilters: [],
        activeFilterId: undefined,
      },
      nonce: 'n1',
      cspSource: 'vscode-webview://test',
    });
    expect(html).toContain('My issues');
    expect(html).toContain('MH-1');
  });

  it('renders a saved-filter picker and applies the active filter', () => {
    const html = renderSidebarHtml({
      state: {
        status: SidebarStatus.SIGNED_IN,
        serverUrl: 'https://plane.masteryhub-its.com',
        userName: 'Ada',
        avatarUrl: undefined,
        workspaces: [
          {
            id: 'w1',
            slug: 'acme',
            label: 'Acme',
            projects: [
              {
                id: 'p1',
                name: 'Core',
                identifier: 'MH',
                issues: [
                  { id: 'i1', key: 'MH-1', title: 'Mine', stateName: 'Todo', assigneeIds: ['u1'], labelIds: ['lab-1'], workspaceSlug: 'acme', projectId: 'p1' },
                  { id: 'i2', key: 'MH-2', title: 'Other', stateName: 'Done', assigneeIds: ['u2'], labelIds: [], workspaceSlug: 'acme', projectId: 'p1' },
                ],
              },
            ],
          },
        ],
        savedFilters: [{ id: 'f1', name: 'Mine', assigneeId: 'u1' }],
        activeFilterId: 'f1',
        error: undefined,
        busy: false,
        query: '',
        lastSyncedLabel: undefined,
        currentUserId: 'u1',
      },
      nonce: 'n1',
      cspSource: 'vscode-webview://test',
    });
    expect(html).toContain('id="saved-filter"');
    expect(html).toContain('Mine');
    expect(html).toContain('id="save-filter"');
    expect(html).toContain('MH-1');
    expect(html).not.toContain('MH-2');
  });
});
