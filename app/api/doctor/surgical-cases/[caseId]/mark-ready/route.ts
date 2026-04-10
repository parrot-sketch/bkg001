/**
 * API Route: POST /api/doctor/surgical-cases/[id]/mark-ready
 *
 * Transitions a surgical case from PLANNING → READY_FOR_WARD_PREP.
 * This marks the case as ready for the nurse to begin pre-op ward checklist.
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
import { getSurgicalCaseService, getSurgicalCaseRepo } from '@/lib/factories/theaterTechFactory';
import { ReadinessValidationError } from '@/application/services/SurgicalCaseService';
import { Role } from '@/domain/enums/Role';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
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

        const { caseId } = await context.params;

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

        // 3. Basic existence check
        const surgicalCaseRepo = getSurgicalCaseRepo();
        const currentCase = await surgicalCaseRepo.findById(caseId);
        if (!currentCase) {
            return NextResponse.json(
                { success: false, error: 'Surgical case not found' },
                { status: 404 },
            );
        }

        if ((currentCase as any).primary_surgeon_id !== doctorProfile.id) {
            return NextResponse.json(
                { success: false, error: 'Forbidden: You are not the primary surgeon on this case' },
                { status: 403 },
            );
        }

        // 4. Execute the transition (includes readiness validation)
        const surgicalCaseService = getSurgicalCaseService();
        const updated = await surgicalCaseService.transitionTo(
            caseId,
            SurgicalCaseStatus.READY_FOR_WARD_PREP,
            authResult.user.userId,
        );

        // 5. Audit log — mark ready is a significant clinical event
        await db.auditLog.create({
            data: {
                user_id: authResult.user.userId,
                record_id: caseId,
                action: 'UPDATE',
                model: 'SurgicalCase',
                details: `Case marked READY_FOR_WARD_PREP. Previous status: ${(currentCase as any).status}`,
            },
        });

        // 6. Notify Theater Tech to add team and items
        try {
            const theaterTechUsers = await db.user.findMany({
                where: { role: Role.THEATER_TECHNICIAN },
                select: { id: true },
            });

            const patient = await db.patient.findUnique({
                where: { id: (currentCase as any).patient_id },
                select: { first_name: true, last_name: true },
            });

            for (const tech of theaterTechUsers) {
                await db.notification.create({
                    data: {
                        user_id: tech.id,
                        type: 'IN_APP',
                        status: 'PENDING',
                        subject: 'New Case Ready for Theater Prep',
                        message: `Dr. ${doctorProfile.name} has completed the surgical plan for ${patient?.first_name} ${patient?.last_name}. Please add team members and planned items.`,
                        metadata: JSON.stringify({
                            event: 'THEATER_PREP_REQUIRED',
                            surgicalCaseId: caseId,
                            navigateTo: '/theater-tech/dashboard',
                        }),
                    },
                });
            }

            // Also notify Admin
            const adminUsers = await db.user.findMany({
                where: { role: Role.ADMIN },
                select: { id: true },
            });

            for (const admin of adminUsers) {
                await db.notification.create({
                    data: {
                        user_id: admin.id,
                        type: 'IN_APP',
                        status: 'PENDING',
                        subject: 'Surgical Case Ready for Ward Prep',
                        message: `Dr. ${doctorProfile.name} completed the plan for ${patient?.first_name} ${patient?.last_name}. Case is ready for pre-operative ward checklist.`,
                        metadata: JSON.stringify({
                            event: 'CASE_READY_FOR_WARD_PREP',
                            surgicalCaseId: caseId,
                            navigateTo: '/nurse/ward-prep',
                        }),
                    },
                });
            }
        } catch (notifError) {
            console.error('[API] Failed to send notifications:', notifError);
            // Don't fail the main request if notifications fail
        }

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                status: updated.status,
                previousStatus: (currentCase as any).status,
                transitionedAt: new Date().toISOString(),
            },
            message: 'Case marked as ready for ward prep',
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
