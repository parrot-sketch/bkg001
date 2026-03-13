/**
 * API Route: GET/POST /api/nurse/surgical-cases/[caseId]/forms/immediate-recovery-care
 *
 * Get or save the Immediate Recovery Care Record.
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
    immediateRecoveryCareRecordDraftSchema,
} from '@/domain/clinical-forms/ImmediateRecoveryCareRecord';

// ─── Helper: Get surgical case with patient ─────────────────────────────────

async function getSurgicalCaseWithPatient(caseId: string) {
    return db.surgicalCase.findUnique({
        where: { id: caseId },
        select: {
            id: true,
            patient_id: true,
            status: true,
            patient: {
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    file_number: true,
                    allergies: true,
                },
            },
        },
    });
}

// ─── GET ──────────────────────────────────────────────────────────────────

export async function GET(
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
            return NextResponse.json({ success: false, error: 'Only nurses can access this form' }, { status: 403 });
        }

        const record = await db.clinicalFormResponse.findUnique({
            where: {
                template_key_template_version_surgical_case_id: {
                    template_key: RECOVERY_CARE_TEMPLATE_KEY,
                    template_version: RECOVERY_CARE_TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                },
            },
        });

        if (!record) {
            return NextResponse.json({ success: false, error: 'No record found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: record.id,
                status: record.status,
                data: JSON.parse(record.data_json),
                createdAt: record.created_at,
                updatedAt: record.updated_at,
                signedByUserId: record.signed_by_user_id,
                signedAt: record.signed_at,
            },
        });
    } catch (error) {
        console.error('[API] GET immediate-recovery-care error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// ─── POST (Create or Update) ──────────────────────────────────────────────

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
            return NextResponse.json({ success: false, error: 'Only nurses can save this form' }, { status: 403 });
        }

        const userId = authResult.user.userId;
        const body = await request.json();

        // Validate draft data
        const parsed = immediateRecoveryCareRecordDraftSchema.safeParse(body.data);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid data',
                    details: parsed.error.issues.map((i) => ({
                        path: i.path.join('.'),
                        message: i.message,
                    })),
                },
                { status: 422 },
            );
        }

        // Get surgical case and patient
        const surgicalCase = await getSurgicalCaseWithPatient(caseId);
        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }

        // Get template (optional - fallback to 0 if not seeded)
        const template = await db.clinicalFormTemplate.findUnique({
            where: {
                key_version: { key: RECOVERY_CARE_TEMPLATE_KEY, version: RECOVERY_CARE_TEMPLATE_VERSION },
            },
        });

        const templateId = template?.id ?? 0;

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

        let record;
        const now = new Date();

        if (existing) {
            // Update existing draft
            if (existing.status === ClinicalFormStatus.FINAL) {
                return NextResponse.json(
                    { success: false, error: 'Cannot edit finalized record. Start an amendment.' },
                    { status: 409 },
                );
            }

            record = await db.clinicalFormResponse.update({
                where: { id: existing.id },
                data: {
                    data_json: JSON.stringify(parsed.data),
                    updated_by_user_id: userId,
                    updated_at: now,
                },
            });
        } else {
            // Create new draft
            record = await db.clinicalFormResponse.create({
                data: {
                    template_id: templateId,
                    template_key: RECOVERY_CARE_TEMPLATE_KEY,
                    template_version: RECOVERY_CARE_TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                    patient_id: surgicalCase.patient_id,
                    status: ClinicalFormStatus.DRAFT,
                    data_json: JSON.stringify(parsed.data),
                    created_by_user_id: userId,
                    updated_by_user_id: userId,
                    created_at: now,
                    updated_at: now,
                },
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: record.id,
                status: record.status,
            },
        });
    } catch (error) {
        console.error('[API] POST immediate-recovery-care error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
