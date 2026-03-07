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
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json(
                { success: false, error: 'Missing bookingId' },
                { status: 400 }
            );
        }

        const confirmedBooking = await theaterBookingService.confirmBooking(
            bookingId,
            user.userId
        );

        return NextResponse.json({
            success: true,
            data: confirmedBooking
        });

    } catch (error: any) {
        console.error('Confirm Theater Booking Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
