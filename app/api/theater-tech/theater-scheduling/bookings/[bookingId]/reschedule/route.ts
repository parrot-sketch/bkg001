/**
 * API Route: POST /api/theater-tech/theater-scheduling/bookings/[bookingId]/reschedule
 *
 * Reschedules an existing CONFIRMED booking by updating the booking row in-place.
 *
 * - Requires authentication (THEATER_TECHNICIAN, FRONTDESK, or ADMIN)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { TheaterSchedulingFactory } from '@/application/services/TheaterSchedulingFactory';
import { z } from 'zod';

const rescheduleSchema = z.object({
  theaterId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await params;

    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { userId, role } = authResult.user;
    if (role !== Role.THEATER_TECHNICIAN && role !== Role.FRONTDESK && role !== Role.ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Only theater technician, frontdesk, or admin can reschedule bookings' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = rescheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: parsed.error.errors },
        { status: 400 },
      );
    }

    const useCase = TheaterSchedulingFactory.getInstance();
    const result = await useCase.rescheduleBooking(
      {
        bookingId,
        theaterId: parsed.data.theaterId,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        reason: parsed.data.reason,
      },
      userId,
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[API] /api/theater-tech/theater-scheduling/bookings/[bookingId]/reschedule POST - Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to reschedule booking' },
      { status: 500 },
    );
  }
}

