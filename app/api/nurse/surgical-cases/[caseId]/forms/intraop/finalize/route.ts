import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ClinicalFormStatus } from '@prisma/client';
import {
    nurseIntraOpRecordFinalSchema,
    checkNurseRecoveryGateCompliance,
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

        // 2. Load existing record
        const record = await db.clinicalFormResponse.findUnique({
            where: {
                template_key_template_version_surgical_case_id: {
                    template_key: 'NURSE_INTRAOP_RECORD',
                    template_version: 2,
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
        let currentData: any;
        try {
            currentData = JSON.parse(record.data_json);
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Corrupted form data' }, { status: 500 });
        }

        // Domain validation (Zod)
        const validation = nurseIntraOpRecordFinalSchema.safeParse(currentData);
        if (!validation.success) {
            return NextResponse.json({
                success: false,
                error: 'Validation failed',
                details: validation.error.format()
            }, { status: 400 });
        }

        // Custom clinical gates (e.g. counts must be correct)
        const missingItems = checkNurseRecoveryGateCompliance(currentData as any);
        if (missingItems.length > 0) {
            return NextResponse.json({
                success: false,
                error: 'Clinical gate failure',
                missingItems
            }, { status: 400 });
        }

        // 4. Update to FINAL status and Record Signature
        await db.$transaction(async (tx) => {
            await tx.clinicalFormResponse.update({
                where: { id: record.id },
                data: {
                    status: ClinicalFormStatus.FINAL,
                    signed_by_user_id: authResult.user?.userId,
                    signed_at: new Date(),
                    updated_by_user_id: authResult.user?.userId,
                }
            });

            // 5. Audit Trail entry — Corrected to ClinicalAuditEvent
            await tx.clinicalAuditEvent.create({
                data: {
                    actor_user_id: authResult.user?.userId || 'system',
                    action_type: 'FORM_FINALIZED',
                    entity_type: 'ClinicalFormResponse',
                    entity_id: record.id,
                    metadata: JSON.stringify({
                        template: 'NURSE_INTRAOP_RECORD',
                        version: 2,
                        caseId
                    }),
                }
            });
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[API] POST intraop finalize error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
