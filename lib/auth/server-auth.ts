/**
 * Server-side authentication helpers
 * 
 * For use in Next.js server components and server actions.
 * Gets authenticated user from JWT token stored in cookies.
 * 
 * Does NOT silently refresh expired tokens. Expired or invalid tokens
 * return null, and the client is responsible for refreshing via
 * /api/auth/refresh or apiClient's 401 handler. This prevents
 * cookie/localStorage desync when server-side refresh succeeds but
 * the updated cookie cannot be persisted in Server Components.
 */

import { cookies } from 'next/headers';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { getAuthConfig } from '@/infrastructure/auth/AuthFactory';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import db from '@/lib/db';
import { AuthContext } from '@/lib/auth/types';

// Initialize auth service using centralized config
const userRepository = new PrismaUserRepository(db);
const authConfig = getAuthConfig();
const authService = new JwtAuthService(userRepository, db, authConfig);
const jwtMiddleware = new JwtMiddleware(authService);

// Request-scoped cache for getCurrentUser().
// Keyed by access token so repeated calls within the same request
// (or across requests with the same token) return the cached result
// without re-verifying the JWT.
const currentUserCache = new Map<string, AuthContext | null>();

/**
 * Get current authenticated user from server-side (server components)
 * 
 * Reads JWT token from cookies and verifies it.
 * Returns null if no valid access token cookie is present.
 * 
 * Note: Does NOT silently refresh expired tokens. The client is
 * responsible for token refresh to avoid cookie/localStorage desync.
 * 
 * @returns User context or null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthContext | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (!accessToken) {
      return null;
    }

    // Return cached result if we've already verified this token
    const cached = currentUserCache.get(accessToken);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const user = await jwtMiddleware.authenticate(`Bearer ${accessToken}`);
      currentUserCache.set(accessToken, user);
      return user;
    } catch {
      // Access token is invalid/expired — cache the miss and return null
      currentUserCache.set(accessToken, null);
      return null;
    }
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Explicitly refresh the access token using the refresh token cookie.
 * 
 * Use this in Route Handlers and Server Actions where cookies can be
 * persisted. Returns the new tokens on success, or null on failure.
 * 
 * @returns New tokens or null if refresh failed
 */
export async function refreshServerSession(): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (!refreshToken) {
      return null;
    }

    const tokens = await authService.refreshToken(refreshToken);

    try {
      cookieStore.set('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: tokens.expiresIn,
      });

      cookieStore.set('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    } catch {
      // Route Handler / Server Action context where cookies are writable
      // If this throws, the caller should handle the error
      throw new Error('Failed to persist refreshed tokens');
    }

    return tokens;
  } catch (error) {
    console.error('Server session refresh failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Get current user with full user data from database
 * 
 * @returns User object with all fields or null
 */
export async function getCurrentUserFull() {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: authUser.userId },
      include: {
        doctor_profile: true,
        patient_profile: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Error getting current user full:', error);
    return null;
  }
}
