import apiClient from './apiClient';
import type {
  LoginReq,
  LoginRes,
  ChangePasswordReq,
  ForgotPasswordReq,
  RefreshRes,
  RegisterReq,
  RegisterRes,
  ResendVerifyEmailReq,
  ResetPasswordReq,
  SuccessRes,
  VerifyForgotPasswordReq,
  VerifyResetRes,
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

  verifyEmail: (token: string) =>
    apiClient.get<SuccessRes>('/auth/verify/email', { params: { token } }).then((r) => r.data),

  resendVerifyEmail: (data: ResendVerifyEmailReq) =>
    apiClient.post<SuccessRes>('/auth/verify/email/resend', data).then((r) => r.data),

  forgotPassword: (data: ForgotPasswordReq) =>
    apiClient.post<SuccessRes>('/auth/forgot-password', data).then((r) => r.data),

  verifyResetToken: (data: VerifyForgotPasswordReq) =>
    apiClient.post<VerifyResetRes>('/auth/verify/forgot-password', data).then((r) => r.data),

  resetPassword: (data: ResetPasswordReq) =>
    apiClient.post<SuccessRes>('/auth/reset-password', data).then((r) => r.data),

  changePassword: (data: ChangePasswordReq) =>
    apiClient.post<SuccessRes>('/users/me/change-password', data).then((r) => r.data),
};
