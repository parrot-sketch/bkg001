/**
 * API Route: POST /api/admin/invite-doctor
 * 
 * Doctor invitation endpoint.
 * Allows admin/frontdesk to invite a doctor to the system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { InviteDoctorUseCase } from '@/application/use-cases/InviteDoctorUseCase';
import { JwtAuthService } from '@/infrastructure/auth/JwtAuthService';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { MockNotificationService } from '@/infrastructure/services/MockNotificationService';
import db from '@/lib/db';
import { InviteDoctorDto } from '@/application/dtos/InviteDoctorDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies
const userRepository = new PrismaUserRepository(db);
const auditService = new ConsoleAuditService();
const notificationService = new MockNotificationService();

const authConfig = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
  accessTokenExpiresIn: 15 * 60,
  refreshTokenExpiresIn: 7 * 24 * 60 * 60,
  saltRounds: 10,
};

const authService = new JwtAuthService(userRepository, db, authConfig);
const inviteDoctorUseCase = new InviteDoctorUseCase(db, authService, auditService, notificationService);

/**
 * POST /api/admin/invite-doctor
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate and authorize
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Only ADMIN and FRONTDESK can invite doctors
    const userRole = authResult.user.role as Role;
    if (userRole !== Role.ADMIN && userRole !== Role.FRONTDESK) {
      return NextResponse.json({ success: false, error: 'Access denied: Only admins and frontdesk can invite doctors' }, { status: 403 });
    }

    // Parse request body
    let body: InviteDoctorDto;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Validate required fields
    if (!body.email || !body.firstName || !body.lastName || !body.specialization || !body.licenseNumber || !body.phone) {
      return NextResponse.json({
        success: false,
        error: 'Email, name, specialization, license number, and phone are required',
      }, { status: 400 });
    }

    // Execute invite use case
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000';
    const response = await inviteDoctorUseCase.execute(body, authResult.user.userId, baseUrl);

    return NextResponse.json({
      success: true,
      data: response,
      message: 'Doctor invitation sent successfully',
    }, { status: 201 });

  } catch (error) {
    if (error instanceof DomainException) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 400 });
    }

    console.error('[API] /api/admin/invite-doctor - Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}
