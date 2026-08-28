import type { SavedIssueFilter } from '../filter/saved-filters';
import type { SidebarMessageType } from '../utils/enums/sidebar-message-type.enum';
import type { SidebarStatus } from '../utils/enums/sidebar-status.enum';

export interface SidebarIssueSummary {
  readonly id: string;
  readonly key: string;
  readonly title: string;
  readonly stateName: string;
  readonly assigneeIds: readonly string[];
  readonly labelIds: readonly string[];
  readonly workspaceSlug: string;
  readonly projectId: string;
}

export interface SidebarProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly identifier: string;
  readonly issues: readonly SidebarIssueSummary[];
}

export interface SidebarWorkspaceSummary {
  readonly id: string;
  readonly slug: string;
  readonly label: string;
  readonly projects: readonly SidebarProjectSummary[];
}

export interface SignedOutSidebarState {
  readonly status: SidebarStatus.SIGNED_OUT;
  readonly serverUrl: string;
  readonly error: string | undefined;
  readonly busy: boolean;
}

export interface SignedInSidebarState {
  readonly status: SidebarStatus.SIGNED_IN;
  readonly serverUrl: string;
  readonly userName: string;
  readonly avatarUrl: string | undefined;
  readonly workspaces: readonly SidebarWorkspaceSummary[];
  readonly error: string | undefined;
  readonly busy: boolean;
  readonly query: string;
  readonly lastSyncedLabel: string | undefined;
  readonly currentUserId: string | undefined;
  readonly savedFilters: readonly SavedIssueFilter[];
  readonly activeFilterId: string | undefined;
}

export type SidebarState = SignedOutSidebarState | SignedInSidebarState;

export interface SignInWithPatMessage {
  readonly type: SidebarMessageType.SIGN_IN_WITH_PAT;
  readonly token: string;
}

export interface SignOutMessage {
  readonly type: SidebarMessageType.SIGN_OUT;
}

export interface OpenIssueMessage {
  readonly type: SidebarMessageType.OPEN_ISSUE;
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
}

export interface OpenInBrowserMessage {
  readonly type: SidebarMessageType.OPEN_IN_BROWSER;
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
}

export interface RefreshMessage {
  readonly type: SidebarMessageType.REFRESH;
}

export interface ForceReloadMessage {
  readonly type: SidebarMessageType.FORCE_RELOAD;
}

export interface SearchMessage {
  readonly type: SidebarMessageType.SEARCH;
}

export interface SetServerUrlMessage {
  readonly type: SidebarMessageType.SET_SERVER_URL;
  readonly serverUrl: string;
}

export interface ToggleMyIssuesMessage {
  readonly type: SidebarMessageType.TOGGLE_MY_ISSUES;
}

export interface ApplySavedFilterMessage {
  readonly type: SidebarMessageType.APPLY_SAVED_FILTER;
  readonly filterId: string;
}

export interface SaveFilterMessage {
  readonly type: SidebarMessageType.SAVE_FILTER;
  readonly name: string;
  readonly text: string;
}

export type SidebarToHost =
  | SignInWithPatMessage
  | SignOutMessage
  | OpenIssueMessage
  | OpenInBrowserMessage
  | RefreshMessage
  | ForceReloadMessage
  | SearchMessage
  | SetServerUrlMessage
  | ToggleMyIssuesMessage
  | ApplySavedFilterMessage
  | SaveFilterMessage;

export interface SidebarHtmlInput {
  readonly state: SidebarState;
  readonly nonce: string;
  readonly cspSource: string;
}
