import apiClient from './apiClient';
import type {
  Todo,
  TodoStatus,
  CreateTodoReq,
  UpdateTodoReq,
  LinkJiraIssueReq,
  ReorderTodosReq,
  CreateTodoStatusReq,
  UpdateTodoStatusReq,
  ListTodoParams,
  ListTodoStatusParams,
  PaginatedRes,
} from './types';

// ─── Todo Status API ───────────────────────────────────

export const todoStatusApi = {
  getAll: (params: ListTodoStatusParams) =>
    apiClient
      .get<PaginatedRes<TodoStatus>>('/todo-statuses', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<TodoStatus>(`/todo-statuses/${id}`).then((r) => r.data),

  create: (data: CreateTodoStatusReq) =>
    apiClient.post<TodoStatus>('/todo-statuses', data).then((r) => r.data),

  update: (id: string, data: UpdateTodoStatusReq) =>
    apiClient.patch<TodoStatus>(`/todo-statuses/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/todo-statuses/${id}`),
};

// ─── Todo API ──────────────────────────────────────────

export const todoApi = {
  getAll: (params?: ListTodoParams) =>
    apiClient
      .get<PaginatedRes<Todo>>('/todos', { params })
      .then((r) => r.data),

  getBoard: (params: ListTodoParams) =>
    apiClient.get<Todo[]>('/todos/board', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Todo>(`/todos/${id}`).then((r) => r.data),

  create: (data: CreateTodoReq) =>
    apiClient.post<Todo>('/todos', data).then((r) => r.data),

  update: (id: string, data: UpdateTodoReq) =>
    apiClient.patch<Todo>(`/todos/${id}`, data).then((r) => r.data),

  linkJiraIssue: (id: string, data: LinkJiraIssueReq) =>
    apiClient.patch<Todo>(`/todos/${id}/jira-link`, data).then((r) => r.data),

  reorder: (data: ReorderTodosReq) =>
    apiClient.patch<void>('/todos/reorder', data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/todos/${id}`),
};
