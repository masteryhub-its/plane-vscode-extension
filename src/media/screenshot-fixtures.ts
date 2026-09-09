import { DEFAULT_SERVER_URL } from '../constants';
import type { PlaneIssue } from '../client/plane.types';
import type { RenderIssueHtmlInput } from '../issue/render-issue-html';
import { PlaneRelationType } from '../utils/enums/plane-relation-type.enum';
import { SidebarStatus } from '../utils/enums/sidebar-status.enum';
import type { SidebarHtmlInput, SidebarIssueSummary, SidebarWorkspaceSummary } from '../sidebar/sidebar.types';

export const SCREENSHOT_NONCE = 'marketplace';
export const SCREENSHOT_CSP = DEFAULT_SERVER_URL;
export const SCREENSHOT_SERVER = DEFAULT_SERVER_URL;
export const SCREENSHOT_HOVER_ISSUE_ID = 'login-timeout';
export const SCREENSHOT_CURRENT_USER_ID = 'user-ada';

function screenshotIssue(): SidebarIssueSummary {
  return {
    id: SCREENSHOT_HOVER_ISSUE_ID,
    key: 'ENG-12',
    title: 'Fix login timeout',
    stateName: 'In Progress',
    assigneeIds: [SCREENSHOT_CURRENT_USER_ID],
    labelIds: ['lab-bug'],
    workspaceSlug: 'docs',
    projectId: 'proj-eng',
  };
}

function screenshotWorkspace(): SidebarWorkspaceSummary {
  const issue = screenshotIssue();
  return {
    id: 'ws-docs',
    slug: 'docs',
    label: 'Docs',
    projects: [
      {
        id: 'proj-eng',
        name: 'Engineering',
        identifier: 'ENG',
        issues: [issue, { ...issue, id: 'api-handbook', key: 'ENG-8', title: 'Document search API', stateName: 'Todo', assigneeIds: [] }],
      },
    ],
  };
}

export function signedOutSidebarHtmlInput(): SidebarHtmlInput {
  return {
    state: {
      status: SidebarStatus.SIGNED_OUT,
      serverUrl: SCREENSHOT_SERVER,
      error: undefined,
      busy: false,
    },
    nonce: SCREENSHOT_NONCE,
    cspSource: SCREENSHOT_CSP,
  };
}

export function signedInSidebarHtmlInput(): SidebarHtmlInput {
  return {
    state: {
      status: SidebarStatus.SIGNED_IN,
      serverUrl: SCREENSHOT_SERVER,
      userName: 'Ada',
      avatarUrl: undefined,
      workspaces: [screenshotWorkspace()],
      error: undefined,
      busy: false,
      query: '',
      lastSyncedLabel: '3:04 PM',
      currentUserId: SCREENSHOT_CURRENT_USER_ID,
      savedFilters: [{ id: 'mine', name: 'Assigned to me', text: 'login' }],
      activeFilterId: undefined,
    },
    nonce: SCREENSHOT_NONCE,
    cspSource: SCREENSHOT_CSP,
  };
}

function previewIssue(): PlaneIssue {
  return {
    id: SCREENSHOT_HOVER_ISSUE_ID,
    name: 'Fix login timeout',
    descriptionHtml: '<p>Users stay signed in past the idle window. Cap the session and surface a retry.</p>',
    descriptionPlain: '',
    sequenceId: 12,
    projectId: 'proj-eng',
    workspaceSlug: 'docs',
    projectIdentifier: 'ENG',
    stateId: 'state-progress',
    stateName: 'In Progress',
    priority: 'high',
    assigneeIds: [SCREENSHOT_CURRENT_USER_ID],
    assigneeNames: ['Ada'],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-09',
    targetDate: '2026-09-12',
    createdById: SCREENSHOT_CURRENT_USER_ID,
    parentId: undefined,
    labelIds: ['lab-bug'],
    labelNames: ['bug'],
  };
}

export function previewIssueHtmlInput(): RenderIssueHtmlInput {
  const issue = previewIssue();
  return {
    issue,
    nonce: SCREENSHOT_NONCE,
    cspSource: SCREENSHOT_CSP,
    planeUrl: `${SCREENSHOT_SERVER}/docs/projects/proj-eng/issues/${issue.id}`,
    comments: [{ id: 'c1', html: '<p>Reproduced on Cloud after 30 minutes idle.</p>', authorName: 'Sara', createdAt: '2026-09-08', authorId: 'user-sara' }],
    subIssues: [{ ...issue, id: 'child-1', name: 'Add idle warning', sequenceId: 13, parentId: issue.id, assigneeIds: [], assigneeNames: [] }],
    attachments: [{ id: 'att-1', name: 'spec.pdf', url: `${SCREENSHOT_SERVER}/files/spec.pdf` }],
    relations: [{ id: 'rel-1', type: PlaneRelationType.BLOCKED_BY, issueId: 'other', name: 'Session store', key: 'ENG-3' }],
    worklogs: [{ id: 'w1', duration: '1h', description: 'Reproduce idle expiry' }],
    labels: [{ id: 'lab-bug', name: 'bug', color: '#e5534b' }],
    currentUserId: SCREENSHOT_CURRENT_USER_ID,
  };
}
