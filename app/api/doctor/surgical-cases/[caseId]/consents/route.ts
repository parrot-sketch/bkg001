/**
 * API Route: GET /api/doctor/surgical-cases/[caseId]/consents
 *
 * Security:
 * - Requires authentication (DOCTOR or ADMIN)
 * 
 * Purpose:
 * Returns the list of signed consent forms attached to a surgical case plan.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const { caseId } = await context.params;

        // Verify the case exists
        const sc = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: {
                id: true,
                primary_surgeon_id: true,
                case_plan: { select: { id: true } },
            },
        });

        if (!sc) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }

        if (!sc.case_plan) {
            // No plan yet → no consents possible
            return NextResponse.json({ success: true, data: [] });
        }

        const consents = await db.consentForm.findMany({
            where: { case_plan_id: sc.case_plan.id },
            orderBy: { created_at: 'desc' },
            include: {
                documents: {
                    orderBy: {
                        version: 'desc'
                    }
                },
            }
        });

        return NextResponse.json({ success: true, data: consents });
    } catch (error) {
        console.error('[API] GET /api/doctor/surgical-cases/[caseId]/consents - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
