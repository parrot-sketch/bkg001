/**
 * API Route: POST /api/doctor/activate-invite
 * 
 * Doctor invitation activation endpoint.
 * Allows doctors to activate their account via invitation token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ActivateDoctorInviteUseCase } from '@/application/use-cases/ActivateDoctorInviteUseCase';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { ActivateDoctorInviteDto } from '@/application/dtos/InviteDoctorDto';
import { DomainException } from '@/domain/exceptions/DomainException';

// Initialize dependencies
const userRepository = new PrismaUserRepository(db);
const auditService = new ConsoleAuditService();

const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
  accessTokenExpiresIn: 15 * 60,
  refreshTokenExpiresIn: 7 * 24 * 60 * 60,
  saltRounds: 10,
};

const authService = new JwtAuthService(userRepository, db, authConfig);
const activateDoctorInviteUseCase = new ActivateDoctorInviteUseCase(db, authService, userRepository, auditService);

/**
 * POST /api/doctor/activate-invite
 * 
 * Public endpoint - no authentication required (token is the authentication)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse request body
    let body: ActivateDoctorInviteDto;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Validate required fields
    if (!body.token || !body.password) {
      return NextResponse.json({
        success: false,
        error: 'Token and password are required',
      }, { status: 400 });
    }

    // Validate password confirmation (if provided)
    if (body.password && body.password.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 8 characters',
      }, { status: 400 });
    }

    // Execute activation use case
    const response = await activateDoctorInviteUseCase.execute(body);

    return NextResponse.json({
      success: true,
      data: response,
      message: 'Account activated successfully',
    }, { status: 200 });

  } catch (error) {
    if (error instanceof DomainException) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 400 });
    }

    console.error('[API] /api/doctor/activate-invite - Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}
