/**
 * API Route: GET /api/theater-tech/surgical-cases
 * 
 * Returns surgical cases that need theater tech attention:
 * - READY_FOR_THEATER_BOOKING (pre-op complete, needs theater scheduling)
 * - READY_FOR_THEATER_PREP (theater prep in progress)
 * - SCHEDULED (confirmed cases)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { SurgicalCaseStatus } from '@prisma/client';
import db from '@/lib/db';

export async function GET(
    request: NextRequest,
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        // Get cases in relevant statuses for theater tech
        const cases = await db.surgicalCase.findMany({
            where: {
                status: {
                    in: [SurgicalCaseStatus.READY_FOR_THEATER_BOOKING, SurgicalCaseStatus.READY_FOR_THEATER_PREP, SurgicalCaseStatus.SCHEDULED],
                },
            },
            include: {
                patient: {
                    select: {
                        first_name: true,
                        last_name: true,
                        file_number: true,
                    },
                },
                primary_surgeon: {
                    select: {
                        name: true,
                        title: true,
                    },
                },
                team_members: true,
                case_plan: {
                    select: {
                        id: true,
                        planned_items: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        // Transform data
        const transformedCases = cases.map(c => ({
            id: c.id,
            status: c.status,
            procedure_name: c.procedure_name,
            patient: c.patient,
            primary_surgeon: c.primary_surgeon,
            created_at: c.created_at.toISOString(),
            team_members_count: c.team_members.length,
            planned_items_count: c.case_plan?.planned_items?.length || 0,
        }));

        return NextResponse.json({
            success: true,
            data: transformedCases,
        });

    } catch (error) {
        console.error('[API] GET /api/theater-tech/surgical-cases - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
