/**
 * API Route: GET /api/doctors/me/availability
 * PUT /api/doctors/me/availability
 * 
 * Doctor Self-Service Availability Management endpoints.
 * 
 * Allows doctors to view and update their own availability.
 * 
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can access
 * - Doctors can only access their own availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetMyAvailabilityUseCase } from '@/application/use-cases/GetMyAvailabilityUseCase';
import { SetDoctorAvailabilityUseCase } from '@/application/use-cases/SetDoctorAvailabilityUseCase';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { SetDoctorAvailabilityDto } from '@/application/dtos/SetDoctorAvailabilityDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies
const availabilityRepository = new PrismaAvailabilityRepository(db);
const auditService = new ConsoleAuditService();
const getMyAvailabilityUseCase = new GetMyAvailabilityUseCase(availabilityRepository, db);
const setDoctorAvailabilityUseCase = new SetDoctorAvailabilityUseCase(
  availabilityRepository,
  db,
  auditService
);

/**
 * GET /api/doctors/me/availability
 * 
 * Returns current doctor's availability.
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

    // 3. Find doctor by user_id
    const doctor = await db.doctor.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!doctor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor profile not found',
        },
        { status: 404 }
      );
    }

    // 4. Execute get my availability use case
    const response = await getMyAvailabilityUseCase.execute(doctor.id);

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
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
    console.error('[API] /api/doctors/me/availability GET - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch doctor availability',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/doctors/me/availability
 * 
 * Updates current doctor's availability.
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

    // 2. Check permissions (only DOCTOR can update their own availability, or ADMIN)
    if (userRole !== Role.DOCTOR && userRole !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can update their availability',
        },
        { status: 403 }
      );
    }

    // 3. Find doctor by user_id
    const doctor = await db.doctor.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!doctor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor profile not found',
        },
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

    // 5. Validate required fields
    if (!body || !body.workingDays || !Array.isArray(body.workingDays)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Working days array is required',
        },
        { status: 400 }
      );
    }

    // 6. Build DTO
    const dto: SetDoctorAvailabilityDto = {
      doctorId: doctor.id,
      workingDays: body.workingDays,
      slotConfiguration: body.slotConfiguration,
    };

    // 7. Execute set doctor availability use case
    const response = await setDoctorAvailabilityUseCase.execute(dto);

    // 8. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Doctor availability updated successfully',
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
    console.error('[API] /api/doctors/me/availability PUT - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
