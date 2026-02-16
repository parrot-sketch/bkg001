/**
 * API Route: POST /api/nurse/surgical-cases/[caseId]/forms/preop-ward/finalize
 *
 * Validates all required fields and marks the checklist as FINAL.
 * Sets signedByUserId + signedAt. Emits audit event.
 *
 * Security: NURSE only.
 *
 * Uses a transaction to ensure atomicity:
 * 1. Validate form data against final schema
 * 2. Update form status to FINAL + set signature
 * 3. Log audit event
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ClinicalFormStatus } from '@prisma/client';
import {
    TEMPLATE_KEY,
    TEMPLATE_VERSION,
    nursePreopWardChecklistFinalSchema,
    getMissingChecklistItems,
} from '@/domain/clinical-forms/NursePreopWardChecklist';

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
            return NextResponse.json({ success: false, error: 'Only nurses can finalize the pre-op checklist' }, { status: 403 });
        }

        const userId = authResult.user.userId;

        // 2. Find existing form response
        const existing = await db.clinicalFormResponse.findUnique({
            where: {
                template_key_template_version_surgical_case_id: {
                    template_key: TEMPLATE_KEY,
                    template_version: TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                },
            },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'No checklist draft found. Start the checklist first.' },
                { status: 404 },
            );
        }

        if (existing.status === ClinicalFormStatus.FINAL) {
            return NextResponse.json(
                { success: false, error: 'Checklist is already finalized.' },
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

        const parsed = nursePreopWardChecklistFinalSchema.safeParse(currentData);
        if (!parsed.success) {
            const missingItems = getMissingChecklistItems(currentData as any);
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
                    data_json: JSON.stringify(parsed.data), // Normalized validated data
                    signed_by_user_id: userId,
                    signed_at: now,
                    updated_by_user_id: userId,
                },
            });

            // Audit
            await tx.clinicalAuditEvent.create({
                data: {
                    actor_user_id: userId,
                    action_type: 'PREOP_CHECKLIST_FINALIZED',
                    entity_type: 'ClinicalFormResponse',
                    entity_id: updated.id,
                    metadata: JSON.stringify({
                        surgicalCaseId: caseId,
                        templateKey: TEMPLATE_KEY,
                        templateVersion: TEMPLATE_VERSION,
                    }),
                },
            });

            // Also log to general AuditLog for backwards compatibility
            await tx.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: caseId,
                    action: 'FINALIZE',
                    model: 'NursePreopWardChecklist',
                    details: `Pre-operative ward checklist finalized for surgical case ${caseId}`,
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
            message: 'Checklist finalized successfully',
        });
    } catch (error) {
        console.error('[API] POST preop-ward finalize error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
