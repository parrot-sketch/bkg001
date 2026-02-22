/**
 * API Route: POST /api/nurse/surgical-cases/[caseId]/forms/preop-ward/amend
 *
 * Opens a finalized ward-prep checklist for amendment.
 * - Only NURSE role may amend.
 * - Only a FINAL record may be amended.
 * - Requires a `reason` string (min 10 chars) in request body.
 * - Takes a JSON snapshot of the current data and prepends it to `_amendments[]`.
 * - Sets status → AMENDMENT so the PUT route will allow edits again.
 * - Emits an audit event.
 *
 * After amendment the nurse edits the form as normal (PUT drafts),
 * then calls the existing /finalize endpoint to seal it again as FINAL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ClinicalFormStatus } from '@prisma/client';
import { TEMPLATE_KEY, TEMPLATE_VERSION } from '@/domain/clinical-forms/NursePreopWardChecklist';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const { caseId } = await context.params;

        // 1. Auth — NURSE only
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 },
            );
        }
        if (authResult.user.role !== Role.NURSE) {
            return NextResponse.json(
                { success: false, error: 'Only nurses can create checklist amendments' },
                { status: 403 },
            );
        }

        const userId = authResult.user.userId;

        // 2. Parse body — must have a non-trivial reason
        let reason: string;
        try {
            const body = await request.json();
            reason = typeof body.reason === 'string' ? body.reason.trim() : '';
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid request body' },
                { status: 400 },
            );
        }

        if (reason.length < 10) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Amendment reason must be at least 10 characters.',
                },
                { status: 422 },
            );
        }

        // 3. Load existing record
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
                { success: false, error: 'No checklist found for this case.' },
                { status: 404 },
            );
        }

        if (existing.status !== ClinicalFormStatus.FINAL) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Only a FINAL checklist can be amended. Current status: ${existing.status}.`,
                },
                { status: 409 },
            );
        }

        // 4. Build updated data_json: preserve live fields, append amendment snapshot
        let currentData: Record<string, unknown>;
        try {
            currentData = JSON.parse(existing.data_json);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Stored form data is corrupted.' },
                { status: 500 },
            );
        }

        const previousAmendments = Array.isArray(currentData._amendments)
            ? (currentData._amendments as unknown[])
            : [];

        const snapshot = {
            amendedAt: new Date().toISOString(),
            amendedBy: userId,
            reason,
            // Store a deep copy of data at the moment of amendment (exclude _amendments to avoid nesting)
            snapshot: Object.fromEntries(
                Object.entries(currentData).filter(([k]) => k !== '_amendments'),
            ),
        };

        const updatedData = {
            ...currentData,
            _amendments: [...previousAmendments, snapshot],
        };

        // 5. Transaction: set status AMENDMENT + audit
        const amended = await db.$transaction(async (tx) => {
            const updated = await tx.clinicalFormResponse.update({
                where: { id: existing.id },
                data: {
                    status: ClinicalFormStatus.AMENDMENT,
                    data_json: JSON.stringify(updatedData),
                    updated_by_user_id: userId,
                    // Clear the previous signature — will be re-set on re-finalize
                    signed_by_user_id: null,
                    signed_at: null,
                },
            });

            await tx.clinicalAuditEvent.create({
                data: {
                    actor_user_id: userId,
                    action_type: 'PREOP_CHECKLIST_AMENDMENT_STARTED',
                    entity_type: 'ClinicalFormResponse',
                    entity_id: updated.id,
                    metadata: JSON.stringify({
                        surgicalCaseId: caseId,
                        reason,
                        templateKey: TEMPLATE_KEY,
                        templateVersion: TEMPLATE_VERSION,
                    }),
                },
            });

            await tx.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: caseId,
                    action: 'AMEND',
                    model: 'NursePreopWardChecklist',
                    details: `Amendment started for pre-op checklist (case ${caseId}). Reason: ${reason}`,
                },
            });

            return updated;
        });

        return NextResponse.json({
            success: true,
            data: {
                id: amended.id,
                status: amended.status,
                amendmentCount: previousAmendments.length + 1,
            },
            message: 'Checklist opened for amendment. Please make corrections and re-finalize.',
        });
    } catch (error) {
        console.error('[API] POST preop-ward amend error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 },
        );
    }
}
