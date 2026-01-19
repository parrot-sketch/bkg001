/**
 * Authentication Hook
 * 
 * React hook for managing user authentication state and operations.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../lib/api/auth';
import { tokenStorage, type StoredUser } from '../../lib/auth/token';
import { apiClient } from '../../lib/api/client';
import { Role } from '../../domain/enums/Role';

interface UseAuthReturn {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (dto: {
    id: string;
    email: string;
    password: string;
    role: Role;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

/**
 * Custom hook for authentication
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state and refresh token provider
  useEffect(() => {
    const storedUser = tokenStorage.getUser();
    const accessToken = tokenStorage.getAccessToken();

    if (storedUser && accessToken) {
      setUser(storedUser);
      
      // Configure API client to use token
      apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());
      
      // Configure API client to refresh token on 401 errors
      apiClient.setRefreshTokenProvider(async () => {
        const refreshTokenValue = tokenStorage.getRefreshToken();
        if (!refreshTokenValue) {
          throw new Error('No refresh token available');
        }
        const response = await authApi.refreshToken({ refreshToken: refreshTokenValue });
        if (!response.success) {
          throw new Error(response.error || 'Token refresh failed');
        }
        tokenStorage.setAccessToken(response.data.accessToken);
        tokenStorage.setRefreshToken(response.data.refreshToken);
        apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());
      });
    }

    setIsLoading(false);
  }, []);

  /**
   * Login function
   */
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await authApi.login({ email, password });

        if (!response.success) {
          throw new Error(response.error || 'Login failed');
        }

        // Store tokens and user data
        tokenStorage.setAccessToken(response.data.accessToken);
        tokenStorage.setRefreshToken(response.data.refreshToken);
        tokenStorage.setUser(response.data.user);

        // Configure API client
        apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());
        
        // Configure refresh token provider
        apiClient.setRefreshTokenProvider(async () => {
          const refreshTokenValue = tokenStorage.getRefreshToken();
          if (!refreshTokenValue) {
            throw new Error('No refresh token available');
          }
          const refreshResponse = await authApi.refreshToken({ refreshToken: refreshTokenValue });
          if (!refreshResponse.success) {
            throw new Error(refreshResponse.error || 'Token refresh failed');
          }
          tokenStorage.setAccessToken(refreshResponse.data.accessToken);
          tokenStorage.setRefreshToken(refreshResponse.data.refreshToken);
          apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());
        });

        // Update state
        setUser(response.data.user);
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  /**
   * Register function
   */
  const register = useCallback(
    async (dto: {
      id: string;
      email: string;
      password: string;
      role: Role;
      firstName?: string;
      lastName?: string;
      phone?: string;
    }) => {
      try {
        const response = await authApi.register(dto);

        if (!response.success) {
          throw new Error(response.error || 'Registration failed');
        }

        // After registration, user needs to login
        // Or we could auto-login them here
        // For now, just return - they'll need to login
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    try {
      // Call logout API if authenticated
      if (tokenStorage.isAuthenticated()) {
        await authApi.logout();
      }
    } catch (error) {
      // Even if API call fails, clear local storage
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage
      tokenStorage.clear();
      setUser(null);
      router.push('/patient/login');
    }
  }, [router]);

  /**
   * Refresh token function
   */
  const refreshToken = useCallback(async () => {
    try {
      const refreshTokenValue = tokenStorage.getRefreshToken();

      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const response = await authApi.refreshToken({ refreshToken: refreshTokenValue });

      if (!response.success) {
        throw new Error(response.error || 'Token refresh failed');
      }

      // Update access token
      tokenStorage.setAccessToken(response.data.accessToken);
      tokenStorage.setRefreshToken(response.data.refreshToken);

      // Update API client
      apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());
    } catch (error) {
      // If refresh fails, logout user
      await logout();
      throw error;
    }
  }, [logout]);

  return {
    user,
    isAuthenticated: !!user && tokenStorage.isAuthenticated(),
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };
}
