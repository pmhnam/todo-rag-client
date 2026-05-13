import apiClient from './apiClient';
import type { PaginatedRes, PageParams, Project, CreateProjectReq, UpdateProjectReq } from './types';

export const projectApi = {
  getAll: (params?: PageParams) =>
    apiClient
      .get<PaginatedRes<Project>>('/projects', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Project>(`/projects/${id}`).then((r) => r.data),

  create: (data: CreateProjectReq) =>
    apiClient.post<Project>('/projects', data).then((r) => r.data),

  update: (id: string, data: UpdateProjectReq) =>
    apiClient.patch<Project>(`/projects/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/projects/${id}`),
};
