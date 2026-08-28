import { SidebarMessageType } from './enums/sidebar-message-type.enum';
import { parseSidebarMessageType } from './sidebar-message-type';

describe('sidebar-message-type', () => {
  it('parses known message types', () => {
    expect(parseSidebarMessageType(SidebarMessageType.SEARCH)).toBe(SidebarMessageType.SEARCH);
    expect(parseSidebarMessageType('unknown')).toBeUndefined();
  });
});
