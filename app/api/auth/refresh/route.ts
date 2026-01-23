/**
 * API Route: POST /api/auth/refresh
 * 
 * Token refresh endpoint.
 * 
 * Refreshes an expired access token using a valid refresh token.
 * 
 * Security:
 * - Refresh tokens are verified before use
 * - Invalid or expired refresh tokens are rejected
 * - Revoked refresh tokens are rejected
 * - No authentication required (this endpoint uses refresh token for auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { RefreshTokenDto } from '@/application/dtos/RefreshTokenDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { AuthFactory } from '@/infrastructure/auth/AuthFactory';

// Initialize authentication use cases using factory
const { refreshTokenUseCase } = AuthFactory.create(db);

/**
 * POST /api/auth/refresh
 * 
 * Handles token refresh request.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let body: RefreshTokenDto;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body || !body.refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Refresh token is required',
        },
        { status: 400 }
      );
    }

    // Execute refresh token use case
    const response = await refreshTokenUseCase.execute({
      refreshToken: body.refreshToken,
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle domain exceptions (e.g., invalid or expired refresh token)
    if (error instanceof DomainException) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 401 }
      );
    }

    // Unexpected error - log and return generic error
    console.error('[API] /api/auth/refresh - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
