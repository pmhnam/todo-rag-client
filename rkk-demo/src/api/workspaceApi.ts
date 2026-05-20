import apiClient from './apiClient';
import type {
  AcceptWorkspaceInvitationRes,
  CreateWorkspaceInvitationReq,
  CreateWorkspaceReq,
  PaginatedRes,
  PageParams,
  ProjectMemberPermission,
  UpdateWorkspaceReq,
  Workspace,
  WorkspaceInvitation,
  WorkspaceInvitationPreview,
  WorkspaceMember,
} from './types';

export const workspaceApi = {
  getAll: (params?: PageParams) =>
    apiClient.get<PaginatedRes<Workspace>>('/workspaces', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Workspace>(`/workspaces/${id}`).then((r) => r.data),

  create: (data: CreateWorkspaceReq) =>
    apiClient.post<Workspace>('/workspaces', data).then((r) => r.data),

  update: (id: string, data: UpdateWorkspaceReq) =>
    apiClient.patch<Workspace>(`/workspaces/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/workspaces/${id}`),

  getMembers: (id: string) =>
    apiClient.get<WorkspaceMember[]>(`/workspaces/${id}/members`).then((r) => r.data),

  updateMember: (id: string, memberId: string, permission: ProjectMemberPermission) =>
    apiClient
      .patch<WorkspaceMember>(`/workspaces/${id}/members/${memberId}`, { permission })
      .then((r) => r.data),

  removeMember: (id: string, memberId: string) =>
    apiClient.delete(`/workspaces/${id}/members/${memberId}`),

  transferOwner: (id: string, userId: string) =>
    apiClient.post<void>(`/workspaces/${id}/transfer-owner`, { userId }).then((r) => r.data),

  getInvitations: (id: string) =>
    apiClient.get<WorkspaceInvitation[]>(`/workspaces/${id}/invitations`).then((r) => r.data),

  createInvitation: (id: string, data: CreateWorkspaceInvitationReq) =>
    apiClient.post<WorkspaceInvitation>(`/workspaces/${id}/invitations`, data).then((r) => r.data),

  revokeInvitation: (id: string, invitationId: string) =>
    apiClient.delete(`/workspaces/${id}/invitations/${invitationId}`),
};

export const workspaceInvitationApi = {
  preview: (token: string) =>
    apiClient
      .get<WorkspaceInvitationPreview>('/workspace-invitations/preview', { params: { token } })
      .then((r) => r.data),

  accept: (token: string) =>
    apiClient
      .post<AcceptWorkspaceInvitationRes>('/workspace-invitations/accept', { token })
      .then((r) => r.data),
};
