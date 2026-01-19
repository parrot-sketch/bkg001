/**
 * Authentication API endpoints
 * 
 * Type-safe API client methods for authentication operations.
 */

import { apiClient, ApiResponse } from './client';
import type { LoginDto, LoginResponseDto } from '../../application/dtos/LoginDto';
import type { RegisterUserDto, RegisterUserResponseDto } from '../../application/dtos/RegisterUserDto';
import type { RefreshTokenDto, RefreshTokenResponseDto } from '../../application/dtos/RefreshTokenDto';

/**
 * Authentication API client
 */
export const authApi = {
  /**
   * Login with email and password
   */
  async login(dto: LoginDto): Promise<ApiResponse<LoginResponseDto>> {
    return apiClient.post<LoginResponseDto>('/auth/login', dto);
  },

  /**
   * Register a new user
   */
  async register(dto: RegisterUserDto): Promise<ApiResponse<RegisterUserResponseDto>> {
    return apiClient.post<RegisterUserResponseDto>('/auth/register', dto);
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
