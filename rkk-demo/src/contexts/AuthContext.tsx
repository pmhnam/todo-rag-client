import React, { useState, useEffect, useCallback } from "react";
import {
  clearAuthTokens,
  refreshAuthTokens,
  setAuthTokens,
  shouldRefreshAccessToken,
} from "../api/apiClient";
import { authApi } from "../api/authApi";
import { userApi } from "../api/userApi";
import type { User } from "../api/types";
import { AuthContext } from "./authContext";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!token && !refreshToken) {
      setIsLoading(false);
      return;
    }

    try {
      if (shouldRefreshAccessToken()) {
        await refreshAuthTokens();
      }

      const userData = await userApi.me();
      setUser(userData);
    } catch {
      clearAuthTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setAuthTokens(res);
    const userData = await userApi.me();
    setUser(userData);
  };

  const googleLogin = async (idToken: string) => {
    const res = await authApi.googleLogin({ idToken });
    setAuthTokens(res);
    const userData = await userApi.me();
    setUser(userData);
  };

  const register = async (name: string, email: string, password: string) => {
    await authApi.register({ name, email, password });
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    } finally {
      clearAuthTokens();
      setUser(null);
    }
  };

  const refreshUser = async () => {
    const userData = await userApi.me();
    setUser(userData);
  };

  const setCurrentUser = (nextUser: User) => {
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        googleLogin,
        register,
        refreshUser,
        setCurrentUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
