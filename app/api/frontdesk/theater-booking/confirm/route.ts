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
                { success: false, error: 'Access denied: Only frontdesk, nurse, or admin can confirm theater bookings' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json(
                { success: false, error: 'Missing bookingId' },
                { status: 400 }
            );
        }

        // Use use case for confirmation (includes billing)
        const useCase = TheaterSchedulingFactory.getInstance();
        const result = await useCase.confirmBooking(
            { bookingId },
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
                confirmed_at: result.confirmedAt,
                case_status: result.caseStatus,
                billing: result.billing,
            },
        });

    } catch (error: any) {
        console.error('Confirm Theater Booking Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
