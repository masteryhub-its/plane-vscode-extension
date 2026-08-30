import { DEFAULT_SERVER_URL } from '../constants';
import { PlaneError } from '../errors/plane-error';
import { normalizeServerUrl, normalizeSettings, preferredServerUrlRaw } from './settings';

describe('settings', () => {
  it('prefers global server URL over workspace values', () => {
    expect(
      preferredServerUrlRaw({
        globalValue: 'https://global.test',
        defaultValue: DEFAULT_SERVER_URL,
        workspaceValue: 'https://workspace.test',
        workspaceFolderValue: 'https://folder.test',
      })
    ).toBe('https://global.test');
  });

  it('rejects non-loopback http', () => {
    expect(() => normalizeServerUrl('http://plane.example')).toThrow(PlaneError);
  });

  it('allows loopback http', () => {
    expect(normalizeServerUrl('http://localhost:8080/')).toBe('http://localhost:8080');
  });

  it('normalizes optional slugs', () => {
    expect(normalizeSettings({ serverUrl: DEFAULT_SERVER_URL, defaultWorkspaceSlug: 'acme', defaultProjectId: '', showAssignedBadge: false }).defaultWorkspaceSlug).toBe('acme');
  });

  it('leaves an empty workspace slug unset', () => {
    expect(normalizeSettings({ serverUrl: DEFAULT_SERVER_URL, defaultWorkspaceSlug: '', defaultProjectId: '', showAssignedBadge: false }).defaultWorkspaceSlug).toBeUndefined();
  });
});
