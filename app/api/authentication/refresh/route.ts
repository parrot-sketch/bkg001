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
import { RefreshTokenDto, refreshTokenDtoSchema, RefreshTokenResponseDto } from '@/application/dtos/RefreshTokenDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { AuthFactory } from '@/infrastructure/auth/AuthFactory';
import type { ApiResponse } from '@/lib/api/client';

/**
 * Standardized API error response
 */
type ApiErrorResponse = ApiResponse<never>;

/**
 * POST /api/auth/refresh
 * 
 * Handles token refresh request with Zod validation and standardized response.
 * 
 * Error Codes:
 * - 400: Invalid request (malformed JSON, validation errors)
 * - 401: Invalid or expired refresh token
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiErrorResponse | ApiResponse<RefreshTokenResponseDto>>> {
  // Initialize authentication use cases using factory lazily inside handler
  const { refreshTokenUseCase } = AuthFactory.create(db);

  try {
    // Parse request body
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch (error) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Invalid JSON in request body',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate with Zod schema
    const validationResult = refreshTokenDtoSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: firstError?.message || 'Invalid request data',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const body: RefreshTokenDto = validationResult.data;

    // Execute refresh token use case
    const response = await refreshTokenUseCase.execute({
      refreshToken: body.refreshToken,
    });

    // Validate response structure
    if (!response || !response.accessToken || !response.refreshToken) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Internal server error: Invalid response from authentication service',
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // Create success response with standardized ApiResponse format
    const successResponse: ApiResponse<RefreshTokenResponseDto> = {
      success: true,
      data: response,
    };

    const nextResponse = NextResponse.json(successResponse, { status: 200 });

    // Set access token cookie on the response
    const safeExpiresIn = typeof response.expiresIn === 'number' ? response.expiresIn : 900;

    nextResponse.cookies.set('accessToken', response.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: safeExpiresIn,
    });

    // Also persist new refresh token as httpOnly cookie for server-side silent refresh
    nextResponse.cookies.set('refreshToken', response.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days (matches refresh token lifetime)
    });

    return nextResponse;
  } catch (error: unknown) {
    // Handle domain exceptions (e.g., invalid or expired refresh token)
    if (error instanceof DomainException) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: error.message || 'Invalid or expired refresh token',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Unexpected error - log and return generic error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/auth/refresh - Unexpected error:', errorMessage, error);
    
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: 'Internal server error',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
