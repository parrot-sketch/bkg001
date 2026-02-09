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
import { cookies } from 'next/headers';
import db, { withRetry } from '@/lib/db';
import { LoginDto } from '@/application/dtos/LoginDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { AuthFactory } from '@/infrastructure/auth/AuthFactory';

// Initialize authentication use cases using factory
const { loginUseCase } = AuthFactory.create(db);

/**
 * POST /api/auth/login
 * 
 * Handles user login request.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let body: LoginDto;
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
    if (!body || !body.email || !body.password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and password are required',
        },
        { status: 400 }
      );
    }

    // Execute login use case with retry logic for connection errors
    const response = await withRetry(async () => {
      return await loginUseCase.execute({
        email: body.email,
        password: body.password,
      });
    });

    // Create response with JSON data
    const nextResponse = NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );

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
  } catch (error: any) {
    // Handle domain exceptions (e.g., invalid credentials)
    if (error instanceof DomainException) {
      // Generic error message - prevents user enumeration
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password. Please try again.',
        },
        { status: 401 }
      );
    }

    // Unexpected error - log and return generic error
    console.error('[API] /api/auth/login - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
