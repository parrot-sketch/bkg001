/**
 * Token Management
 *
 * Manages JWT tokens in the browser.
 *
 * Security model:
 * - The short-lived ACCESS token is stored in a `Secure` + `SameSite` cookie so
 *   it can be attached as a Bearer header by the API client. It is NOT httpOnly
 *   because the SPA must read it to build the Authorization header; it is kept
 *   short-lived (15 minutes) to limit XSS exposure.
 * - The long-lived REFRESH token is NEVER stored on the client. It lives only in
 *   an `httpOnly` + `Secure` + `SameSite` cookie that is set by the server on the
 *   /api/authentication/login and /api/authentication/refresh responses. Because it
 *   is httpOnly, JavaScript (and therefore any XSS payload) cannot read it.
 * - The user object is non-sensitive display data and is kept in localStorage.
 *
 * IMPORTANT: Never log token values. Tokens must only travel in httpOnly cookies
 * or the Authorization header.
 */

const ACCESS_TOKEN_KEY = 'hims_access_token';
const USER_KEY = 'hims_user';

const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes — matches JWT_ACCESS_EXPIRES_IN

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isSecureContext(): boolean {
  return isBrowser() && window.location.protocol === 'https:';
}

function buildCookie(name: string, value: string, maxAgeSec: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAgeSec}`,
    'SameSite=Lax',
  ];
  if (isSecureContext()) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function setCookie(name: string, value: string, maxAgeSec: number): void {
  if (!isBrowser()) return;
  document.cookie = buildCookie(name, value, maxAgeSec);
}

function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const matches = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'),
  );
  return matches ? decodeURIComponent(matches[1]) : null;
}

function deleteCookie(name: string): void {
  if (!isBrowser()) return;
  const parts = [`${name}=`, 'Path=/', 'Max-Age=0', 'SameSite=Lax'];
  if (isSecureContext()) {
    parts.push('Secure');
  }
  document.cookie = parts.join('; ');
}

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
   * Store access token in a Secure + SameSite cookie (short-lived).
   */
  setAccessToken(token: string): void {
    setCookie(ACCESS_TOKEN_KEY, token, ACCESS_TOKEN_MAX_AGE);
  },

  /**
   * Get access token from the Secure + SameSite cookie.
   */
  getAccessToken(): string | null {
    return getCookie(ACCESS_TOKEN_KEY);
  },

  /**
   * Refresh tokens are intentionally NOT stored on the client. They live only in
   * the server-set httpOnly `refreshToken` cookie, which is sent automatically on
   * same-origin requests. This is a no-op so existing call sites stay compatible.
   */
  setRefreshToken(_token: string): void {
    // Intentionally empty — refresh tokens are stored in an httpOnly server cookie.
  },

  /**
   * Refresh tokens are not readable by client JavaScript (httpOnly). Returns null.
   */
  getRefreshToken(): string | null {
    return null;
  },

  /**
   * Store user information (non-sensitive display data) in localStorage.
   */
  setUser(user: StoredUser): void {
    if (isBrowser()) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  /**
   * Get user information from localStorage.
   */
  getUser(): StoredUser | null {
    if (!isBrowser()) return null;
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as StoredUser;
    } catch {
      return null;
    }
  },

  /**
   * Clear client-side auth state.
   *
   * NOTE: The httpOnly `accessToken`/`refreshToken` cookies are cleared by the
   * server on /api/authentication/logout; this only clears the client-readable
   * access-token cookie and the user record.
   */
  clear(): void {
    if (!isBrowser()) return;
    deleteCookie(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  /**
   * Check if the user appears authenticated.
   *
   * Based on the user record (non-expiring) rather than the short-lived access
   * token cookie. If the access token has expired, the API client transparently
   * refreshes via the httpOnly refresh cookie, so we should not treat a missing
   * access token as "logged out".
   */
  isAuthenticated(): boolean {
    return !!this.getUser();
  },
};
