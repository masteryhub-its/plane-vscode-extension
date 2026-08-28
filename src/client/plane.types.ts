import type { PlaneRelationType } from '../utils/enums/plane-relation-type.enum';

export interface BoundPlaneCredential {
  readonly serverUrl: string;
  readonly token: string;
}

export interface SignInWithPatInput {
  readonly token: string;
}

export interface PlaneUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string | undefined;
}

export interface PlaneWorkspace {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface PlaneProject {
  readonly id: string;
  readonly name: string;
  readonly identifier: string;
  readonly description: string;
  readonly emoji: string;
}

export interface PlaneState {
  readonly id: string;
  readonly name: string;
  readonly group: string;
  readonly color: string;
}

export interface PlaneMember {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly avatarUrl: string | undefined;
}

export interface PlaneIssue {
  readonly id: string;
  readonly name: string;
  readonly descriptionHtml: string;
  readonly descriptionPlain: string;
  readonly sequenceId: number;
  readonly projectId: string;
  readonly workspaceSlug: string;
  readonly projectIdentifier: string;
  readonly stateId: string;
  readonly stateName: string;
  readonly priority: string;
  readonly assigneeIds: readonly string[];
  readonly assigneeNames: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly targetDate: string | undefined;
  readonly createdById: string | undefined;
  readonly parentId: string | undefined;
  readonly labelIds: readonly string[];
  readonly labelNames: readonly string[];
}

export interface CreateIssueInput {
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly name: string;
  readonly descriptionHtml: string;
  readonly priority: string;
  readonly labelIds?: readonly string[];
}

export interface UpdateIssueStateInput {
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
  readonly stateId: string;
}

export interface UpdateIssueAssigneeInput {
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
  readonly assigneeIds: readonly string[];
}

export interface UpdateIssueFieldsInput {
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
  readonly name?: string;
  readonly descriptionHtml?: string;
  readonly priority?: string;
  readonly labelIds?: readonly string[];
  readonly targetDate?: string | null;
}

export interface PlaneLabel {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export interface PlaneCycle {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly startDate: string | undefined;
  readonly endDate: string | undefined;
}

export interface PlaneModule {
  readonly id: string;
  readonly name: string;
  readonly status: string;
}

export interface PlaneAttachment {
  readonly id: string;
  readonly name: string;
  readonly url: string;
}

export interface PlaneIssueRelation {
  readonly id: string;
  readonly type: PlaneRelationType;
  readonly issueId: string;
  readonly name: string;
  readonly key: string;
}

export interface PlanePage {
  readonly id: string;
  readonly name: string;
  readonly projectId: string;
  readonly workspaceSlug: string;
}

export interface PlaneIntakeItem {
  readonly id: string;
  readonly name: string;
  readonly issueId: string | undefined;
}

export interface PlaneTemplate {
  readonly id: string;
  readonly name: string;
  readonly descriptionHtml: string;
}

export interface PlaneWorklog {
  readonly id: string;
  readonly duration: string;
  readonly description: string;
}

export interface CreateCommentInput {
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
  readonly html: string;
}

export interface UpdateCommentInput {
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
  readonly commentId: string;
  readonly html: string;
}

export interface IssueRef {
  readonly workspaceSlug: string;
  readonly projectId: string;
  readonly issueId: string;
}

export interface SubscribeIssueInput extends IssueRef {
  readonly subscribed: boolean;
}

export interface ListIssuesQuery {
  readonly search?: string;
}
