import apiClient from './apiClient';
import type {
  LoginReq,
  LoginRes,
  RefreshRes,
  RegisterReq,
  RegisterRes,
} from './types';

export const authApi = {
  login: (data: LoginReq) =>
    apiClient.post<LoginRes>('/auth/email/login', data).then((r) => r.data),

  register: (data: RegisterReq) =>
    apiClient.post<RegisterRes>('/auth/email/register', data).then((r) => r.data),

  logout: () => apiClient.post('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    apiClient
      .post<RefreshRes>('/auth/refresh', { refreshToken })
      .then((r) => r.data),
};
