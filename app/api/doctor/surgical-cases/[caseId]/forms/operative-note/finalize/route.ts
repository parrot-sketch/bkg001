/**
 * API Route: POST /api/doctor/surgical-cases/[caseId]/forms/operative-note/finalize
 *
 * Validates all required fields and marks the operative note as FINAL.
 * Sets signedByUserId + signedAt. Emits audit event.
 *
 * Critical validations:
 * - All required sections must be complete
 * - If nurse intra-op record has count discrepancy → countsCorrect must be false + explanation
 * - Complications details required if complications occurred
 * - Operative steps must be meaningful (min length, no filler)
 *
 * Security: DOCTOR (case owner) only.
 * Uses a transaction for atomicity.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ClinicalFormStatus } from '@prisma/client';
import {
    OPERATIVE_NOTE_TEMPLATE_KEY,
    OPERATIVE_NOTE_TEMPLATE_VERSION,
    buildSurgeonOperativeNoteFinalSchema,
    getMissingOperativeNoteItems,
    getNurseCountDiscrepancy,
    surgeonOperativeNoteDraftSchema,
} from '@/domain/clinical-forms/SurgeonOperativeNote';
import {
    INTRAOP_TEMPLATE_KEY,
    INTRAOP_TEMPLATE_VERSION,
} from '@/domain/clinical-forms/NurseIntraOpRecord';
import { makeServerSignatureSvgDataUrl } from '@/lib/crypto/makeServerSignatureSvgDataUrl';
import { computeSignatureProof } from '@/lib/crypto/signatureProof';

function getClientIp(request: NextRequest): string | undefined {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0]?.trim() || undefined;
    return request.headers.get('x-real-ip') || undefined;
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const { caseId } = await context.params;

        // 1. Auth — DOCTOR only
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (authResult.user.role !== Role.DOCTOR) {
            return NextResponse.json({ success: false, error: 'Only doctors can finalize the operative note' }, { status: 403 });
        }

        const userId = authResult.user.userId;

        // 2. Verify case ownership
        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: {
                primary_surgeon_id: true,
                primary_surgeon: { select: { name: true } },
                team_members: { select: { role: true, name: true } },
            },
        });
        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }

        const doctor = await db.doctor.findFirst({
            where: { user_id: userId },
            select: { id: true, name: true },
        });
        if (!doctor || doctor.id !== surgicalCase.primary_surgeon_id) {
            return NextResponse.json(
                { success: false, error: 'Only the case surgeon can finalize the operative note' },
                { status: 403 },
            );
        }

        // 3. Find existing form response
        const existing = await db.clinicalFormResponse.findUnique({
            where: {
                template_key_template_version_surgical_case_id: {
                    template_key: OPERATIVE_NOTE_TEMPLATE_KEY,
                    template_version: OPERATIVE_NOTE_TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                },
            },
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'No operative note draft found. Start the note first.' },
                { status: 404 },
            );
        }

        if (existing.status === ClinicalFormStatus.FINAL) {
            return NextResponse.json(
                { success: false, error: 'Operative note is already finalized.' },
                { status: 409 },
            );
        }

        // 4. Check nurse intra-op record for count discrepancy
        const nurseIntraOp = await db.clinicalFormResponse.findUnique({
            where: {
                template_key_template_version_surgical_case_id: {
                    template_key: INTRAOP_TEMPLATE_KEY,
                    template_version: INTRAOP_TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                },
            },
            select: { data_json: true, status: true },
        });

        let nurseHasDiscrepancy = false;
        if (nurseIntraOp) {
            try {
                const nurseData = JSON.parse(nurseIntraOp.data_json);
                nurseHasDiscrepancy = getNurseCountDiscrepancy(nurseData);
            } catch {
                // Ignore parse errors on nurse record
            }
        }

        // 5. Parse current data and validate with FINAL schema
        let currentData: unknown;
        try {
            currentData = JSON.parse(existing.data_json);
        } catch {
            return NextResponse.json(
                { success: false, error: 'Stored form data is corrupted.' },
                { status: 500 },
            );
        }

        const normalizedDraft = surgeonOperativeNoteDraftSchema.safeParse(currentData);
        if (!normalizedDraft.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Stored form data failed draft validation.',
                    details: normalizedDraft.error.issues.map((i) => ({
                        path: i.path.join('.'),
                        message: i.message,
                    })),
                },
                { status: 422 },
            );
        }

        const now = new Date();
        const signedAtIso = now.toISOString();

        const scrubNurseName =
            surgicalCase.team_members.find((m) => m.role === 'SCRUB_NURSE')?.name?.trim() ||
            'Scrub Nurse';
        const anesthName =
            normalizedDraft.data.header?.anesthesiologistName?.trim() ||
            surgicalCase.team_members.find((m) => m.role === 'ANAESTHESIOLOGIST')?.name?.trim() ||
            surgicalCase.team_members.find((m) => m.role === 'ANESTHETIST_NURSE')?.name?.trim() ||
            '';
        const surgeonName =
            normalizedDraft.data.header?.surgeonName?.trim() ||
            surgicalCase.primary_surgeon?.name?.trim() ||
            doctor.name?.trim() ||
            'Surgeon';

        const nextData: any = {
            ...normalizedDraft.data,
            countsConfirmation: {
                ...(normalizedDraft.data.countsConfirmation ?? {}),
                scrubNurseSignaturePng: makeServerSignatureSvgDataUrl(scrubNurseName, signedAtIso),
                surgeonSignaturePage1Png: makeServerSignatureSvgDataUrl(surgeonName, signedAtIso),
            },
            operativeRecord: {
                ...(normalizedDraft.data.operativeRecord ?? {}),
                surgeonOrAnesthesiologistSignaturePng: makeServerSignatureSvgDataUrl(
                    anesthName ? `${surgeonName} / ${anesthName}` : surgeonName,
                    signedAtIso,
                ),
            },
        };

        const finalSchema = buildSurgeonOperativeNoteFinalSchema(nurseHasDiscrepancy);
        const parsed = finalSchema.safeParse(nextData);
        if (!parsed.success) {
            const missingItems = getMissingOperativeNoteItems(nextData as any, nurseHasDiscrepancy);
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

        const userAgent = request.headers.get('user-agent') || undefined;
        const ip = getClientIp(request);

        const proof = computeSignatureProof({
            payload: {
                caseId,
                formResponseId: existing.id,
                data: parsed.data,
                nurseHasDiscrepancy,
            },
            signedByUserId: userId,
            signedAtIso,
            userAgent,
            ip,
        });

        const finalizedData = { ...(parsed.data as any), signatureProof: proof };

        // 6. Transaction: finalize + audit

        const finalized = await db.$transaction(async (tx) => {
            const updated = await tx.clinicalFormResponse.update({
                where: { id: existing.id },
                data: {
                    status: ClinicalFormStatus.FINAL,
                    data_json: JSON.stringify(finalizedData),
                    signed_by_user_id: userId,
                    signed_at: now,
                    updated_by_user_id: userId,
                },
            });

            await tx.clinicalAuditEvent.create({
                data: {
                    actor_user_id: userId,
                    action_type: 'OPERATIVE_NOTE_FINALIZED',
                    entity_type: 'ClinicalFormResponse',
                    entity_id: updated.id,
                    metadata: JSON.stringify({
                        surgicalCaseId: caseId,
                        templateKey: OPERATIVE_NOTE_TEMPLATE_KEY,
                        templateVersion: OPERATIVE_NOTE_TEMPLATE_VERSION,
                        nurseHasDiscrepancy,
                        signatureHash: proof.hash,
                        algorithm: proof.algorithm,
                        complicationsOccurred: finalizedData.complications?.complicationsOccurred || false,
                    }),
                },
            });

            // Sync to SurgicalProcedureRecord (Medico-Legal Snapshot)
            // Extract snapshot data from finalized form
            const header = finalizedData.header;
            const assistantIds = header.assistants.map((a: any) => a.userId).filter(Boolean);

            await tx.surgicalProcedureRecord.upsert({
                where: { surgical_case_id: caseId },
                create: {
                    surgical_case_id: caseId,
                    pre_op_diagnosis: header.diagnosisPreOp, // Init with pre-op if new
                    post_op_diagnosis: header.diagnosisPostOp,
                    procedure_performed: header.procedurePerformed,
                    primary_surgeon_snapshot_id: header.surgeonId,
                    anesthesiologist_snapshot_id: header.anesthesiologistId || null,
                    assistant_surgeon_snapshot_ids: JSON.stringify(assistantIds),
                    urgency: 'ELECTIVE', // Default, should ideally come from case but schema requires it
                },
                update: {
                    post_op_diagnosis: header.diagnosisPostOp,
                    procedure_performed: header.procedurePerformed,
                    primary_surgeon_snapshot_id: header.surgeonId,
                    anesthesiologist_snapshot_id: header.anesthesiologistId || null,
                    assistant_surgeon_snapshot_ids: JSON.stringify(assistantIds),
                }
            });

            await tx.auditLog.create({
                data: {
                    user_id: userId,
                    record_id: caseId,
                    action: 'FINALIZE',
                    model: 'SurgeonOperativeNote',
                    details: `Surgeon operative note finalized for surgical case ${caseId}`,
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
            message: 'Operative note finalized successfully',
        });
    } catch (error) {
        console.error('[API] POST operative-note finalize error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
