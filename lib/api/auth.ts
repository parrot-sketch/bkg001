/**
 * Authentication API endpoints
 * 
 * Type-safe API client methods for authentication operations.
 */

import { apiClient, ApiResponse } from './client';
import type { LoginDto } from '../../application/dtos/LoginDto';
import type { StoredUser } from '../auth/token';

/**
 * Authentication API client
 * 
 * Bounded context: Login-only authentication (no self-registration).
 * All users are internal and created/admin-managed.
 */
export const authApi = {
  /**
   * Login with email and password
   */
  async login(dto: LoginDto): Promise<ApiResponse<{ user: StoredUser }>> {
    return apiClient.post<{ user: StoredUser }>('/authentication/login', dto);
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<ApiResponse<{ expiresIn: number }>> {
    return apiClient.post<{ expiresIn: number }>('/authentication/refresh');
  },

  /**
   * Restore the current user from the HttpOnly access cookie.
   */
  async session(): Promise<ApiResponse<{ user: StoredUser }>> {
    return apiClient.get<{ user: StoredUser }>('/authentication/session');
  },

  /**
   * Logout current user
   */
  async logout(): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/authentication/logout');
  },
};
