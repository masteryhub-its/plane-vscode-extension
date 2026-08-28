import { SidebarMessageType } from '../utils/enums/sidebar-message-type.enum';
import { parseSidebarMessageType } from '../utils/sidebar-message-type';
import type { SidebarToHost } from './sidebar.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function parseSidebarMessage(value: unknown): SidebarToHost | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const type = parseSidebarMessageType(value['type']);
  if (type === undefined) {
    return undefined;
  }

  switch (type) {
    case SidebarMessageType.SIGN_OUT:
      return { type };
    case SidebarMessageType.REFRESH:
      return { type };
    case SidebarMessageType.FORCE_RELOAD:
      return { type };
    case SidebarMessageType.SEARCH:
      return { type };
    case SidebarMessageType.TOGGLE_MY_ISSUES:
      return { type };
    case SidebarMessageType.APPLY_SAVED_FILTER: {
      const filterId = requiredString(value['filterId']);
      if (filterId === undefined) {
        return undefined;
      }
      return { type, filterId };
    }
    case SidebarMessageType.SAVE_FILTER: {
      const name = requiredString(value['name']);
      const text = requiredString(value['text']);
      if (name === undefined || text === undefined) {
        return undefined;
      }
      return { type, name, text };
    }
    case SidebarMessageType.SIGN_IN_WITH_PAT: {
      const token = requiredString(value['token']);
      if (token === undefined) {
        return undefined;
      }
      return { type, token };
    }
    case SidebarMessageType.SET_SERVER_URL: {
      const serverUrl = requiredString(value['serverUrl']);
      if (serverUrl === undefined) {
        return undefined;
      }
      return { type, serverUrl };
    }
    case SidebarMessageType.OPEN_ISSUE:
    case SidebarMessageType.OPEN_IN_BROWSER: {
      const workspaceSlug = requiredString(value['workspaceSlug']);
      const projectId = requiredString(value['projectId']);
      const issueId = requiredString(value['issueId']);
      if (workspaceSlug === undefined || projectId === undefined || issueId === undefined) {
        return undefined;
      }
      return { type, workspaceSlug, projectId, issueId };
    }
  }
}
