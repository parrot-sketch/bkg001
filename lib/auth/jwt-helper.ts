/**
 * JWT Authentication Helper
 * 
 * Utility function to authenticate API requests using JWT.
 * This helper instantiates JwtMiddleware with the required dependencies.
 */

import { NextRequest } from 'next/server';
import { JwtMiddleware } from '@/controllers/middleware/JwtMiddleware';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import db from '@/lib/db';

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
 * Authenticate API request using JWT
 * 
 * @param request - Next.js request object
 * @returns Authentication result with user context or error
 */
export async function authenticateRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const user = await jwtMiddleware.authenticate(authHeader || undefined);
    
    return {
      success: true,
      user,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
      user: null,
    };
  }
}
