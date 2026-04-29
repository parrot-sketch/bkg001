import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ClinicalFormStatus } from '@prisma/client';
import {
    INTRAOP_TEMPLATE_KEY,
    INTRAOP_TEMPLATE_VERSION,
    nurseIntraOpRecordDraftSchema,
    nurseIntraOpRecordFinalSchema,
    checkNurseRecoveryGateCompliance,
    type NurseIntraOpRecordDraft,
    type NurseIntraOpRecordData,
} from '@/domain/clinical-forms/NurseIntraOpRecord';
import { SurgicalCaseStatusTransitionService } from '@/application/services/SurgicalCaseStatusTransitionService';
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

        // 1. Auth — NURSE only
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (authResult.user.role !== Role.NURSE) {
            return NextResponse.json({ success: false, error: 'Only nurses can finalize the intra-op record' }, { status: 403 });
        }

        // 2. Load existing record
        const record = await db.clinicalFormResponse.findUnique({
            where: {
                template_key_template_version_surgical_case_id: {
                    template_key: INTRAOP_TEMPLATE_KEY,
                    template_version: INTRAOP_TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                }
            }
        });

        if (!record) {
            return NextResponse.json({ success: false, error: 'Intra-op record not found' }, { status: 404 });
        }

        if (record.status === ClinicalFormStatus.FINAL) {
            return NextResponse.json({ success: false, error: 'Intra-op record is already finalized' }, { status: 400 });
        }

        // 3. Validate for finalization
        let currentData: unknown;
        try {
            currentData = JSON.parse(record.data_json) as unknown;
        } catch {
            return NextResponse.json({ success: false, error: 'Corrupted form data' }, { status: 500 });
        }

        const draftParsed = nurseIntraOpRecordDraftSchema.safeParse(currentData);
        if (!draftParsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation failed',
                    missingItems: draftParsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
                },
                { status: 422 },
            );
        }

        const now = new Date();
        const signedAtIso = now.toISOString();

        const scrubName = (draftParsed.data.scrubNurse || '').trim() || 'Scrub Nurse';
        const circulatingName = (draftParsed.data.circulatingNurse || '').trim() || 'Circulating Nurse';

        const nextData: NurseIntraOpRecordDraft = {
            ...draftParsed.data,
            scrubNurseSignature: makeServerSignatureSvgDataUrl(scrubName, signedAtIso),
            circulatingNurseSignature: makeServerSignatureSvgDataUrl(circulatingName, signedAtIso),
        };

        const finalParsed = nurseIntraOpRecordFinalSchema.safeParse(nextData);
        if (!finalParsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Cannot finalize: required fields are missing.',
                    missingItems: finalParsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
                    details: finalParsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
                },
                { status: 422 },
            );
        }

        // Custom clinical gates (e.g. counts must be correct)
        const gateMissing = checkNurseRecoveryGateCompliance(finalParsed.data);
        if (gateMissing.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Clinical gate failure',
                    missingItems: gateMissing,
                },
                { status: 422 },
            );
        }

        const userAgent = request.headers.get('user-agent') || undefined;
        const ip = getClientIp(request);

        const proof = computeSignatureProof({
            payload: {
                caseId,
                formResponseId: record.id,
                data: finalParsed.data,
            },
            signedByUserId: authResult.user.userId,
            signedAtIso,
            userAgent,
            ip,
        });

        const finalizedData: NurseIntraOpRecordData = { ...finalParsed.data, signatureProof: proof };

        // 4. Update to FINAL status and persist signed data
        await db.$transaction(async (tx) => {
            await tx.clinicalFormResponse.update({
                where: { id: record.id },
                data: {
                    status: ClinicalFormStatus.FINAL,
                    data_json: JSON.stringify(finalizedData),
                    signed_by_user_id: authResult.user?.userId,
                    signed_at: now,
                    updated_by_user_id: authResult.user?.userId,
                }
            });

            // 5. Sync fluid totals to SurgicalProcedureRecord
            const { estimatedBloodLossML, urinaryOutputML } = finalizedData;
            if (estimatedBloodLossML !== undefined || urinaryOutputML !== undefined) {
                const procedureRecord = await tx.surgicalProcedureRecord.findUnique({
                    where: { surgical_case_id: caseId },
                });

                if (procedureRecord) {
                    await tx.surgicalProcedureRecord.update({
                        where: { id: procedureRecord.id },
                        data: {
                            estimated_blood_loss: estimatedBloodLossML ?? null,
                            urine_output: urinaryOutputML ?? null,
                        },
                    });
                }
            }

            // 6. Audit Trail entry — Corrected to ClinicalAuditEvent
            await tx.clinicalAuditEvent.create({
                data: {
                    actor_user_id: authResult.user?.userId || 'system',
                    action_type: 'FORM_FINALIZED',
                    entity_type: 'ClinicalFormResponse',
                    entity_id: record.id,
                    metadata: JSON.stringify({
                        template: INTRAOP_TEMPLATE_KEY,
                        version: INTRAOP_TEMPLATE_VERSION,
                        caseId,
                        signatureHash: proof.hash,
                        algorithm: proof.algorithm,
                        signedAt: signedAtIso,
                    }),
                }
            });
        });

        // 7. Auto-transition case status: Intra-op finalized → RECOVERY
        try {
            const statusTransitionService = new SurgicalCaseStatusTransitionService(db);
            await statusTransitionService.transitionToRecovery(caseId, authResult.user?.userId || 'system');
        } catch (error) {
            // Log but don't fail - status transition is best effort
            console.error('[API] Intra-op finalize: Status transition error:', error);
        }

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('[API] POST intraop finalize error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
