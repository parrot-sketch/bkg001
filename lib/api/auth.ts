/**
 * Authentication API client
 *
 * Thin wrapper around the same-origin BFF auth endpoints. The client never
 * touches JWTs: cookies are attached automatically by the browser and the
 * refresh call is a raw fetch so it cannot re-enter the API client's 401 logic.
 */

import { apiClient, type ApiResponse } from './client';
import type { LoginDto, LoginResponseDto } from '@/application/dtos/LoginDto';

/**
 * Minimal identity returned by GET /api/authentication/session. No JWTs.
 */
export interface SessionUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  status?: string;
}

export const authApi = {
  /**
   * Login. Server sets httpOnly access/refresh cookies and returns `user`
   * (no tokens in the JSON body).
   */
  async login(dto: LoginDto): Promise<ApiResponse<LoginResponseDto>> {
    return apiClient.post<LoginResponseDto>('/authentication/login', dto);
  },

  /**
   * Refresh the session. Uses the httpOnly refresh cookie automatically; the
   * server issues new cookies. Performed as a raw fetch so a failed refresh
   * cannot trigger the API client's own 401/refresh recursion.
   */
  async refreshToken(): Promise<ApiResponse<void>> {
    const res = await fetch('/api/authentication/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    let data: any = null;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      return {
        success: false,
        error: data?.error || 'Session refresh failed',
        status: res.status,
      };
    }

    return { success: true, data: undefined as void };
  },

  /**
   * Restore session state from the server using the access-token cookie.
   */
  async getSession(): Promise<ApiResponse<SessionUser>> {
    return apiClient.get<SessionUser>('/authentication/session');
  },

  /**
   * Logout. Server revokes the refresh token and clears the auth cookies.
   */
  async logout(): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/authentication/logout');
  },
};
