/**
 * API Route: POST /api/auth/register
 * 
 * User registration endpoint (backward compatibility).
 * 
 * This route handles public registration by delegating to RegisterPublicUserUseCase.
 * Public signup does not require 'id' or 'role' - they are generated server-side.
 * 
 * NOTE: For backward compatibility, this route uses the same logic as /register/public.
 * The frontend calls this endpoint, so we maintain it for compatibility.
 */

import { NextRequest, NextResponse } from 'next/server';
import { RegisterPublicUserUseCase } from '@/application/use-cases/RegisterPublicUserUseCase';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { PublicRegisterUserDto } from '@/application/dtos/PublicRegisterUserDto';
import { DomainException } from '@/domain/exceptions/DomainException';

// Initialize dependencies (singleton pattern - shared with public route)
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
 * POST /api/auth/register
 * 
 * Handles public user registration (for backward compatibility with existing frontend).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let body: PublicRegisterUserDto;
    try {
      const rawBody = await request.json();
      
      // If body has 'id' or 'role', ignore them (public registration doesn't accept them)
      // Extract only fields that PublicRegisterUserDto accepts
      body = {
        email: rawBody.email,
        password: rawBody.password,
        firstName: rawBody.firstName,
        lastName: rawBody.lastName,
        phone: rawBody.phone,
      };
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

    // Execute public registration use case
    const response = await registerPublicUserUseCase.execute(body);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Registration successful',
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle domain exceptions
    if (error instanceof DomainException) {
      return NextResponse.json(
        {
          success: false,
          error: error.message, // Use case ensures generic messages
        },
        { status: 400 }
      );
    }

    // Unexpected error - log and return generic error
    console.error('[API] /api/auth/register - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
