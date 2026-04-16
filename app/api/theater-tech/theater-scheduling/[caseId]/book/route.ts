/**
 * API Route: POST /api/theater-tech/theater-scheduling/[caseId]/book
 *
 * Locks a theater slot for a surgical case (provisional booking).
 * Uses TheaterSchedulingUseCase for clean architecture.
 *
 * - Requires authentication (THEATER_TECHNICIAN, FRONTDESK, or ADMIN)
 * - Validates case is in READY_FOR_THEATER_BOOKING or other eligible status
 * - Creates provisional booking (lock)
 * - Returns booking ID for confirmation
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { TheaterSchedulingFactory } from '@/application/services/TheaterSchedulingFactory';
import { z } from 'zod';

const bookTheaterSchema = z.object({
    theaterId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ caseId: string }> }
) {
    try {
        const { caseId } = await params;

        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { userId, role } = authResult.user;

        if (role !== Role.THEATER_TECHNICIAN && role !== Role.FRONTDESK && role !== Role.ADMIN) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: Only theater technician, frontdesk, or admin can book theater',
                },
                { status: 403 }
            );
        }

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

        const useCase = TheaterSchedulingFactory.getInstance();
        const result = await useCase.lockSlot(
            {
                caseId,
                theaterId,
                startTime,
                endTime,
            },
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
                lockedAt: result.lockedAt,
                lockExpiresAt: result.lockExpiresAt,
            },
        });
    } catch (error) {
        console.error('[API] /api/theater-tech/theater-scheduling/[caseId]/book POST - Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to book theater slot',
            },
            { status: 500 }
        );
    }
}