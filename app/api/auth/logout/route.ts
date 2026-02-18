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
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { AuthFactory } from '@/infrastructure/auth/AuthFactory';

/**
 * POST /api/auth/logout
 * 
 * Handles user logout request.
 * 
 * Requires authentication - user must be logged in to logout.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Initialize authentication use cases using factory lazily inside handler
  const { logoutUseCase } = AuthFactory.create(db);

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

    // Create response
    const nextResponse = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    );

    // Clear auth cookies
    nextResponse.cookies.delete('accessToken');
    nextResponse.cookies.delete('refreshToken');

    return nextResponse;
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
