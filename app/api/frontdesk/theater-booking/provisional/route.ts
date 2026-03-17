import { NextRequest, NextResponse } from 'next/server';
import { TheaterSchedulingFactory } from '@/application/services/TheaterSchedulingFactory';
import { getCurrentUser } from '@/lib/auth/server-auth';
import { Role } from '@/domain/enums/Role';

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Check permissions
        if (user.role !== Role.FRONTDESK && user.role !== Role.ADMIN && user.role !== Role.NURSE) {
            return NextResponse.json(
                { success: false, error: 'Access denied: Only frontdesk, nurse, or admin can book theater' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { caseId, theaterId, startTime, endTime } = body;

        if (!caseId || !theaterId || !startTime || !endTime) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (start >= end) {
            return NextResponse.json(
                { success: false, error: 'Start time must be before end time' },
                { status: 400 }
            );
        }

        // Use use case for locking
        const useCase = TheaterSchedulingFactory.getInstance();
        const result = await useCase.lockSlot(
            { caseId, theaterId, startTime, endTime },
            user.userId
        );

        return NextResponse.json({
            success: true,
            data: {
                id: result.bookingId,
                status: result.status,
                theater_id: result.theaterId,
                theater_name: result.theaterName,
                start_time: result.startTime,
                end_time: result.endTime,
                locked_at: result.lockedAt,
                lock_expires_at: result.lockExpiresAt,
            },
        });

    } catch (error: any) {
        console.error('Provisional Theater Booking Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
