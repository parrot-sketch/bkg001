/**
 * Server-side authentication helpers
 * 
 * For use in Next.js server components and server actions.
 * Gets authenticated user from JWT token stored in cookies.
 * 
 * Supports silent token refresh: if the access token is expired but
 * a valid refresh token cookie exists, a new access token is generated
 * transparently and the cookie is updated.
 */

import { cookies } from 'next/headers';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import db from '@/lib/db';
import { AuthContext } from '@/lib/auth/types';

// Initialize auth service (singleton pattern)
const userRepository = new PrismaUserRepository(db);

const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
  accessTokenExpiresIn: 15 * 60, // 15 minutes
  refreshTokenExpiresIn: 7 * 24 * 60 * 60, // 7 days
  saltRounds: 10,
};

const authService = new JwtAuthService(userRepository, db, authConfig);
const jwtMiddleware = new JwtMiddleware(authService);

/**
 * Get current authenticated user from server-side (server components)
 * 
 * Reads JWT token from cookies and verifies it.
 * If the access token is expired, attempts a silent refresh using
 * the refresh token cookie.
 * 
 * @returns User context or null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthContext | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;

    if (accessToken) {
      try {
        // Try to verify the access token
        const user = await jwtMiddleware.authenticate(`Bearer ${accessToken}`);
        if (user) return user;
      } catch {
        // Access token is invalid/expired — fall through to refresh
      }
    }

    // ── Silent Refresh ──────────────────────────────────────────────
    // Access token missing or expired. Try to refresh using the
    // refresh token stored in the httpOnly cookie.
    const refreshToken = cookieStore.get('refreshToken')?.value;
    if (!refreshToken) {
      // No refresh token available — truly unauthenticated
      return null;
    }

    try {
      // Use the auth service to exchange the refresh token for new tokens
      const tokens = await authService.refreshToken(refreshToken);

      // Verify the new access token FIRST to get the user context.
      // This must happen before cookie writes, because cookies().set()
      // throws in Server Components (read-only context). We still want
      // to return the authenticated user even if cookies can't be persisted.
      const user = await jwtMiddleware.authenticate(`Bearer ${tokens.accessToken}`);

      // Try to persist updated cookies. This succeeds in Route Handlers
      // and Server Actions but will throw in Server Components — that's
      // acceptable because the user is already authenticated for this request.
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
        // Server Component context — cookies are read-only.
        // The user is authenticated for this request; cookies will be
        // refreshed on the next API call or navigation through a
        // Route Handler / Server Action.
      }

      return user || null;
    } catch (refreshError) {
      // Refresh token is also invalid/expired — truly unauthenticated
      console.error('Silent token refresh failed:', refreshError instanceof Error ? refreshError.message : refreshError);
      return null;
    }
  } catch (error) {
    console.error('Error getting current user:', error);
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
