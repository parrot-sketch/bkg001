/**
 * API Route: GET /api/theater-tech/theater-scheduling/theaters
 *
 * Returns available theaters with their bookings for a date range.
 * Uses TheaterSchedulingUseCase for clean architecture.
 *
 * - Requires authentication (THEATER_TECHNICIAN, FRONTDESK, or ADMIN)
 * - Returns theaters with bookings for selected date
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { TheaterSchedulingFactory } from '@/application/services/TheaterSchedulingFactory';

export async function GET(request: NextRequest) {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { role } = authResult.user;

        if (role !== Role.THEATER_TECHNICIAN && role !== Role.FRONTDESK && role !== Role.ADMIN) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Access denied: Only theater technician, frontdesk, or admin can view theater schedules',
                },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');

        const date = dateParam ? new Date(dateParam) : new Date();

        const useCase = TheaterSchedulingFactory.getInstance();
        const theaters = await useCase.getTheatersForDate(date);

        return NextResponse.json({
            success: true,
            data: {
                theaters: theaters,
                date: date.toISOString().split('T')[0],
            },
        });
    } catch (error) {
        console.error('[API] /api/theater-tech/theater-scheduling/theaters GET - Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch theaters',
            },
            { status: 500 }
        );
    }
}