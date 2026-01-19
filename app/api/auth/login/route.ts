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
import { LoginUseCase } from '@/application/use-cases/LoginUseCase';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { LoginDto } from '@/application/dtos/LoginDto';
import { DomainException } from '@/domain/exceptions/DomainException';

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
const loginUseCase = new LoginUseCase(
  authService,
  userRepository,
  auditService,
);

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

    // Execute login use case
    const response = await loginUseCase.execute({
      email: body.email,
      password: body.password,
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
