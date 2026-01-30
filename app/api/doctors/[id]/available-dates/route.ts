/**
 * API Route: GET /api/doctors/:id/available-dates
 * 
 * Get Available Dates endpoint.
 * 
 * Returns dates with available slots for a doctor within a date range.
 * Used to highlight available dates on calendar before user selects a date.
 * 
 * Security:
 * - Public access allowed (for guest booking)
 * - Authenticated users are tracked
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetAvailableSlotsForDateUseCase } from '@/application/use-cases/GetAvailableSlotsForDateUseCase';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import db from '@/lib/db';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
// import { Role } from '@/domain/enums/Role'; // Unused now

// Initialize dependencies
const availabilityRepository = new PrismaAvailabilityRepository(db);
const appointmentRepository = new PrismaAppointmentRepository(db);
const getAvailableSlotsForDateUseCase = new GetAvailableSlotsForDateUseCase(
  availabilityRepository,
  appointmentRepository,
  db
);

/**
 * GET /api/doctors/:id/available-dates
 * 
 * Query params:
 * - startDate: Start date (YYYY-MM-DD) - required
 * - endDate: End date (YYYY-MM-DD) - required
 * 
 * Returns array of dates (YYYY-MM-DD) that have at least one available slot.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;

    // 1. Authenticate request (Optional - for logging context only)
    await JwtMiddleware.authenticate(request);
    // User context is available if needed, but we allow public access

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

    // 3. (REMOVED) Check permissions 
    // Public access allowed for booking availability checks

    // 4. Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'startDate and endDate query parameters are required (YYYY-MM-DD format)',
        },
        { status: 400 }
      );
    }

    // 5. Parse dates
    let startDate: Date;
    let endDate: Date;
    try {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }

      // Normalize to start/end of day
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD format.',
        },
        { status: 400 }
      );
    }

    // 6. Check date range is reasonable (max 3 months)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      return NextResponse.json(
        {
          success: false,
          error: 'Date range cannot exceed 90 days',
        },
        { status: 400 }
      );
    }

    // 7. Check date is not in the past
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (startDate < now) {
      return NextResponse.json(
        {
          success: false,
          error: 'Start date cannot be in the past',
        },
        { status: 400 }
      );
    }

    // 8. Iterate through each date in range and check for available slots
    const availableDates: string[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      try {
        const slots = await getAvailableSlotsForDateUseCase.execute({
          doctorId,
          date: new Date(currentDate),
        });

        // If there's at least one available slot, add the date
        if (slots.length > 0) {
          availableDates.push(currentDate.toISOString().split('T')[0]);
        }
      } catch (error) {
        // Skip dates that error (e.g., doctor doesn't work that day)
        // Continue to next date
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 9. Return success response
    return NextResponse.json(
      {
        success: true,
        data: availableDates,
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
    console.error('[API] /api/doctors/[id]/available-dates GET - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch available dates',
      },
      { status: 500 }
    );
  }
}
