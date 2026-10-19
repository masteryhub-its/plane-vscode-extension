import { SidebarMessageType } from '../utils/enums/sidebar-message-type.enum';
import { parseSidebarMessage } from './parse-message';

describe('parseSidebarMessage', () => {
  it('parses PAT sign in', () => {
    expect(parseSidebarMessage({ type: SidebarMessageType.SIGN_IN_WITH_PAT, token: 'plane_api_x' })).toEqual({
      type: SidebarMessageType.SIGN_IN_WITH_PAT,
      token: 'plane_api_x',
    });
  });

  it('rejects malformed open issue messages', () => {
    expect(parseSidebarMessage({ type: SidebarMessageType.OPEN_ISSUE, workspaceSlug: 'acme' })).toBeUndefined();
  });
});

describe('parseSidebarMessage coverage of every message', () => {
  it.each([SidebarMessageType.SIGN_OUT, SidebarMessageType.REFRESH, SidebarMessageType.FORCE_RELOAD, SidebarMessageType.SEARCH, SidebarMessageType.TOGGLE_MY_ISSUES])(
    'parses the bare message %s',
    (type) => {
      expect(parseSidebarMessage({ type })).toEqual({ type });
    }
  );

  it('parses applying a saved filter and rejects a missing id', () => {
    expect(parseSidebarMessage({ type: SidebarMessageType.APPLY_SAVED_FILTER, filterId: 'f1' })).toEqual({ type: SidebarMessageType.APPLY_SAVED_FILTER, filterId: 'f1' });
    expect(parseSidebarMessage({ type: SidebarMessageType.APPLY_SAVED_FILTER })).toBeUndefined();
  });

  it('parses saving a filter and rejects partial input', () => {
    expect(parseSidebarMessage({ type: SidebarMessageType.SAVE_FILTER, name: 'Mine', text: 'login' })).toEqual({ type: SidebarMessageType.SAVE_FILTER, name: 'Mine', text: 'login' });
    expect(parseSidebarMessage({ type: SidebarMessageType.SAVE_FILTER, name: 'Mine' })).toBeUndefined();
  });

  it('parses setting the server URL and rejects a non-string value', () => {
    expect(parseSidebarMessage({ type: SidebarMessageType.SET_SERVER_URL, serverUrl: 'https://plane.test' })).toEqual({ type: SidebarMessageType.SET_SERVER_URL, serverUrl: 'https://plane.test' });
    expect(parseSidebarMessage({ type: SidebarMessageType.SET_SERVER_URL, serverUrl: 5 })).toBeUndefined();
  });

  it('rejects a PAT message without a token', () => {
    expect(parseSidebarMessage({ type: SidebarMessageType.SIGN_IN_WITH_PAT })).toBeUndefined();
  });

  it.each([SidebarMessageType.OPEN_ISSUE, SidebarMessageType.OPEN_IN_BROWSER])('parses a complete %s message', (type) => {
    expect(parseSidebarMessage({ type, workspaceSlug: 'acme', projectId: 'p', issueId: 'i' })).toEqual({ type, workspaceSlug: 'acme', projectId: 'p', issueId: 'i' });
  });

  it('rejects non-objects, arrays and unknown types', () => {
    expect(parseSidebarMessage('signOut')).toBeUndefined();
    expect(parseSidebarMessage(null)).toBeUndefined();
    expect(parseSidebarMessage([])).toBeUndefined();
    expect(parseSidebarMessage({ type: 'unknown' })).toBeUndefined();
  });
});
