import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenExpires: number;
};

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const API_BASE_URL =
  window.__RKK_DEMO_CONFIG__?.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:3000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthTokens = (tokens: AuthTokens) => {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  localStorage.setItem('tokenExpires', String(tokens.tokenExpires));
};

export const clearAuthTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpires');
};

export const shouldRefreshAccessToken = () => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const tokenExpires = Number(localStorage.getItem('tokenExpires'));

  if (!refreshToken) return false;
  if (!accessToken) return true;
  if (!tokenExpires) return false;

  return Date.now() >= tokenExpires - 30_000;
};

export const refreshAuthTokens = async () => {
  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }

  const { data } = await axios.post<AuthTokens>(`${API_BASE_URL}/auth/refresh`, {
    refreshToken,
  });

  setAuthTokens(data);

  return data;
};

// ─── Request Interceptor: Attach JWT token ─────────────

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor: Handle 401 → refresh token ──

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error || !token) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    // Skip refresh logic for auth endpoints
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        clearAuthTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const data = await refreshAuthTokens();

        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
