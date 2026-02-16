/**
 * API Route: POST /api/nurse/surgical-cases/[caseId]/forms/recovery/finalize
 *
 * Validates all required fields and marks the recovery record as FINAL.
 * Sets signedByUserId + signedAt. Emits audit event.
 *
 * Critical safety validation:
 * - All discharge criteria must be met (if not HOLD)
 * - At least one vitals observation or explicit reason
 * - Nurse signature / finalize metadata
 *
 * Security: NURSE only.
 * Uses a transaction for atomicity.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ClinicalFormStatus } from '@prisma/client';
import {
    RECOVERY_TEMPLATE_KEY,
    RECOVERY_TEMPLATE_VERSION,
    nurseRecoveryRecordFinalSchema,
    getMissingRecoveryItems,
} from '@/domain/clinical-forms/NurseRecoveryRecord';

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
            return NextResponse.json({ success: false, error: 'Only nurses can finalize the recovery record' }, { status: 403 });
        }

        const userId = authResult.user.userId;

        // 2. Find existing form response
        const existing = await db.clinicalFormResponse.findUnique({
            where: {
                template_key_template_version_surgical_case_id: {
                    template_key: RECOVERY_TEMPLATE_KEY,
                    template_version: RECOVERY_TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                },
            },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'No recovery record draft found. Start the record first.' },
                { status: 404 },
            );
        }

        if (existing.status === ClinicalFormStatus.FINAL) {
            return NextResponse.json(
                { success: false, error: 'Recovery record is already finalized.' },
                { status: 409 },
            );
        }

        // 3. Parse current data and validate with FINAL schema
        let currentData: unknown;
        try {
            currentData = JSON.parse(existing.data_json);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Stored form data is corrupted.' },
                { status: 500 },
            );
        }

        // Inject nurse signature metadata before validation
        const dataWithSignature = {
            ...(currentData as Record<string, unknown>),
            dischargeReadiness: {
                ...((currentData as any)?.dischargeReadiness ?? {}),
                finalizedByUserId: userId,
                finalizedAt: new Date().toISOString(),
            },
        };

        const parsed = nurseRecoveryRecordFinalSchema.safeParse(dataWithSignature);
        if (!parsed.success) {
            const missingItems = getMissingRecoveryItems(dataWithSignature);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Cannot finalize: required fields are missing.',
                    missingItems,
                    details: parsed.error.issues.map((i) => ({
                        path: i.path.join('.'),
                        message: i.message,
                    })),
                },
                { status: 422 },
            );
        }

        // 4. Transaction: finalize + audit
        const now = new Date();

        const finalized = await db.$transaction(async (tx) => {
            const updated = await tx.clinicalFormResponse.update({
                where: { id: existing.id },
                data: {
                    status: ClinicalFormStatus.FINAL,
                    data_json: JSON.stringify(parsed.data),
                    signed_by_user_id: userId,
                    signed_at: now,
                    updated_by_user_id: userId,
                },
            });

            await tx.clinicalAuditEvent.create({
                data: {
                    actor_user_id: userId,
                    action_type: 'RECOVERY_RECORD_FINALIZED',
                    entity_type: 'ClinicalFormResponse',
                    entity_id: updated.id,
                    metadata: JSON.stringify({
                        surgicalCaseId: caseId,
                        templateKey: RECOVERY_TEMPLATE_KEY,
                        templateVersion: RECOVERY_TEMPLATE_VERSION,
                        dischargeDecision: parsed.data.dischargeReadiness.dischargeDecision,
                        dischargeCriteria: parsed.data.dischargeReadiness.dischargeCriteria,
                    }),
                },
            });

            await tx.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: caseId,
                    action: 'FINALIZE',
                    model: 'NurseRecoveryRecord',
                    details: `Post-operative recovery record finalized for surgical case ${caseId}`,
                },
            });

            return updated;
        });

        return NextResponse.json({
            success: true,
            data: {
                id: finalized.id,
                status: finalized.status,
                signedAt: finalized.signed_at,
                signedByUserId: finalized.signed_by_user_id,
            },
            message: 'Recovery record finalized successfully',
        });
    } catch (error) {
        console.error('[API] POST recovery finalize error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
