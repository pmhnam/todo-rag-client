import apiClient from './apiClient';
import type {
  CompleteAvatarReq,
  PaginatedRes,
  PageParams,
  PresignAvatarReq,
  PresignAvatarRes,
  UpdateMeReq,
  User,
} from './types';

export const userApi = {
  me: () => apiClient.get<User>('/users/me').then((r) => r.data),

  getAll: (params?: PageParams) =>
    apiClient
      .get<PaginatedRes<User>>('/users', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<User>(`/users/${id}`).then((r) => r.data),

  updateMe: (data: UpdateMeReq) =>
    apiClient.patch<User>('/users/me', data).then((r) => r.data),

  presignAvatar: (data: PresignAvatarReq) =>
    apiClient.post<PresignAvatarRes>('/users/me/avatar/presign', data).then((r) => r.data),

  uploadAvatar: async (uploadUrl: string, file: File, headers: Record<string, string>) => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Avatar upload failed (${response.status}): ${errorText}`);
    }
  },

  completeAvatar: (data: CompleteAvatarReq) =>
    apiClient.post<User>('/users/me/avatar/complete', data).then((r) => r.data),
};
