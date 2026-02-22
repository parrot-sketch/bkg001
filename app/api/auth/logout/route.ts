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
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { AuthFactory } from '@/infrastructure/auth/AuthFactory';
import type { ApiResponse } from '@/lib/api/client';

/**
 * Standardized API error response
 */
type ApiErrorResponse = ApiResponse<never>;

/**
 * POST /api/auth/logout
 * 
 * Handles user logout request with standardized response.
 * 
 * Requires authentication - user must be logged in to logout.
 * 
 * Error Codes:
 * - 401: Authentication required
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiErrorResponse | ApiResponse<{ message: string }>>> {
  // Initialize authentication use cases using factory lazily inside handler
  const { logoutUseCase } = AuthFactory.create(db);

  try {
    // 1. Authenticate request
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: authResult.error || 'Authentication required',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const userId = authResult.user.userId;

    // 2. Execute logout use case
    // This will:
    // - Revoke all refresh tokens for the user
    // - Record audit event
    await logoutUseCase.execute(userId);

    // Create success response with standardized ApiResponse format
    const successResponse: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Logged out successfully' },
    };

    const nextResponse = NextResponse.json(successResponse, { status: 200 });

    // Clear auth cookies
    nextResponse.cookies.delete('accessToken');
    nextResponse.cookies.delete('refreshToken');

    return nextResponse;
  } catch (error: unknown) {
    // Unexpected error - log and return generic error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/auth/logout - Unexpected error:', errorMessage, error);
    
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: 'Internal server error',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
