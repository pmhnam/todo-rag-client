// ─── Enums ─────────────────────────────────────────────

export const TodoPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;
export type TodoPriority = (typeof TodoPriority)[keyof typeof TodoPriority];

export const JiraSyncStatus = {
  NOT_LINKED: 'NOT_LINKED',
  SYNCED: 'SYNCED',
  PENDING: 'PENDING',
  FAILED: 'FAILED',
} as const;
export type JiraSyncStatus = (typeof JiraSyncStatus)[keyof typeof JiraSyncStatus];

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
  email: string;
  password: string;
}

export interface RegisterRes {
  userId: string;
}

export interface RefreshReq {
  refreshToken: string;
}

export type RefreshRes = Omit<LoginRes, 'userId'>;

// ─── User ──────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  bio?: string;
  image: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectReq {
  name: string;
  description?: string;
}

export interface UpdateProjectReq {
  name?: string;
  description?: string;
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
}

export interface CreateTodoReq {
  projectId: string;
  title: string;
  description?: string;
  statusId: string;
  priority?: TodoPriority;
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
  dueDate?: string;
  tags?: string[];
  externalLinks?: { name: string; url: string }[];
  aiSummary?: string;
  generatedByAi?: boolean;
}

export interface ListTodoParams {
  projectId: string;
  page?: number;
  limit?: number;
  statusId?: string;
  priority?: TodoPriority;
  jiraSyncStatus?: JiraSyncStatus;
}

export interface ListTodoStatusParams extends PageParams {
  projectId: string;
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
  role: 'user' | 'assistant';
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
