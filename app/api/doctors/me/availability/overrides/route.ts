/**
 * API Route: POST /api/doctors/me/availability/overrides
 * 
 * Create availability override for a doctor.
 * Allows blocking dates or setting custom hours for specific dates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { PrismaAvailabilityRepository } from '@/infrastructure/database/repositories/PrismaAvailabilityRepository';
import db from '@/lib/db';
import { DomainException } from '@/domain/exceptions/DomainException';

const availabilityRepository = new PrismaAvailabilityRepository(db);

/**
 * POST /api/doctors/me/availability/overrides
 * 
 * Body:
 * - startDate: Date (ISO string)
 * - endDate: Date (ISO string)
 * - isBlocked: boolean
 * - reason?: string
 * - startTime?: string (HH:mm) - custom start time (only for single-day overrides)
 * - endTime?: string (HH:mm) - custom end time (only for single-day overrides)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (authResult.user.role !== Role.DOCTOR) {
      return NextResponse.json(
        { success: false, error: 'Only doctors can manage availability' },
        { status: 403 }
      );
    }

    // Get doctor ID
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

    // Parse request body
    const body = await request.json();
    const { startDate, endDate, isBlocked, reason, startTime, endTime } = body;

    // Validate required fields
    if (!startDate || !endDate || typeof isBlocked !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'startDate, endDate, and isBlocked are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { success: false, error: 'startDate must be before or equal to endDate' },
        { status: 400 }
      );
    }

    // Validate custom hours (if provided, both must be provided and date range must be single day)
    const isSingleDay = start.toISOString().split('T')[0] === end.toISOString().split('T')[0];
    if ((startTime || endTime) && !isSingleDay) {
      return NextResponse.json(
        { success: false, error: 'Custom hours can only be set for single-day overrides' },
        { status: 400 }
      );
    }

    if ((startTime || endTime) && (!startTime || !endTime)) {
      return NextResponse.json(
        { success: false, error: 'Both startTime and endTime must be provided for custom hours' },
        { status: 400 }
      );
    }

    // Validate time format (HH:mm)
    if (startTime && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
      return NextResponse.json(
        { success: false, error: 'startTime must be in HH:mm format' },
        { status: 400 }
      );
    }

    if (endTime && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
      return NextResponse.json(
        { success: false, error: 'endTime must be in HH:mm format' },
        { status: 400 }
      );
    }

    // Create override
    const override = await availabilityRepository.createOverride({
      doctorId: doctor.id,
      startDate: start,
      endDate: end,
      isBlocked,
      reason: reason || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: override,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DomainException) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.error('[API] /api/doctors/me/availability/overrides POST - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create availability override' },
      { status: 500 }
    );
  }
}
