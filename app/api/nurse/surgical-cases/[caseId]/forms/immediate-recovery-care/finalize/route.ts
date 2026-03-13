/**
 * API Route: POST /api/nurse/surgical-cases/[caseId]/forms/immediate-recovery-care/finalize
 *
 * Validates all required fields and marks the record as FINAL.
 * Sets signedByUserId + signedAt.
 *
 * Security: NURSE only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ClinicalFormStatus } from '@prisma/client';
import {
    RECOVERY_CARE_TEMPLATE_KEY,
    RECOVERY_CARE_TEMPLATE_VERSION,
    immediateRecoveryCareRecordFinalSchema,
    getMissingRecoveryCareItems,
} from '@/domain/clinical-forms/ImmediateRecoveryCareRecord';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const { caseId } = await context.params;

        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        if (authResult.user.role !== Role.NURSE) {
            return NextResponse.json({ success: false, error: 'Only nurses can finalize this record' }, { status: 403 });
        }

        const userId = authResult.user.userId;

        // Find existing record
        const existing = await db.clinicalFormResponse.findUnique({
            where: {
                template_key_template_version_surgical_case_id: {
                    template_key: RECOVERY_CARE_TEMPLATE_KEY,
                    template_version: RECOVERY_CARE_TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                },
            },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'No record draft found. Start the record first.' },
                { status: 404 },
            );
        }

        if (existing.status === ClinicalFormStatus.FINAL) {
            return NextResponse.json(
                { success: false, error: 'Record is already finalized.' },
                { status: 409 },
            );
        }

        // Parse current data and validate with FINAL schema
        let currentData: unknown;
        try {
            currentData = JSON.parse(existing.data_json);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Stored form data is corrupted.' },
                { status: 500 },
            );
        }

        const parsed = immediateRecoveryCareRecordFinalSchema.safeParse(currentData);
        if (!parsed.success) {
            const missingItems = getMissingRecoveryCareItems(currentData as any);
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

        // Transaction: finalize + audit
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

            // Audit trail
            await tx.clinicalAuditEvent.create({
                data: {
                    actor_user_id: userId,
                    action_type: 'IMMEDIATE_RECOVERY_CARE_FINALIZED',
                    entity_type: 'ClinicalFormResponse',
                    entity_id: updated.id,
                    metadata: JSON.stringify({
                        surgicalCaseId: caseId,
                        templateKey: RECOVERY_CARE_TEMPLATE_KEY,
                        templateVersion: RECOVERY_CARE_TEMPLATE_VERSION,
                    }),
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
            message: 'Immediate Recovery Care Record finalized successfully',
        });
    } catch (error) {
        console.error('[API] POST immediate-recovery-care finalize error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
