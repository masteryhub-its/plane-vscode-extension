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
