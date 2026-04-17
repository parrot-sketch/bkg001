/**
 * API Route: POST /api/nurse/surgical-cases/[caseId]/mark-in-theater
 *
 * Marks a patient as having entered the theater.
 * Transitions case status from IN_PREP → IN_THEATER.
 *
 * Security:
 * - Requires authentication
 * - Only NURSE role can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { SurgicalCaseStatusTransitionService } from '@/application/services/SurgicalCaseStatusTransitionService';
import { SurgicalCaseStatus } from '@prisma/client';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const { caseId } = await context.params;

        // 1. Auth — NURSE only
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (authResult.user.role !== Role.NURSE) {
            return NextResponse.json({ success: false, error: 'Only nurses can mark patient in theater' }, { status: 403 });
        }

        const userId = authResult.user.userId;

        // 2. Load current status
        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: { id: true, status: true },
        });

        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }

        // 3. Transition status:
        // We intentionally support a "one-click" nurse action from the theatre support queue:
        // - SCHEDULED → IN_PREP (if needed)
        // - IN_PREP → IN_THEATER
        //
        // If the case is already IN_THEATER, this is idempotent.
        const statusTransitionService = new SurgicalCaseStatusTransitionService(db);
        if (surgicalCase.status === SurgicalCaseStatus.SCHEDULED) {
            await statusTransitionService.transitionToInPrep(caseId, userId);
        }
        if (surgicalCase.status !== SurgicalCaseStatus.IN_THEATER) {
            await statusTransitionService.transitionToInTheater(caseId, userId);
        }

        // 4. Verify resulting status (avoid false-positive "success" responses)
        const updated = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: { status: true },
        });

        if (!updated) {
            return NextResponse.json({ success: false, error: 'Surgical case not found after update' }, { status: 404 });
        }

        if (updated.status !== SurgicalCaseStatus.IN_THEATER) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Cannot mark patient in theater from status ${surgicalCase.status}`,
                    data: { caseId, status: updated.status },
                },
                { status: 422 },
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Patient marked as in theater',
            data: {
                caseId,
                status: updated.status,
            },
        });
    } catch (error: any) {
        console.error('[API] POST mark-in-theater error:', error);
        
        // Handle transition validation errors
        if (error.message?.includes('Cannot transition') || error.message?.includes('Invalid state transition')) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 422 },
            );
        }

        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
        );
    }
}
