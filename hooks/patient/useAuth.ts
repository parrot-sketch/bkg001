/**
 * Authentication Hook
 * 
 * React hook for managing user authentication state and operations.
 * Provides a clean, maintainable interface for authentication in the application.
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
 * Configures the API client with authentication token providers.
 * This is extracted to avoid duplication.
 */
function configureApiClient(): void {
  // Set token provider
  apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());

  // Set refresh token provider
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

/**
 * Custom hook for authentication
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state from storage
  useEffect(() => {
    const storedUser = tokenStorage.getUser();
    const accessToken = tokenStorage.getAccessToken();

    if (storedUser && accessToken) {
      setUser(storedUser);
      configureApiClient();
    }

    setIsLoading(false);
  }, []);

  /**
   * Login function
   */
  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });

    if (!response.success) {
      throw new Error(response.error || 'Login failed');
    }

    // Store tokens and user data
    tokenStorage.setAccessToken(response.data.accessToken);
    tokenStorage.setRefreshToken(response.data.refreshToken);
    tokenStorage.setUser(response.data.user);

    // Configure API client
    configureApiClient();

    // Update state
    setUser(response.data.user);
  }, []);

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
      const response = await authApi.register(dto);

      if (!response.success) {
        throw new Error(response.error || 'Registration failed');
      }

      // User must login after registration
    },
    []
  );

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    try {
      if (tokenStorage.isAuthenticated()) {
        await authApi.logout();
      }
    } catch (error) {
      // Log error but continue with logout
      console.error('Logout API call failed:', error);
    } finally {
      tokenStorage.clear();
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  /**
   * Refresh token function
   */
  const refreshToken = useCallback(async () => {
    const refreshTokenValue = tokenStorage.getRefreshToken();

    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }

    const response = await authApi.refreshToken({ refreshToken: refreshTokenValue });

    if (!response.success) {
      // If refresh fails, logout user
      await logout();
      throw new Error(response.error || 'Token refresh failed');
    }

    // Update tokens
    tokenStorage.setAccessToken(response.data.accessToken);
    tokenStorage.setRefreshToken(response.data.refreshToken);
    apiClient.setAuthTokenProvider(() => tokenStorage.getAccessToken());
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
