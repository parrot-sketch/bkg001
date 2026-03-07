import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TheaterBookingService } from '@/application/services/TheaterBookingService';
import { getCurrentUser } from '@/lib/auth/server-auth';

const theaterBookingService = new TheaterBookingService(db);

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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

        const booking = await theaterBookingService.createProvisionalLock(
            caseId,
            theaterId,
            start,
            end,
            user.userId
        );

        return NextResponse.json({
            success: true,
            data: booking
        });

    } catch (error: any) {
        console.error('Provisional Theater Booking Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
