/**
 * API Route: GET /api/doctors/me/profile
 * PUT /api/doctors/me/profile
 * 
 * Doctor Self-Service Profile Management endpoints.
 * 
 * Allows doctors to view and update their own profile.
 * 
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can access
 * - Doctors can only access their own profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { UpdateDoctorProfileUseCase } from '@/application/use-cases/UpdateDoctorProfileUseCase';
import { GetDoctorProfileUseCase } from '@/application/use-cases/GetDoctorProfileUseCase';
import { PrismaDoctorRepository } from '@/infrastructure/database/repositories/PrismaDoctorRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { UpdateDoctorProfileDto } from '@/application/dtos/UpdateDoctorProfileDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import type { DoctorResponseDto } from '@/application/dtos/DoctorResponseDto';

// Initialize dependencies
const doctorRepository = new PrismaDoctorRepository(db);
const auditService = new ConsoleAuditService();

const getDoctorProfileUseCase = new GetDoctorProfileUseCase(doctorRepository);
const updateDoctorProfileUseCase = new UpdateDoctorProfileUseCase(doctorRepository, auditService);

/**
 * GET /api/doctors/me/profile
 * 
 * Returns current doctor's profile information.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate request
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const userId = authResult.user.userId;
    const userRole = authResult.user.role;

    // 2. Check permissions (only DOCTOR can access)
    if (userRole !== Role.DOCTOR) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can access this endpoint',
        },
        { status: 403 }
      );
    }

    // 3. Execute Use Case
    // Use executeByUserId since we have the authenticated user's ID
    const doctorDto = await getDoctorProfileUseCase.executeByUserId(userId);

    return NextResponse.json(
      {
        success: true,
        data: doctorDto,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle domain exceptions (e.g. Profile not found)
    if (error instanceof DomainException) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    console.error('[API] /api/doctors/me/profile GET - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch doctor profile',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/doctors/me/profile
 * 
 * Updates current doctor's profile information.
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate request
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const userId = authResult.user.userId;
    const userRole = authResult.user.role;

    // 2. Check permissions (only DOCTOR can update their own profile, or ADMIN)
    if (userRole !== Role.DOCTOR && userRole !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can update their profile',
        },
        { status: 403 }
      );
    }

    // 3. Resolve Doctor ID from User ID
    // We can use the GetUseCase for this lookup to avoid direct DB call here
    let doctorId: string;
    try {
      const doctorProfile = await getDoctorProfileUseCase.executeByUserId(userId);
      doctorId = doctorProfile.id;
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    // 4. Parse request body
    let body: any;
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

    // 5. Build DTO
    const dto: UpdateDoctorProfileDto = {
      doctorId: doctorId,
      bio: body.bio,
      education: body.education,
      focusAreas: body.focusAreas,
      professionalAffiliations: body.professionalAffiliations,
      profileImage: body.profileImage,
      clinicLocation: body.clinicLocation,
    };

    // 6. Execute update doctor profile use case
    const response = await updateDoctorProfileUseCase.execute(dto);

    // 7. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Doctor profile updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle domain exceptions
    if (error instanceof DomainException) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Unexpected error
    console.error('[API] /api/doctors/me/profile PUT - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
