import apiClient from './apiClient';
import type {
  CreateProjectReq,
  InviteProjectMemberReq,
  PaginatedRes,
  PageParams,
  Project,
  ProjectMember,
  UpdateProjectMemberReq,
  UpdateProjectReq,
} from './types';

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

  getMembers: (id: string) =>
    apiClient.get<ProjectMember[]>(`/projects/${id}/members`).then((r) => r.data),

  inviteMember: (id: string, data: InviteProjectMemberReq) =>
    apiClient.post<ProjectMember>(`/projects/${id}/members`, data).then((r) => r.data),

  updateMember: (id: string, memberId: string, data: UpdateProjectMemberReq) =>
    apiClient.patch<ProjectMember>(`/projects/${id}/members/${memberId}`, data).then((r) => r.data),

  removeMember: (id: string, memberId: string) =>
    apiClient.delete(`/projects/${id}/members/${memberId}`),
};
