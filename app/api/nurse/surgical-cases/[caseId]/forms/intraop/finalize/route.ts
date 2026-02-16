/**
 * API Route: POST /api/nurse/surgical-cases/[caseId]/forms/intraop/finalize
 *
 * Validates all required fields and marks the intra-op record as FINAL.
 * Sets signedByUserId + signedAt. Emits audit event.
 *
 * Critical safety validation:
 * - Final counts must be completed
 * - Sign-out must be completed
 * - If count discrepancy flagged, notes must be provided
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
    INTRAOP_TEMPLATE_KEY,
    INTRAOP_TEMPLATE_VERSION,
    nurseIntraOpRecordFinalSchema,
    getMissingIntraOpItems,
} from '@/domain/clinical-forms/NurseIntraOpRecord';

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
            return NextResponse.json({ success: false, error: 'Only nurses can finalize the intra-op record' }, { status: 403 });
        }

        const userId = authResult.user.userId;

        // 2. Find existing form response
        const existing = await db.clinicalFormResponse.findUnique({
            where: {
                template_key_template_version_surgical_case_id: {
                    template_key: INTRAOP_TEMPLATE_KEY,
                    template_version: INTRAOP_TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                },
            },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'No intra-op record draft found. Start the record first.' },
                { status: 404 },
            );
        }

        if (existing.status === ClinicalFormStatus.FINAL) {
            return NextResponse.json(
                { success: false, error: 'Intra-op record is already finalized.' },
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

        const parsed = nurseIntraOpRecordFinalSchema.safeParse(currentData);
        if (!parsed.success) {
            const missingItems = getMissingIntraOpItems(currentData as any);
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
                    action_type: 'INTRAOP_RECORD_FINALIZED',
                    entity_type: 'ClinicalFormResponse',
                    entity_id: updated.id,
                    metadata: JSON.stringify({
                        surgicalCaseId: caseId,
                        templateKey: INTRAOP_TEMPLATE_KEY,
                        templateVersion: INTRAOP_TEMPLATE_VERSION,
                        countDiscrepancy: parsed.data.counts.countDiscrepancy,
                    }),
                },
            });

            await tx.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: caseId,
                    action: 'FINALIZE',
                    model: 'NurseIntraOpRecord',
                    details: `Intra-operative nurse record finalized for surgical case ${caseId}`,
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
            message: 'Intra-op record finalized successfully',
        });
    } catch (error) {
        console.error('[API] POST intraop finalize error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
