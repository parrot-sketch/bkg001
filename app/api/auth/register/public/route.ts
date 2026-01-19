/**
 * API Route: POST /api/auth/register/public
 * 
 * Public user registration endpoint (self-signup).
 * No authentication required - anyone can create an account.
 * 
 * Security:
 * - Role is always PATIENT (enforced by RegisterPublicUserUseCase)
 * - UUID generated server-side
 * - Password strength enforced via Password value object
 * - Generic error messages (no user enumeration)
 * 
 * Clean Architecture:
 * - Route handler wires up infrastructure dependencies
 * - Delegates business logic to RegisterPublicUserUseCase
 * - Returns standardized API responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { RegisterPublicUserUseCase } from '@/application/use-cases/RegisterPublicUserUseCase';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { PublicRegisterUserDto } from '@/application/dtos/PublicRegisterUserDto';
import { ControllerRequest, ControllerResponse } from '@/lib/auth/types';
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
const registerPublicUserUseCase = new RegisterPublicUserUseCase(
  authService,
  userRepository,
  auditService,
);

/**
 * POST /api/auth/register/public
 * 
 * Handles public user registration.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let body: PublicRegisterUserDto;
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

    // Build controller request (no auth required for public signup)
    const controllerRequest: ControllerRequest = {
      body,
      // No auth property - this is a public endpoint
    };

    // Execute use case via AuthController pattern (direct call for simplicity)
    const response: ControllerResponse = await handleRegisterPublic(controllerRequest);

    // Return response
    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    // Unexpected error - log and return generic error
    console.error('[API] /api/auth/register/public - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Handles public registration request (extracted for clarity)
 */
async function handleRegisterPublic(
  req: ControllerRequest
): Promise<ControllerResponse> {
  try {
    // 1. Validate request body
    const body = req.body as PublicRegisterUserDto;

    if (!body || !body.email || !body.password) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Email and password are required',
        },
      };
    }

    // 2. Execute public registration use case
    // Note: No authentication required - this is public signup
    // Role is automatically set to PATIENT in use case
    const response = await registerPublicUserUseCase.execute(body);

    // 3. Return success response
    return {
      status: 201,
      body: {
        success: true,
        data: response,
        message: 'Registration successful',
      },
    };
  } catch (error) {
    // Handle domain exceptions
    if (error instanceof DomainException) {
      // Generic error message (prevents user enumeration)
      return {
        status: 400,
        body: {
          success: false,
          error: error.message, // Use case ensures generic messages
        },
      };
    }

    // Re-throw unexpected errors
    throw error;
  }
}
