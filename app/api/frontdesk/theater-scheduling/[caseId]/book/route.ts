/**
 * API Route: POST /api/frontdesk/theater-scheduling/[caseId]/book
 *
 * Books theater slot for a surgical case.
 * Uses two-phase booking: lock → confirm
 *
 * - Requires authentication (FRONTDESK or ADMIN)
 * - Validates case is in READY_FOR_THEATER_BOOKING status
 * - Creates provisional booking (lock)
 * - Returns booking ID for confirmation
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { db } from '@/lib/db';
import { TheaterService } from '@/application/services/TheaterService';
import { z } from 'zod';

const bookTheaterSchema = z.object({
    theaterId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
});

const theaterService = new TheaterService(db);

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
                    error: 'Access denied: Only frontdesk staff can book theater',
                },
                { status: 403 }
            );
        }

        // 3. Validate case exists and is in correct status
        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: { id: true, status: true },
        });

        if (!surgicalCase) {
            return NextResponse.json(
                { success: false, error: 'Surgical case not found' },
                { status: 404 }
            );
        }

        if (surgicalCase.status !== 'READY_FOR_THEATER_BOOKING') {
            return NextResponse.json(
                {
                    success: false,
                    error: `Case must be in READY_FOR_THEATER_BOOKING status (current: ${surgicalCase.status})`,
                },
                { status: 400 }
            );
        }

        // 4. Parse and validate request body
        const body = await request.json();
        const validationResult = bookTheaterSchema.safeParse(body);

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

        const { theaterId, startTime, endTime } = validationResult.data;

        // 5. Lock slot (provisional booking)
        const booking = await theaterService.lockSlot(
            caseId,
            theaterId,
            new Date(startTime),
            new Date(endTime),
            userId
        );

        return NextResponse.json({
            success: true,
            data: {
                bookingId: booking.id,
                status: booking.status,
                theaterId: booking.theater_id,
                startTime: booking.start_time,
                endTime: booking.end_time,
                lockedAt: booking.locked_at,
                lockExpiresAt: booking.lock_expires_at,
            },
        });
    } catch (error) {
        console.error('[API] /api/frontdesk/theater-scheduling/[caseId]/book POST - Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to book theater slot',
            },
            { status: 500 }
        );
    }
}
