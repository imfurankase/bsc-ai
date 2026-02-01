import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  api,
  setTokens,
  clearTokens,
  getAccessToken,
  isAuthenticated as checkIsAuthenticated
} from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import type {
  User,
  TokenResponse,
  RegisterResponse,
  LoginRequest,
  RegisterRequest
} from '@/types/api-types';

export const useAuth = () => {
  const {
    isAuthenticated,
    authLoading: isLoading,
    user,
    setAuth,
    setAuthLoading
  } = useAppStore();

  // Check authentication status and load user profile on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!checkIsAuthenticated()) {
        setAuthLoading(false);
        return;
      }

      // Try to get user profile
      const { data, error } = await api.get<User>('/api/auth/profile/');

      if (error) {
        // Token invalid, clear it
        clearTokens();
        setAuth(false, null);
      } else if (data) {
        setAuth(true, data);
      }

      setAuthLoading(false);
    };

    checkAuth();
  }, [setAuth, setAuthLoading]);

  const signUp = useCallback(async (
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    setAuthLoading(true);

    const body: RegisterRequest = {
      username,
      email,
      password,
      password_confirm: password,
      first_name: firstName,
      last_name: lastName,
    };

    const { data, error } = await api.post<RegisterResponse>('/api/auth/register/', body);

    if (error) {
      toast.error(error);
      setAuthLoading(false);
      return { error };
    }

    if (data?.success) {
      toast.success('Account created successfully! Please sign in.');
      setAuthLoading(false);
      return { data };
    }

    setAuthLoading(false);
    return { error: 'Registration failed' };
  }, [setAuthLoading]);

  const signIn = useCallback(async (username: string, password: string) => {
    setAuthLoading(true);

    const body: LoginRequest = { username, password };
    const { data, error } = await api.post<TokenResponse>('/api/auth/login/', body);

    if (error) {
      toast.error(error);
      setAuthLoading(false);
      return { error };
    }

    if (data?.access && data?.refresh) {
      setTokens(data.access, data.refresh);

      // Fetch user profile
      const profileResult = await api.get<User>('/api/auth/profile/');

      if (profileResult.data) {
        setAuth(true, profileResult.data);
        toast.success('Welcome back!');
      }

      setAuthLoading(false);
      return { data };
    }

    setAuthLoading(false);
    return { error: 'Login failed' };
  }, [setAuth, setAuthLoading]);

  const signOut = useCallback(async () => {
    clearTokens();
    setAuth(false, null);
    toast.success('Signed out successfully');
    return {};
  }, [setAuth]);

  // Get current access token (useful for components that need it)
  const getToken = useCallback(() => {
    return getAccessToken();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    getToken,
  };
};