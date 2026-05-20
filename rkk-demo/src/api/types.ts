// ─── Enums ─────────────────────────────────────────────

export const TodoPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;
export type TodoPriority = (typeof TodoPriority)[keyof typeof TodoPriority];

export const JiraSyncStatus = {
  NOT_LINKED: "NOT_LINKED",
  SYNCED: "SYNCED",
  PENDING: "PENDING",
  FAILED: "FAILED",
} as const;
export type JiraSyncStatus =
  (typeof JiraSyncStatus)[keyof typeof JiraSyncStatus];

export const JiraAuthType = {
  BASIC: "BASIC",
  BEARER: "BEARER",
} as const;
export type JiraAuthType = (typeof JiraAuthType)[keyof typeof JiraAuthType];

// ─── Auth ──────────────────────────────────────────────

export interface LoginReq {
  email: string;
  password: string;
}

export interface LoginRes {
  userId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpires: number;
}

export interface RegisterReq {
  name: string;
  email: string;
  password: string;
}

export interface RegisterRes {
  userId: string;
}

export interface RefreshReq {
  refreshToken: string;
}

export type RefreshRes = Omit<LoginRes, "userId">;

export interface ForgotPasswordReq {
  email: string;
}

export interface ResendVerifyEmailReq {
  email: string;
}

export interface VerifyForgotPasswordReq {
  token: string;
}

export interface ResetPasswordReq {
  token: string;
  password: string;
}

export interface ChangePasswordReq {
  currentPassword: string;
  newPassword: string;
}

export interface SuccessRes {
  success: true;
}

export interface VerifyResetRes {
  valid: true;
}

// ─── User ──────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  bio?: string;
  image: string;
  emailVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  workspaceId?: string;
  settings?: Record<string, unknown>;
  isOwner: boolean;
  permission: ProjectMemberPermission;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  isOwner: boolean;
  permission: ProjectMemberPermission;
  createdAt: string;
  updatedAt: string;
}

export type ProjectMemberPermission = "READ" | "WRITE" | "WRITE_INVITE";
export type ProjectInvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REVOKED"
  | "EXPIRED";

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  permission: ProjectMemberPermission;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  permission: ProjectMemberPermission;
  createdAt: string;
}

export type WorkspaceInvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  permission: ProjectMemberPermission;
  status: WorkspaceInvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceInvitationPreview {
  workspaceName: string;
  email: string;
  permission: ProjectMemberPermission;
  status: WorkspaceInvitationStatus;
  expiresAt: string;
}

export interface AcceptWorkspaceInvitationRes {
  workspaceId: string;
  member: WorkspaceMember;
}

export interface InviteProjectMemberReq {
  userId?: string;
  email?: string;
  permission: ProjectMemberPermission;
}

export interface CreateProjectInvitationReq {
  email: string;
  permission: ProjectMemberPermission;
}

export interface ProjectInvitation {
  id: string;
  projectId: string;
  email: string;
  permission: ProjectMemberPermission;
  status: ProjectInvitationStatus;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export interface ProjectInvitationPreview {
  projectName: string;
  email: string;
  permission: ProjectMemberPermission;
  status: ProjectInvitationStatus;
  expiresAt: string;
}

export interface AcceptProjectInvitationRes {
  projectId: string;
  member: ProjectMember;
}

export interface UpdateProjectMemberReq {
  permission: ProjectMemberPermission;
}

export interface CreateProjectReq {
  name: string;
  description?: string;
  workspaceId?: string;
}

export interface CreateWorkspaceReq {
  name: string;
  description?: string;
}

export interface UpdateWorkspaceReq {
  name?: string;
  description?: string;
}

export interface CreateWorkspaceInvitationReq {
  email: string;
  permission: ProjectMemberPermission;
}

export interface UpdateProjectReq {
  name?: string;
  description?: string;
}

export interface ListProjectParams extends PageParams {
  workspaceId?: string;
}

export interface UpdateMeReq {
  name: string;
  bio?: string;
}

export interface PresignAvatarReq {
  filename: string;
  mimeType: string;
  size: number;
}

export interface PresignAvatarRes {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
}

export interface CompleteAvatarReq {
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

// ─── TodoStatus ────────────────────────────────────────

export interface TodoStatus {
  id: string;
  projectId: string;
  name: string;
  order: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoStatusReq {
  projectId: string;
  name: string;
  order?: number;
  color?: string;
}

export interface UpdateTodoStatusReq {
  name?: string;
  order?: number;
  color?: string;
}

// ─── Todo ──────────────────────────────────────────────

export interface Todo {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  statusId: string;
  status?: TodoStatus;
  priority: TodoPriority;
  position: number;
  dueDate?: string;
  jiraIssueKey?: string;
  jiraIssueUrl?: string;
  jiraSyncStatus: JiraSyncStatus;
  jiraLastSyncedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  externalLinks?: { name: string; url: string }[];
  aiSummary?: string;
  generatedByAi?: boolean;
  attachments?: TodoAttachment[];
  archivedAt?: string;
  archivedBy?: string;
}

export type TodoAttachmentKind = "IMAGE" | "VIDEO";

export interface TodoAttachment {
  id: string;
  todoId: string;
  commentId?: string;
  userId: string;
  kind: TodoAttachmentKind;
  storageKey: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoReq {
  projectId: string;
  title: string;
  description?: string;
  statusId: string;
  priority?: TodoPriority;
  position?: number;
  dueDate?: string;
  tags?: string[];
  externalLinks?: { name: string; url: string }[];
  aiSummary?: string;
  generatedByAi?: boolean;
}

export interface UpdateTodoReq {
  title?: string;
  description?: string;
  statusId?: string;
  priority?: TodoPriority;
  position?: number;
  dueDate?: string;
  tags?: string[];
  externalLinks?: { name: string; url: string }[];
  aiSummary?: string;
  generatedByAi?: boolean;
}

export interface LinkJiraIssueReq {
  jiraIssueKey?: string | null;
}

export interface TodoComment {
  id: string;
  todoId: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    name: string;
    email: string;
    image?: string;
  };
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  attachments?: TodoAttachment[];
}

export interface CreateTodoCommentReq {
  content?: string;
  attachmentKeys?: string[];
}

export interface UpdateTodoCommentReq {
  content?: string;
}

export interface PresignTodoAttachmentReq {
  filename: string;
  mimeType: string;
  size: number;
}

export interface PresignTodoAttachmentRes {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
}

export interface CompleteTodoAttachmentReq {
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  commentId?: string;
}

export type TodoActivityType =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_MOVED"
  | "TASK_DELETED"
  | "TASK_ARCHIVED"
  | "TASK_UNARCHIVED"
  | "JIRA_LINKED"
  | "JIRA_UNLINKED"
  | "JIRA_SYNCED"
  | "JIRA_SYNC_PENDING"
  | "JIRA_SYNC_FAILED"
  | "COMMENT_ADDED"
  | "COMMENT_UPDATED"
  | "COMMENT_DELETED";

export interface TodoActivity {
  id: string;
  todoId: string;
  userId: string;
  user?: {
    id: string;
    username: string;
    name: string;
    email: string;
    image?: string;
  };
  type: TodoActivityType;
  message: string;
  metadata?: {
    changes?: Array<{ field: string; from: unknown; to: unknown }>;
    [key: string]: unknown;
  };
  createdAt: string;
}

export interface ListTodoParams {
  projectId: string;
  page?: number;
  limit?: number;
  q?: string;
  statusId?: string;
  priority?: TodoPriority;
  jiraSyncStatus?: JiraSyncStatus;
  archived?: boolean;
}

export interface ListTodoStatusParams extends PageParams {
  projectId: string;
}

// ─── Jira Integration ──────────────────────────────────

export interface JiraIntegration {
  id: string;
  jiraDomain: string;
  jiraEmail?: string;
  authType: JiraAuthType;
  jiraProjectKey?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertJiraIntegrationReq {
  jiraDomain: string;
  authType: JiraAuthType;
  jiraEmail?: string;
  jiraApiToken?: string;
  jiraProjectKey?: string;
}

export interface JiraTestConnectionRes {
  success: boolean;
  accountId?: string;
  displayName?: string;
}

export interface JiraTransitionMapping {
  id: string;
  todoStatusId: string;
  jiraTransitionId: string;
  jiraTransitionName?: string;
}

export interface UpsertJiraTransitionMappingsReq {
  mappings: Array<{
    todoStatusId: string;
    jiraTransitionId: string;
    jiraTransitionName?: string;
  }>;
}

export interface JiraTransition {
  id: string;
  name: string;
  toStatusId?: string;
  toStatusName?: string;
}

// ─── Post ──────────────────────────────────────────────

export interface Post {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content?: string;
  user: User;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostReq {
  title: string;
  description?: string;
  content?: string;
}

export interface UpdatePostReq {
  title?: string;
  description?: string;
  content?: string;
}

// ─── RAG / Chat ────────────────────────────────────────

export interface Conversation {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ContextChunk {
  chunkId: string;
  sourceId: string;
  distance: number;
  contentPreview: string;
}

export interface ChatRes {
  response: string;
  contextChunks: ContextChunk[];
  toolCalls?: AgentToolCall[];
  pendingConfirmation?: AgentPendingConfirmation;
}

export interface AgentToolCall {
  toolName: string;
  input: unknown;
  output?: unknown;
}

export interface AgentPendingConfirmation {
  toolName: string;
  input: unknown;
  message: string;
}

export interface AgentToolConfirmation {
  approvedToolName: string;
  approvedInput: Record<string, unknown>;
}

export interface ReorderTodosReq {
  projectId: string;
  columns: Array<{
    statusId: string;
    orderedTodoIds: string[];
  }>;
}

export interface SearchResult {
  chunkId: string;
  sourceId: string;
  distance: number;
  contentPreview: string;
}

// ─── Pagination ────────────────────────────────────────

export interface PaginatedRes<T> {
  data: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PageParams {
  page?: number;
  limit?: number;
}
