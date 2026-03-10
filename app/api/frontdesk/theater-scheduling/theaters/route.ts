/**
 * API Route: GET /api/frontdesk/theater-scheduling/theaters
 *
 * Returns available theaters with their bookings for a date range.
 * Used for calendar view in theater booking page.
 *
 * - Requires authentication (FRONTDESK or ADMIN)
 * - Returns theaters with bookings for selected date
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { db } from '@/lib/db';
import { TheaterService } from '@/application/services/TheaterService';

const theaterService = new TheaterService(db);

export async function GET(request: NextRequest) {
    try {
        // 1. Authenticate
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { role } = authResult.user;

        // 2. Check permissions (FRONTDESK or ADMIN only)
        if (role !== Role.FRONTDESK && role !== Role.ADMIN) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: Only frontdesk staff can view theater schedules',
                },
                { status: 403 }
            );
        }

        // 3. Parse date parameter
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');

        const date = dateParam ? new Date(dateParam) : new Date();
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // 4. Fetch theaters with bookings
        const theaters = await theaterService.getTheaters(startOfDay, endOfDay);

        // 5. Format response
        const formattedTheaters = theaters.map((theater) => ({
            id: theater.id,
            name: theater.name,
            type: theater.type,
            isActive: theater.is_active,
            hourlyRate: theater.hourly_rate || 0,
            bookings: theater.bookings.map((booking) => ({
                id: booking.id,
                caseId: booking.surgical_case_id,
                startTime: booking.start_time,
                endTime: booking.end_time,
                status: booking.status,
                lockedBy: booking.locked_by,
                lockedAt: booking.locked_at,
                lockExpiresAt: booking.lock_expires_at,
            })),
        }));

        return NextResponse.json({
            success: true,
            data: {
                theaters: formattedTheaters,
                date: date.toISOString().split('T')[0],
            },
        });
    } catch (error) {
        console.error('[API] /api/frontdesk/theater-scheduling/theaters GET - Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch theaters',
            },
            { status: 500 }
        );
    }
}
