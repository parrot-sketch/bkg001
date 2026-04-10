/**
 * GET /api/theater-tech/surgical-cases/consultations
 * 
 * Returns completed consultations that can be used to create new surgical cases
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const today = startOfDay(new Date());
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const consultations = await db.consultation.findMany({
            where: {
                AND: [
                    { completed_at: { not: null } },
                    { completed_at: { gte: thirtyDaysAgo } },
                ],
            },
            include: {
                appointment: {
                    include: {
                        patient: {
                            select: { id: true, first_name: true, last_name: true, file_number: true },
                        },
                    },
                },
                surgical_case: {
                    select: { id: true },
                },
            },
            orderBy: { completed_at: 'desc' },
            take: 50,
        });

        // Filter out consultations that already have surgical cases
        const withoutCase = consultations.filter(c => !c.surgical_case);

        const mapped = withoutCase.map(c => ({
            id: c.id,
            patient: c.appointment?.patient,
            completed_at: c.completed_at,
            appointment: c.appointment,
        }));

        return NextResponse.json({ success: true, data: mapped });
    } catch (error) {
        console.error('Error fetching consultations:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch consultations' }, { status: 500 });
    }
}