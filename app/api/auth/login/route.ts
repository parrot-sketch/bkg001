/**
 * API Route: POST /api/auth/login
 * 
 * User authentication endpoint.
 * 
 * Authenticates a user with email and password, returning JWT tokens.
 * 
 * Security:
 * - Generic error messages (no user enumeration)
 * - Password verification via secure hashing
 * - JWT tokens with proper expiration
 * - Audit logging for all login attempts
 */

import { NextRequest, NextResponse } from 'next/server';
import db, { withRetry } from '@/lib/db';
import { LoginDto, loginDtoSchema, LoginResponseDto } from '@/application/dtos/LoginDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { AuthFactory } from '@/infrastructure/auth/AuthFactory';
import type { ApiResponse } from '@/lib/api/client';

/**
 * Standardized API error response
 */
type ApiErrorResponse = ApiResponse<never>;

/**
 * POST /api/auth/login
 * 
 * Handles user login request with Zod validation and standardized response.
 * 
 * Error Codes:
 * - 400: Invalid request (malformed JSON, validation errors)
 * - 401: Invalid credentials (generic message to prevent user enumeration)
 * - 429: Rate limit exceeded (if implemented)
 * - 500: Internal server error
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiErrorResponse | ApiResponse<LoginResponseDto>>> {
  // Initialize authentication use cases using factory lazily inside handler
  const { loginUseCase } = AuthFactory.create(db);

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
    const validationResult = loginDtoSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: firstError?.message || 'Invalid request data',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const body: LoginDto = validationResult.data;

    // Execute login use case with retry logic for connection errors
    const response = await withRetry(async () => {
      return await loginUseCase.execute({
        email: body.email,
        password: body.password,
      });
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
    const successResponse: ApiResponse<LoginResponseDto> = {
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

    // Also persist refresh token as httpOnly cookie for server-side silent refresh
    nextResponse.cookies.set('refreshToken', response.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days (matches refresh token lifetime)
    });

    return nextResponse;
  } catch (error: unknown) {
    // Check if this is a database connection error
    const isConnectionError = 
      error instanceof Error && 
      ((error as any).isConnectionError || 
       error.message.includes('fetch failed') ||
       error.message.includes('Cannot fetch data from service') ||
       error.message.includes('Connection') ||
       error.message.includes("Can't reach database"));

    if (isConnectionError) {
      // Database connection error - show appropriate message
      const errorMessage = error instanceof Error ? error.message : 'Database connection failed';
      console.error('[API] /api/auth/login - Database connection error:', errorMessage, error);
      
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Unable to connect to the database. Please try again in a moment or contact support if the problem persists.',
      };
      return NextResponse.json(errorResponse, { status: 503 }); // 503 Service Unavailable
    }

    // Handle domain exceptions (e.g., invalid credentials)
    if (error instanceof DomainException) {
      // Generic error message - prevents user enumeration
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: 'Invalid email or password. Please try again.',
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Unexpected error - log and return generic error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] /api/auth/login - Unexpected error:', errorMessage, error);
    
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
