/**
 * API Route: GET /api/nurse/intra-op
 *
 * Nurse Intra-Op / Theatre Support Dashboard endpoint.
 *
 * Returns surgical cases currently in theater.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { SurgicalCaseStatus } from '@prisma/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        if (authResult.user.role !== Role.NURSE) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        // CORRECTED: Only show IN_THEATER (actively in surgery), not SCHEDULED (booked but not yet in theater)
        // Filter by theater booking date = today to show only today's surgeries
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const statusWhere = {
            status: SurgicalCaseStatus.IN_THEATER,
            theater_booking: {
                start_time: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        };

        const surgicalCases = await db.surgicalCase.findMany({
            where: statusWhere,
            orderBy: [{ theater_booking: { start_time: 'asc' } }], // Ordered by scheduled surgery time
            include: {
                patient: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        file_number: true,
                        date_of_birth: true,
                    },
                },
                primary_surgeon: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                theater_booking: {
                    select: {
                        theater: {
                            select: { name: true }
                        },
                        start_time: true,
                    }
                },
                procedure_record: {
                    select: {
                        id: true,
                        anesthesia_start: true,
                    }
                }
            },
        });

        const cases = surgicalCases.map((c) => ({
            id: c.id,
            status: c.status,
            urgency: c.urgency,
            procedureName: c.procedure_name,
            patient: c.patient
                ? {
                    id: c.patient.id,
                    fullName: `${c.patient.first_name} ${c.patient.last_name}`,
                    fileNumber: c.patient.file_number,
                    dateOfBirth: c.patient.date_of_birth,
                }
                : null,
            primarySurgeon: c.primary_surgeon
                ? { id: c.primary_surgeon.id, name: c.primary_surgeon.name }
                : null,
            theaterName: c.theater_booking?.theater?.name,
            startTime: c.procedure_record?.anesthesia_start || c.theater_booking?.start_time,
        }));

        return NextResponse.json({
            success: true,
            data: {
                cases,
                summary: {
                    total: cases.length,
                },
            },
        });
    } catch (error) {
        console.error('[API] /api/nurse/intra-op - Error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
