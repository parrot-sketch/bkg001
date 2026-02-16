import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TheaterService } from '@/application/services/TheaterService';
import { getCurrentUser } from '@/lib/auth/server-auth';

const theaterService = new TheaterService(db);

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { caseId, theaterId, startTime, endTime } = body;

        if (!caseId || !theaterId || !startTime || !endTime) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const booking = await theaterService.lockSlot(
            caseId,
            theaterId,
            new Date(startTime),
            new Date(endTime),
            user.userId
        );

        return NextResponse.json(booking);
    } catch (error: any) {
        console.error('[API] Lock Slot Error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
