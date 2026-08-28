import { SidebarMessageType } from './enums/sidebar-message-type.enum';

const VALUES: ReadonlySet<string> = new Set(Object.values(SidebarMessageType));

export function parseSidebarMessageType(value: unknown): SidebarMessageType | undefined {
  if (typeof value !== 'string' || !VALUES.has(value)) {
    return undefined;
  }
  return value as SidebarMessageType;
}
