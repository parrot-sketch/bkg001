/**
 * API Route: POST /api/auth/logout
 * 
 * User logout endpoint.
 * 
 * Logs out the current user by revoking refresh tokens and recording audit event.
 * 
 * Security:
 * - Requires authentication (user must be logged in)
 * - Revokes all refresh tokens for the user
 * - Records audit event for logout
 * - Access tokens remain valid until expiration (stateless JWT)
 */

import { NextRequest, NextResponse } from 'next/server';
import { LogoutUseCase } from '@/application/use-cases/LogoutUseCase';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';

// Initialize dependencies (singleton pattern)
const userRepository = new PrismaUserRepository(db);
const auditService = new ConsoleAuditService();

// JWT Auth Service configuration
const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
  accessTokenExpiresIn: 15 * 60, // 15 minutes
  refreshTokenExpiresIn: 7 * 24 * 60 * 60, // 7 days
  saltRounds: 10,
};

const authService = new JwtAuthService(userRepository, db, authConfig);

// Initialize use case
const logoutUseCase = new LogoutUseCase(
  authService,
  auditService,
);

/**
 * POST /api/auth/logout
 * 
 * Handles user logout request.
 * 
 * Requires authentication - user must be logged in to logout.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate request
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Authentication required',
        },
        { status: 401 }
      );
    }

    const userId = authResult.user.userId;

    // 2. Execute logout use case
    // This will:
    // - Revoke all refresh tokens for the user
    // - Record audit event
    await logoutUseCase.execute(userId);

    // 3. Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Unexpected error - log and return generic error
    console.error('[API] /api/auth/logout - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
