/**
 * API Route: GET /api/doctors/:id/slots
 * 
 * Get Available Slots endpoint.
 * 
 * Returns available time slots for a doctor on a specific date.
 * Used by front desk for scheduling consultations.
 * 
 * Security:
 * - Requires authentication
 * - FRONTDESK, ADMIN, and DOCTOR (own slots) can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetAvailableSlotsForDateUseCase } from '@/application/use-cases/GetAvailableSlotsForDateUseCase';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import db from '@/lib/db';
import { GetAvailableSlotsDto } from '@/application/dtos/GetAvailableSlotsDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies
const availabilityRepository = new PrismaAvailabilityRepository(db);
const appointmentRepository = new PrismaAppointmentRepository(db);
const getAvailableSlotsForDateUseCase = new GetAvailableSlotsForDateUseCase(
  availabilityRepository,
  appointmentRepository,
  db
);

/**
 * GET /api/doctors/:id/slots
 * 
 * Query params:
 * - date: Date (YYYY-MM-DD) - required
 * - duration: Optional slot duration in minutes
 * 
 * Returns available time slots for the doctor on the specified date.
 */
export async function GET(
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

    // 3. Check permissions (FRONTDESK, ADMIN, or DOCTOR viewing own slots)
    if (userRole === Role.DOCTOR) {
      // Doctor can only view their own slots
      const doctor = await db.doctor.findUnique({
        where: { id: doctorId },
        select: { user_id: true },
      });

      if (!doctor || doctor.user_id !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: Doctors can only view their own slots',
          },
          { status: 403 }
        );
      }
    } else if (userRole !== Role.FRONTDESK && userRole !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only front desk, admin, and doctors can view slots',
        },
        { status: 403 }
      );
    }

    // 4. Parse query parameters
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const durationParam = searchParams.get('duration');

    if (!dateParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'date query parameter is required (YYYY-MM-DD format)',
        },
        { status: 400 }
      );
    }

    // 5. Parse date
    let date: Date;
    try {
      date = new Date(dateParam);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD format.',
        },
        { status: 400 }
      );
    }

    // 6. Build DTO
    const dto: GetAvailableSlotsDto = {
      doctorId,
      date,
      duration: durationParam ? parseInt(durationParam, 10) : undefined,
    };

    // 7. Execute get available slots use case
    const response = await getAvailableSlotsForDateUseCase.execute(dto);

    // 8. Return success response
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
    console.error('[API] /api/doctors/[id]/slots GET - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch available slots',
      },
      { status: 500 }
    );
  }
}
