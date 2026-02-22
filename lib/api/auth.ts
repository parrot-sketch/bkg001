/**
 * Authentication API endpoints
 * 
 * Type-safe API client methods for authentication operations.
 */

import { apiClient, ApiResponse } from './client';
import type { LoginDto, LoginResponseDto } from '../../application/dtos/LoginDto';
import type { RefreshTokenDto, RefreshTokenResponseDto } from '../../application/dtos/RefreshTokenDto';

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
  async login(dto: LoginDto): Promise<ApiResponse<LoginResponseDto>> {
    return apiClient.post<LoginResponseDto>('/auth/login', dto);
  },

  /**
   * Refresh access token
   */
  async refreshToken(dto: RefreshTokenDto): Promise<ApiResponse<RefreshTokenResponseDto>> {
    return apiClient.post<RefreshTokenResponseDto>('/auth/refresh', dto);
  },

  /**
   * Logout current user
   */
  async logout(): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/auth/logout');
  },
};
