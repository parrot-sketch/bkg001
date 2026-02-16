/**
 * API Routes: Nurse Pre-Op Ward Checklist
 *
 * GET  /api/nurse/surgical-cases/[caseId]/forms/preop-ward
 *   Returns existing form response or creates a new DRAFT from template.
 *
 * PUT  /api/nurse/surgical-cases/[caseId]/forms/preop-ward
 *   Saves draft updates (validated with draft schema).
 *
 * Security:
 * - GET: NURSE (full) and DOCTOR (read-only summary)
 * - PUT: NURSE only
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ClinicalFormStatus } from '@prisma/client';
import { endpointTimer } from '@/lib/observability/endpointLogger';
import {
    TEMPLATE_KEY,
    TEMPLATE_VERSION,
    nursePreopWardChecklistDraftSchema,
    getSectionCompletion,
} from '@/domain/clinical-forms/NursePreopWardChecklist';

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

type AuthSuccess = { success: true; user: { userId: string; role: string; email?: string } };
type AuthFailure = { success: false; error: NextResponse };

async function authenticateAndAuthorize(
    request: NextRequest,
    allowedRoles: Role[],
): Promise<AuthSuccess | AuthFailure> {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
        return { success: false, error: NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 }) };
    }
    if (!allowedRoles.includes(authResult.user.role as Role)) {
        return { success: false, error: NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 }) };
    }
    return { success: true, user: authResult.user };
}

async function getSurgicalCaseWithPatient(caseId: string) {
    return db.surgicalCase.findUnique({
        where: { id: caseId },
        select: {
            id: true,
            patient_id: true,
            status: true,
            procedure_name: true,
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

function mapResponseDto(response: {
    id: string;
    template_key: string;
    template_version: number;
    status: ClinicalFormStatus;
    data_json: string;
    signed_by_user_id: string | null;
    signed_at: Date | null;
    created_by_user_id: string;
    updated_by_user_id: string | null;
    created_at: Date;
    updated_at: Date;
}) {
    const data = JSON.parse(response.data_json);
    return {
        id: response.id,
        templateKey: response.template_key,
        templateVersion: response.template_version,
        status: response.status,
        data,
        sectionCompletion: getSectionCompletion(data),
        signedByUserId: response.signed_by_user_id,
        signedAt: response.signed_at,
        createdByUserId: response.created_by_user_id,
        updatedByUserId: response.updated_by_user_id,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
    };
}

// ──────────────────────────────────────────────────────────────────────
// GET — Retrieve or auto-create DRAFT
// ──────────────────────────────────────────────────────────────────────

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const { caseId } = await context.params;
        const auth = await authenticateAndAuthorize(request, [Role.NURSE, Role.DOCTOR]);
        if (!auth.success) return auth.error;

        const timer = endpointTimer('GET /api/nurse/forms/preop-ward');
        // Verify surgical case exists
        const surgicalCase = await getSurgicalCaseWithPatient(caseId);
        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }

        // Look for existing response
        let response = await db.clinicalFormResponse.findUnique({
            where: {
                template_key_template_version_surgical_case_id: {
                    template_key: TEMPLATE_KEY,
                    template_version: TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                },
            },
        });

        // Auto-create DRAFT if none exists (NURSE only)
        if (!response) {
            if (auth.user.role !== Role.NURSE) {
                return NextResponse.json({
                    success: true,
                    data: null,
                    message: 'No checklist started yet',
                });
            }

            // Find the active template
            const template = await db.clinicalFormTemplate.findFirst({
                where: { key: TEMPLATE_KEY, version: TEMPLATE_VERSION, is_active: true },
            });
            if (!template) {
                return NextResponse.json(
                    { success: false, error: 'Form template not found. Contact admin.' },
                    { status: 500 },
                );
            }

            // Create empty DRAFT
            const emptyData = {
                documentation: {},
                bloodResults: {},
                medications: {},
                allergiesNpo: {},
                preparation: {},
                prosthetics: {},
                vitals: {},
                handover: {},
            };

            response = await db.clinicalFormResponse.create({
                data: {
                    template_id: template.id,
                    template_key: TEMPLATE_KEY,
                    template_version: TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                    patient_id: surgicalCase.patient_id,
                    status: ClinicalFormStatus.DRAFT,
                    data_json: JSON.stringify(emptyData),
                    created_by_user_id: auth.user.userId,
                },
            });
        }

        timer.end({ caseId });
        return NextResponse.json({
            success: true,
            data: {
                form: mapResponseDto(response),
                patient: surgicalCase.patient,
                caseStatus: surgicalCase.status,
                procedureName: surgicalCase.procedure_name,
            },
        });
    } catch (error) {
        console.error('[API] GET preop-ward form error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────────────────────────
// PUT — Save draft updates
// ──────────────────────────────────────────────────────────────────────

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const { caseId } = await context.params;
        const auth = await authenticateAndAuthorize(request, [Role.NURSE]);
        if (!auth.success) return auth.error;

        // Find existing form response
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
                { success: false, error: 'No draft found. Open the checklist first.' },
                { status: 404 },
            );
        }

        if (existing.status === ClinicalFormStatus.FINAL) {
            return NextResponse.json(
                { success: false, error: 'Checklist is finalized and locked. Create an amendment if needed.' },
                { status: 409 },
            );
        }

        // Parse and validate with draft schema (lenient)
        const body = await request.json();
        const parsed = nursePreopWardChecklistDraftSchema.safeParse(body.data);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation failed',
                    details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
                },
                { status: 400 },
            );
        }

        // Update
        const updated = await db.clinicalFormResponse.update({
            where: { id: existing.id },
            data: {
                data_json: JSON.stringify(parsed.data),
                updated_by_user_id: auth.user.userId,
            },
        });

        // Audit
        await db.clinicalAuditEvent.create({
            data: {
                actor_user_id: auth.user.userId,
                action_type: 'PREOP_CHECKLIST_DRAFT_SAVED',
                entity_type: 'ClinicalFormResponse',
                entity_id: updated.id,
                metadata: JSON.stringify({ surgicalCaseId: caseId }),
            },
        });

        return NextResponse.json({
            success: true,
            data: mapResponseDto(updated),
            message: 'Draft saved',
        });
    } catch (error) {
        console.error('[API] PUT preop-ward form error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
