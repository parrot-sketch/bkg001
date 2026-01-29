import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TheaterService } from '@/application/services/TheaterService';
import { getCurrentUser } from '@/lib/auth/server-auth';

const theaterService = new TheaterService(db);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    const date = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const theaters = await theaterService.getTheaters(startOfDay, endOfDay);
    return NextResponse.json(theaters);
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { caseId, theaterId, startTime, endTime } = body;

        const booking = await theaterService.bookSlot(
            caseId,
            theaterId,
            new Date(startTime),
            new Date(endTime),
            user.userId // Using userId from auth context
        );

        return NextResponse.json(booking);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
