/**
 * API Route: GET /api/doctors/:id/availability
 * PUT /api/doctors/:id/availability
 * 
 * Doctor Availability Management endpoints.
 * 
 * Allows doctors to view and update their working days/hours.
 * 
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can update their own availability (or ADMIN)
 * - Public read access for availability viewing
 */

import { NextRequest, NextResponse } from 'next/server';
import { UpdateDoctorAvailabilityUseCase } from '@/application/use-cases/UpdateDoctorAvailabilityUseCase';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { UpdateDoctorAvailabilityDto } from '@/application/dtos/UpdateDoctorAvailabilityDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies (singleton pattern)
const auditService = new ConsoleAuditService();

// Initialize use case
const updateDoctorAvailabilityUseCase = new UpdateDoctorAvailabilityUseCase(
  db,
  auditService,
);

/**
 * GET /api/doctors/:id/availability
 * 
 * Returns doctor availability (working days/hours).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;
    const doctorId = params.id;

    if (!doctorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor ID is required',
        },
        { status: 400 }
      );
    }

    // Fetch working days from database
    const workingDays = await db.workingDay.findMany({
      where: { doctor_id: doctorId },
      orderBy: [
        { day: 'asc' },
      ],
    });

    // Map to response format
    const response = workingDays.map((wd) => ({
      day: wd.day,
      startTime: wd.start_time,
      endTime: wd.end_time,
    }));

    return NextResponse.json(
      {
        success: true,
        data: response,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/doctors/[id]/availability GET - Error:', error);
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
 * PUT /api/doctors/:id/availability
 * 
 * Updates doctor availability (working days/hours).
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;
    
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

    // 2. Extract doctor ID from params
    const doctorId = params.id;
    if (!doctorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor ID is required',
        },
        { status: 400 }
      );
    }

    // 3. Check permissions (only DOCTOR can update their own availability, or ADMIN)
    if (userRole !== Role.DOCTOR && userRole !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can update their availability',
        },
        { status: 403 }
      );
    }

    // 4. Verify doctor can only update their own availability (unless admin)
    if (userRole === Role.DOCTOR) {
      // Need to check if userId matches doctor's user_id
      const doctor = await db.doctor.findUnique({
        where: { id: doctorId },
        select: { user_id: true },
      });

      if (!doctor) {
        return NextResponse.json(
          {
            success: false,
            error: 'Doctor not found',
          },
          { status: 404 }
        );
      }

      if (doctor.user_id !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: Doctors can only update their own availability',
          },
          { status: 403 }
        );
      }
    }

    // 5. Parse request body
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

    // 6. Validate required fields
    if (!body || !body.workingDays || !Array.isArray(body.workingDays)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Working days array is required',
        },
        { status: 400 }
      );
    }

    // 7. Build DTO
    const dto: UpdateDoctorAvailabilityDto = {
      doctorId,
      workingDays: body.workingDays,
    };

    // 8. Execute update doctor availability use case
    const response = await updateDoctorAvailabilityUseCase.execute(dto);

    // 9. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Doctor availability updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle domain exceptions (e.g., validation errors)
    if (error instanceof DomainException) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Unexpected error - log and return generic error
    console.error('[API] /api/doctors/[id]/availability PUT - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
