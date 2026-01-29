/**
 * API Route: GET /api/doctors/me/schedule/calendar
 * 
 * Get availability calendar for a doctor within a date range.
 * 
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can access
 * - Doctors can only view their own calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { GetAvailabilityForRangeUseCase } from '@/application/use-cases/GetAvailabilityForRangeUseCase';
import db from '@/lib/db';
import { DomainException } from '@/domain/exceptions/DomainException';

const availabilityRepository = new PrismaAvailabilityRepository(db);
const appointmentRepository = new PrismaAppointmentRepository(db);
const getAvailabilityForRangeUseCase = new GetAvailabilityForRangeUseCase(
  availabilityRepository,
  appointmentRepository,
  db
);

/**
 * GET /api/doctors/me/schedule/calendar
 * 
 * Query params:
 * - startDate: Date (YYYY-MM-DD) - required
 * - endDate: Date (YYYY-MM-DD) - required
 * 
 * Returns availability calendar with dates that have available slots.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (authResult.user.role !== Role.DOCTOR) {
      return NextResponse.json(
        { success: false, error: 'Only doctors can view their availability calendar' },
        { status: 403 }
      );
    }

    // 2. Get doctor ID
    const doctor = await db.doctor.findUnique({
      where: { user_id: authResult.user.userId },
      select: { id: true },
    });

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate query parameters are required (YYYY-MM-DD format)' },
        { status: 400 }
      );
    }

    // 4. Parse dates
    let startDate: Date;
    let endDate: Date;
    try {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD format.' },
        { status: 400 }
      );
    }

    // 5. Execute use case (all business logic in use case)
    const calendar = await getAvailabilityForRangeUseCase.execute({
      doctorId: doctor.id,
      startDate,
      endDate,
    });

    // 6. Return response
    return NextResponse.json(
      {
        success: true,
        data: calendar,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof DomainException) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.error('[API] /api/doctors/me/schedule/calendar GET - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch availability calendar' },
      { status: 500 }
    );
  }
}
