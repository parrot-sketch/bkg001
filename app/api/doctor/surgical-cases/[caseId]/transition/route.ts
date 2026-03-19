/**
 * API Route: POST /api/doctor/surgical-cases/[caseId]/transition
 * 
 * Transitions a surgical case to a new status.
 * 
 * Valid transitions from IN_THEATER:
 * - RECOVERY (when intra-op record is finalized)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { SurgicalCaseStatus } from '@prisma/client';
import db from '@/lib/db';
import { SurgicalCaseStatusTransitionService } from '@/application/services/SurgicalCaseStatusTransitionService';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 },
            );
        }

        if (authResult.user.role !== Role.DOCTOR) {
            return NextResponse.json(
                { success: false, error: 'Forbidden: Doctors only' },
                { status: 403 },
            );
        }

        const { caseId } = await context.params;
        const body = await request.json();
        const { status } = body;

        if (!status) {
            return NextResponse.json(
                { success: false, error: 'Status is required' },
                { status: 400 },
            );
        }

        const targetStatus = status as SurgicalCaseStatus;

        // Validate target status
        const validTransitions: Record<SurgicalCaseStatus, SurgicalCaseStatus[]> = {
            [SurgicalCaseStatus.DRAFT]: [],
            [SurgicalCaseStatus.PLANNING]: [],
            [SurgicalCaseStatus.READY_FOR_SCHEDULING]: [],
            [SurgicalCaseStatus.READY_FOR_THEATER_PREP]: [],
            [SurgicalCaseStatus.READY_FOR_THEATER_BOOKING]: [],
            [SurgicalCaseStatus.SCHEDULED]: [],
            [SurgicalCaseStatus.IN_PREP]: [],
            [SurgicalCaseStatus.IN_THEATER]: [SurgicalCaseStatus.RECOVERY],
            [SurgicalCaseStatus.RECOVERY]: [SurgicalCaseStatus.COMPLETED],
            [SurgicalCaseStatus.COMPLETED]: [],
            [SurgicalCaseStatus.CANCELLED]: [],
        };

        // Get current case status
        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: { status: true, primary_surgeon_id: true },
        });

        if (!surgicalCase) {
            return NextResponse.json(
                { success: false, error: 'Case not found' },
                { status: 404 },
            );
        }

        // Check if transition is valid
        const allowedTransitions = validTransitions[surgicalCase.status] || [];
        if (!allowedTransitions.includes(targetStatus)) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: `Cannot transition from ${surgicalCase.status} to ${targetStatus}`,
                    currentStatus: surgicalCase.status,
                },
                { status: 422 },
            );
        }

        // Execute transition
        const transitionService = new SurgicalCaseStatusTransitionService(db);
        
        switch (targetStatus) {
            case SurgicalCaseStatus.RECOVERY:
                await transitionService.transitionToRecovery(caseId, authResult.user.userId);
                break;
            case SurgicalCaseStatus.COMPLETED:
                await transitionService.transitionToCompleted(caseId, authResult.user.userId);
                break;
            default:
                return NextResponse.json(
                    { success: false, error: `Transition to ${targetStatus} not supported` },
                    { status: 400 },
                );
        }

        return NextResponse.json({
            success: true,
            message: `Case transitioned to ${targetStatus}`,
        });

    } catch (error) {
        console.error('[API] POST /api/doctor/surgical-cases/[caseId]/transition - Error:', error);
        
        const message = error instanceof Error ? error.message : 'Unknown error';
        
        if (message.includes('Cannot') || message.includes('transition')) {
            return NextResponse.json(
                { success: false, error: message },
                { status: 422 },
            );
        }

        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
        );
    }
}
