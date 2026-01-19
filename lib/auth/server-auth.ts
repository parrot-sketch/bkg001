/**
 * Server-side authentication helpers
 * 
 * For use in Next.js server components and server actions.
 * Gets authenticated user from JWT token stored in cookies.
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

    // Verify token and get user
    const user = await jwtMiddleware.authenticate(`Bearer ${accessToken}`);
    return user || null;
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
