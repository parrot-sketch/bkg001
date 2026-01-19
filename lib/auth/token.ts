/**
 * Token Management
 * 
 * Utilities for managing JWT tokens in the browser (localStorage).
 */

const ACCESS_TOKEN_KEY = 'hims_access_token';
const REFRESH_TOKEN_KEY = 'hims_refresh_token';
const USER_KEY = 'hims_user';

export interface StoredUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Token storage utilities
 */
export const tokenStorage = {
  /**
   * Store access token
   */
  setAccessToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
  },

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
  },

  /**
   * Store refresh token
   */
  setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  },

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  },

  /**
   * Store user information
   */
  setUser(user: StoredUser): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  /**
   * Get user information
   */
  getUser(): StoredUser | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem(USER_KEY);
      if (!userStr) {
        return null;
      }
      try {
        return JSON.parse(userStr) as StoredUser;
      } catch {
        return null;
      }
    }
    return null;
  },

  /**
   * Clear all tokens and user data
   */
  clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },
};
