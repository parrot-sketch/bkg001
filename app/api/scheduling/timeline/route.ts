
import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@prisma/client';
import db from '@/lib/db';
import { endpointTimer } from '@/lib/observability/endpointLogger';
import { z } from 'zod';

const ALLOWED_ROLES = new Set<Role>([Role.ADMIN, Role.THEATER_TECHNICIAN]);

const querySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format YYYY-MM-DD'),
    theaterId: z.string().optional(),
    view: z.enum(['day']).default('day'),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
    const timer = endpointTimer('GET /api/scheduling/timeline');
    try {
        // 1. Authenticate
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        // 2. Authorize
        if (!ALLOWED_ROLES.has(authResult.user.role as Role)) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // 3. Parse Query
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        const validation = querySchema.safeParse(queryParams);

        if (!validation.success) {
            return NextResponse.json({ success: false, error: 'Invalid query parameters', details: validation.error.format() }, { status: 400 });
        }

        const { date, theaterId } = validation.data;

        // 4. Date Range (Start of Day to End of Day in UTC or Local? stored as UTC)
        // Assuming date param is YYYY-MM-DD, we construct the range.
        // In a real app, careful with TZ. Here we assume the server handles dates as UTC ISOs.
        // We'll capture the full 24h of that calendar date.

        // Naively: 
        const startOfDay = new Date(`${date}T00:00:00.000Z`);
        const endOfDay = new Date(`${date}T23:59:59.999Z`);

        // 5. Fetch Data
        // We need theaters and their bookings.
        const theaterWhere: any = { is_active: true };
        if (theaterId) {
            theaterWhere.id = theaterId;
        }

        const theaters = await db.theater.findMany({
            where: theaterWhere,
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                type: true,
                operational_hours: true,
                bookings: {
                    where: {
                        // Overlap check or just containment? Usually containment within day.
                        // Booking START is within the day OR Booking END is within the day OR Booking spans the day.
                        // Simplest: AND(start < endOfDay, end > startOfDay) for intersection.
                        start_time: { lt: endOfDay },
                        end_time: { gt: startOfDay },
                        status: { in: ['CONFIRMED', 'PROVISIONAL', 'COMPLETED'] }, // Exclude CANCELLED
                    },
                    select: {
                        id: true,
                        start_time: true, // DateTime
                        end_time: true,   // DateTime
                        status: true,
                        locked_by: true,
                        lock_expires_at: true,
                        surgical_case: {
                            select: {
                                id: true,
                                procedure_name: true,
                                urgency: true,
                                patient: {
                                    select: {
                                        first_name: true,
                                        last_name: true,
                                        file_number: true,
                                    }
                                },
                                primary_surgeon: {
                                    select: { name: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const now = new Date();

        // 6. Map Data & Filter Expired Provisionals
        const mappedTheaters = theaters.map(t => {
            const validBookings = t.bookings.filter(b => {
                if (b.status === 'PROVISIONAL') {
                    // Filter if expired and not confirmed
                    if (b.lock_expires_at && b.lock_expires_at < now) {
                        return false;
                    }
                }
                return true;
            }).map(b => ({
                id: b.id,
                theaterId: t.id,
                startTime: b.start_time.toISOString(),
                endTime: b.end_time.toISOString(),
                status: b.status,
                lockedByUserId: b.locked_by,
                caseId: b.surgical_case.id,
                patientName: `${b.surgical_case.patient.first_name} ${b.surgical_case.patient.last_name}`,
                fileNumber: b.surgical_case.patient.file_number,
                procedureName: b.surgical_case.procedure_name,
                surgeonName: b.surgical_case.primary_surgeon.name,
                urgency: b.surgical_case.urgency
            }));

            return {
                id: t.id,
                name: t.name,
                type: t.type,
                operationalHours: t.operational_hours, // Pass through JSON string or parse if needed.
                bookings: validBookings
            };
        });

        timer.end({ count: mappedTheaters.length });

        return NextResponse.json({
            success: true,
            data: mappedTheaters
        });

    } catch (error) {
        console.error('[API] GET /api/scheduling/timeline - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
