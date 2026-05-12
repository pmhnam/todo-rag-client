import apiClient from './apiClient';
import type {
  Post,
  CreatePostReq,
  UpdatePostReq,
  PaginatedRes,
  PageParams,
} from './types';

export const postApi = {
  getAll: (params?: PageParams) =>
    apiClient
      .get<PaginatedRes<Post>>('/posts', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Post>(`/posts/${id}`).then((r) => r.data),

  create: (data: CreatePostReq) =>
    apiClient.post<Post>('/posts', data).then((r) => r.data),

  update: (id: string, data: UpdatePostReq) =>
    apiClient.patch<Post>(`/posts/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/posts/${id}`),
};
