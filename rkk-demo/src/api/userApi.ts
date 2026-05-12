import apiClient from './apiClient';
import type { User, PaginatedRes, PageParams } from './types';

export const userApi = {
  me: () => apiClient.get<User>('/users/me').then((r) => r.data),

  getAll: (params?: PageParams) =>
    apiClient
      .get<PaginatedRes<User>>('/users', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<User>(`/users/${id}`).then((r) => r.data),
};
