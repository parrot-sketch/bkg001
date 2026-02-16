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
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
        }

        const booking = await theaterService.confirmBooking(
            bookingId,
            user.userId,
            user.role
        );

        return NextResponse.json(booking);
    } catch (error: any) {
        console.error('[API] Confirm Booking Error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
