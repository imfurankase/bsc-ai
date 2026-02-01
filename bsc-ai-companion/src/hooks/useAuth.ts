import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  api,
  setTokens,
  clearTokens,
  getAccessToken,
  isAuthenticated as checkIsAuthenticated
} from '@/lib/api';
import type {
  User,
  TokenResponse,
  RegisterResponse,
  LoginRequest,
  RegisterRequest
} from '@/types/api-types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status and load user profile on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (!checkIsAuthenticated()) {
        setIsLoading(false);
        return;
      }

      // Try to get user profile
      const { data, error } = await api.get<User>('/api/auth/profile/');

      if (error) {
        // Token invalid, clear it
        clearTokens();
        setIsAuthenticated(false);
        setUser(null);
      } else if (data) {
        setUser(data);
        setIsAuthenticated(true);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const signUp = useCallback(async (
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    setIsLoading(true);

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
      setIsLoading(false);
      return { error };
    }

    if (data?.success) {
      toast.success('Account created successfully! Please sign in.');
      setIsLoading(false);
      return { data };
    }

    setIsLoading(false);
    return { error: 'Registration failed' };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    setIsLoading(true);

    const body: LoginRequest = { username, password };
    const { data, error } = await api.post<TokenResponse>('/api/auth/login/', body);

    if (error) {
      toast.error(error);
      setIsLoading(false);
      return { error };
    }

    if (data?.access && data?.refresh) {
      setTokens(data.access, data.refresh);

      // Fetch user profile
      const profileResult = await api.get<User>('/api/auth/profile/');

      if (profileResult.data) {
        setUser(profileResult.data);
        setIsAuthenticated(true);
        toast.success('Welcome back!');
      }

      setIsLoading(false);
      return { data };
    }

    setIsLoading(false);
    return { error: 'Login failed' };
  }, []);

  const signOut = useCallback(async () => {
    clearTokens();
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Signed out successfully');
    return {};
  }, []);

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