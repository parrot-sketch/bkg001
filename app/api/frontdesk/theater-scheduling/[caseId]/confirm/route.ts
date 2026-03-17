/**
 * API Route: POST /api/frontdesk/theater-scheduling/[caseId]/confirm
 *
 * Confirms a provisional theater booking.
 * Uses TheaterSchedulingUseCase for clean architecture including billing.
 * Transitions case from READY_FOR_THEATER_BOOKING → SCHEDULED
 *
 * - Requires authentication (FRONTDESK or ADMIN)
 * - Validates booking exists and is locked by user
 * - Confirms booking, updates case status, creates billing
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { TheaterSchedulingFactory } from '@/application/services/TheaterSchedulingFactory';
import { z } from 'zod';

const confirmBookingSchema = z.object({
    bookingId: z.string().uuid(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ caseId: string }> }
) {
    try {
        // Await params (Next.js 15+ requirement)
        const { caseId } = await params;

        // 1. Authenticate
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { userId, role } = authResult.user;

        // 2. Check permissions (FRONTDESK or ADMIN only)
        if (role !== Role.FRONTDESK && role !== Role.ADMIN) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: Only frontdesk staff can confirm theater bookings',
                },
                { status: 403 }
            );
        }

        // 3. Parse and validate request body
        const body = await request.json();
        const validationResult = confirmBookingSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request data',
                    details: validationResult.error.errors,
                },
                { status: 400 }
            );
        }

        const { bookingId } = validationResult.data;

        // 4. Confirm booking using use case (includes billing)
        const useCase = TheaterSchedulingFactory.getInstance();
        const result = await useCase.confirmBooking(
            { bookingId },
            userId
        );

        return NextResponse.json({
            success: true,
            data: {
                bookingId: result.bookingId,
                status: result.status,
                theaterId: result.theaterId,
                theaterName: result.theaterName,
                startTime: result.startTime,
                endTime: result.endTime,
                confirmedAt: result.confirmedAt,
                caseStatus: result.caseStatus,
                billing: result.billing,
            },
        });
    } catch (error) {
        console.error('[API] /api/frontdesk/theater-scheduling/[caseId]/confirm POST - Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to confirm theater booking',
            },
            { status: 500 }
        );
    }
}
