/**
 * API Route: POST /api/doctor/surgical-cases/[id]/mark-ready
 *
 * Transitions a surgical case from PLANNING → READY_FOR_SCHEDULING.
 *
 * Business rules enforced by SurgicalCaseService:
 * - Case must be in PLANNING status
 * - Doctor planning items complete (procedure, risk, anesthesia, consent, photo)
 * - Nurse pre-op checklist complete (ready_for_surgery = true)
 *
 * On failure returns structured { missingItems, completedCount, totalRequired }
 * so the UI can render a targeted checklist.
 *
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can access
 * - Doctor must be the primary surgeon on the case
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { SurgicalCaseStatus } from '@prisma/client';
import db from '@/lib/db';
import { surgicalCaseService, surgicalCaseRepo } from '@/lib/factories/theaterTechFactory';
import { ReadinessValidationError } from '@/application/services/SurgicalCaseService';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
    try {
        // 1. Authenticate
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 },
            );
        }

        // 2. Authorize (Doctor only)
        if (authResult.user.role !== 'DOCTOR') {
            return NextResponse.json(
                { success: false, error: 'Forbidden: Doctors only' },
                { status: 403 },
            );
        }

        const { id: caseId } = await context.params;

        // 3. Verify the doctor owns this case
        const doctorProfile = await db.doctor.findUnique({
            where: { user_id: authResult.user.userId },
        });

        if (!doctorProfile) {
            return NextResponse.json(
                { success: false, error: 'Doctor profile not found' },
                { status: 404 },
            );
        }

        const surgicalCase = await surgicalCaseRepo.findById(caseId);
        if (!surgicalCase) {
            return NextResponse.json(
                { success: false, error: 'Surgical case not found' },
                { status: 404 },
            );
        }

        if ((surgicalCase as any).primary_surgeon_id !== doctorProfile.id) {
            return NextResponse.json(
                { success: false, error: 'Forbidden: You are not the primary surgeon on this case' },
                { status: 403 },
            );
        }

        // 4. Execute the transition (includes readiness validation)
        const updated = await surgicalCaseService.transitionTo(
            caseId,
            SurgicalCaseStatus.READY_FOR_SCHEDULING,
            authResult.user.userId,
        );

        // 5. Audit log — mark ready is a significant clinical event
        await db.auditLog.create({
            data: {
                user_id: authResult.user.userId,
                record_id: caseId,
                action: 'UPDATE',
                model: 'SurgicalCase',
                details: `Case marked READY_FOR_SCHEDULING. Previous status: ${(surgicalCase as any).status}`,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                status: updated.status,
                previousStatus: (surgicalCase as any).status,
                transitionedAt: new Date().toISOString(),
            },
            message: 'Case marked as ready for scheduling',
        });
    } catch (error) {
        console.error('[API] POST /api/doctor/surgical-cases/[id]/mark-ready - Error:', error);

        // Structured readiness failure → 422 with missingItems
        if (error instanceof ReadinessValidationError) {
            return NextResponse.json(
                {
                    success: false,
                    error: error.message,
                    missingItems: error.missingItems,
                    completedCount: error.completedCount,
                    totalRequired: error.totalRequired,
                },
                { status: 422 },
            );
        }

        const message = error instanceof Error ? error.message : 'Unknown error';

        // Other business rule violations → 422
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
