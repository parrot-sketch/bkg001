/**
 * API Routes: Surgeon Operative Note
 *
 * GET  /api/doctor/surgical-cases/[caseId]/forms/operative-note
 *   Returns existing form response or creates a new DRAFT with prefills
 *   from CasePlan + IntraOpRecord + ProcedureRecord.
 *
 * PUT  /api/doctor/surgical-cases/[caseId]/forms/operative-note
 *   Saves draft updates (validated with draft schema).
 *
 * Security:
 * - GET: DOCTOR (case owner), NURSE, THEATER_TECHNICIAN (read-only), ADMIN (read-only)
 * - PUT: DOCTOR (case owner) only
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ClinicalFormStatus } from '@prisma/client';
import { endpointTimer } from '@/lib/observability/endpointLogger';
import {
    OPERATIVE_NOTE_TEMPLATE_KEY,
    OPERATIVE_NOTE_TEMPLATE_VERSION,
    surgeonOperativeNoteDraftSchema,
    getOperativeNoteSectionCompletion,
    prefillImplantsFromIntraOp,
    prefillSpecimensFromIntraOp,
    getNurseCountDiscrepancy,
} from '@/domain/clinical-forms/SurgeonOperativeNote';
import {
    INTRAOP_TEMPLATE_KEY,
    INTRAOP_TEMPLATE_VERSION,
} from '@/domain/clinical-forms/NurseIntraOpRecord';

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

type AuthSuccess = { success: true; user: { userId: string; role: string; email?: string } };
type AuthFailure = { success: false; error: NextResponse };

const READ_ROLES = [Role.DOCTOR, Role.NURSE, Role.THEATER_TECHNICIAN, Role.ADMIN];
const WRITE_ROLES = [Role.DOCTOR];

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

async function getSurgicalCaseWithRelations(caseId: string) {
    return db.surgicalCase.findUnique({
        where: { id: caseId },
        select: {
            id: true,
            patient_id: true,
            primary_surgeon_id: true,
            status: true,
            diagnosis: true,
            procedure_name: true,
            side: true,
            patient: {
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    file_number: true,
                    allergies: true,
                },
            },
            primary_surgeon: {
                select: { id: true, name: true },
            },
            procedure_record: {
                select: {
                    id: true,
                    pre_op_diagnosis: true,
                    post_op_diagnosis: true,
                    procedure_performed: true,
                    anesthesia_type: true,
                    staff: {
                        select: {
                            id: true,
                            role: true,
                            user: {
                                select: {
                                    id: true,
                                    first_name: true,
                                    last_name: true,
                                },
                            },
                        },
                    },
                },
            },
            checklist: {
                select: {
                    sign_out_completed_at: true,
                    sign_out_items: true,
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
}, nurseHasDiscrepancy = false) {
    const data = JSON.parse(response.data_json);
    return {
        id: response.id,
        templateKey: response.template_key,
        templateVersion: response.template_version,
        status: response.status,
        data,
        sectionCompletion: getOperativeNoteSectionCompletion(data, nurseHasDiscrepancy),
        signedByUserId: response.signed_by_user_id,
        signedAt: response.signed_at,
        createdByUserId: response.created_by_user_id,
        updatedByUserId: response.updated_by_user_id,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
    };
}

/**
 * Fetch the nurse intra-op record data for prefilling and discrepancy checks.
 */
async function getNurseIntraOpData(caseId: string) {
    const intraOp = await db.clinicalFormResponse.findUnique({
        where: {
            template_key_template_version_surgical_case_id: {
                template_key: INTRAOP_TEMPLATE_KEY,
                template_version: INTRAOP_TEMPLATE_VERSION,
                surgical_case_id: caseId,
            },
        },
        select: {
            data_json: true,
            status: true,
        },
    });

    if (!intraOp) return null;

    try {
        return {
            data: JSON.parse(intraOp.data_json) as Record<string, any>,
            status: intraOp.status,
        };
    } catch {
        return null;
    }
}

/**
 * Build prefilled data from CasePlan, ProcedureRecord, and Nurse IntraOpRecord.
 */
function buildPrefillData(
    surgicalCase: NonNullable<Awaited<ReturnType<typeof getSurgicalCaseWithRelations>>>,
    nurseIntraOp: { data: Record<string, any>; status: ClinicalFormStatus } | null,
) {
    const procRecord = surgicalCase.procedure_record;

    // Header prefills
    const header: Record<string, any> = {
        diagnosisPreOp: procRecord?.pre_op_diagnosis ?? surgicalCase.diagnosis ?? '',
        diagnosisPostOp: procRecord?.post_op_diagnosis ?? '',
        procedurePerformed: procRecord?.procedure_performed ?? surgicalCase.procedure_name ?? '',
        side: surgicalCase.side ?? '',
        surgeonId: surgicalCase.primary_surgeon_id,
        surgeonName: surgicalCase.primary_surgeon?.name ?? '',
        anesthesiaType: procRecord?.anesthesia_type ?? undefined,
    };

    // Assistants from procedure record staff
    const assistants: Array<{ userId: string; name: string; role: string }> = [];
    if (procRecord?.staff) {
        for (const s of procRecord.staff) {
            if (s.user && s.role !== 'SURGEON') {
                assistants.push({
                    userId: s.user.id,
                    name: `${s.user.first_name} ${s.user.last_name}`.trim(),
                    role: s.role,
                });
            }
        }
    }
    header.assistants = assistants;

    // Implants + Specimens from nurse intra-op
    const implantsUsed = nurseIntraOp
        ? prefillImplantsFromIntraOp(nurseIntraOp.data?.implantsUsed)
        : [];

    const specimens = nurseIntraOp
        ? prefillSpecimensFromIntraOp(nurseIntraOp.data?.specimens)
        : [];

    // Counts discrepancy from nurse
    const nurseHasDiscrepancy = nurseIntraOp
        ? getNurseCountDiscrepancy(nurseIntraOp.data?.counts)
        : false;

    return {
        header,
        findingsAndSteps: {},
        intraOpMetrics: {},
        implantsUsed: { implantsUsed },
        specimens: { specimens },
        complications: { complicationsOccurred: false },
        countsConfirmation: {
            countsCorrect: !nurseHasDiscrepancy,
            countsExplanation: '',
        },
        postOpPlan: {},
    };
}

// ──────────────────────────────────────────────────────────────────────
// GET — Retrieve or auto-create DRAFT with prefills
// ──────────────────────────────────────────────────────────────────────

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const { caseId } = await context.params;
        const auth = await authenticateAndAuthorize(request, READ_ROLES);
        if (!auth.success) return auth.error;

        const timer = endpointTimer('GET /api/doctor/forms/operative-note');
        const surgicalCase = await getSurgicalCaseWithRelations(caseId);
        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }

        // Fetch nurse intra-op data for prefills + discrepancy check
        const nurseIntraOp = await getNurseIntraOpData(caseId);
        const nurseHasDiscrepancy = nurseIntraOp
            ? getNurseCountDiscrepancy(nurseIntraOp.data?.counts)
            : false;

        let response = await db.clinicalFormResponse.findUnique({
            where: {
                template_key_template_version_surgical_case_id: {
                    template_key: OPERATIVE_NOTE_TEMPLATE_KEY,
                    template_version: OPERATIVE_NOTE_TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                },
            },
        });

        // Auto-create DRAFT if none exists (DOCTOR only)
        if (!response) {
            if (auth.user.role !== Role.DOCTOR) {
                return NextResponse.json({
                    success: true,
                    data: null,
                    message: 'No operative note started yet',
                });
            }

            const template = await db.clinicalFormTemplate.findFirst({
                where: {
                    key: OPERATIVE_NOTE_TEMPLATE_KEY,
                    version: OPERATIVE_NOTE_TEMPLATE_VERSION,
                    is_active: true,
                },
            });
            if (!template) {
                return NextResponse.json(
                    { success: false, error: 'Operative note template not found. Contact admin.' },
                    { status: 500 },
                );
            }

            const prefillData = buildPrefillData(surgicalCase, nurseIntraOp);

            response = await db.clinicalFormResponse.create({
                data: {
                    template_id: template.id,
                    template_key: OPERATIVE_NOTE_TEMPLATE_KEY,
                    template_version: OPERATIVE_NOTE_TEMPLATE_VERSION,
                    surgical_case_id: caseId,
                    patient_id: surgicalCase.patient_id,
                    status: ClinicalFormStatus.DRAFT,
                    data_json: JSON.stringify(prefillData),
                    created_by_user_id: auth.user.userId,
                },
            });
        }

        timer.end({ caseId });
        return NextResponse.json({
            success: true,
            data: {
                form: mapResponseDto(response, nurseHasDiscrepancy),
                patient: surgicalCase.patient,
                caseStatus: surgicalCase.status,
                procedureName: surgicalCase.procedure_name,
                side: surgicalCase.side,
                surgeonName: surgicalCase.primary_surgeon?.name,
                nurseIntraOpStatus: nurseIntraOp?.status ?? null,
                nurseHasDiscrepancy,
            },
        });
    } catch (error) {
        console.error('[API] GET operative-note error:', error);
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
        const auth = await authenticateAndAuthorize(request, WRITE_ROLES);
        if (!auth.success) return auth.error;

        // Verify case ownership
        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: { primary_surgeon_id: true },
        });
        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }

        // Find doctor record for current user
        const doctor = await db.doctor.findFirst({
            where: { user_id: auth.user.userId },
            select: { id: true },
        });
        if (!doctor || doctor.id !== surgicalCase.primary_surgeon_id) {
            return NextResponse.json(
                { success: false, error: 'Only the case surgeon can edit the operative note' },
                { status: 403 },
            );
        }

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
                { success: false, error: 'No operative note draft found. Open the form first.' },
                { status: 404 },
            );
        }

        if (existing.status === ClinicalFormStatus.FINAL) {
            return NextResponse.json(
                { success: false, error: 'Operative note is finalized and locked.' },
                { status: 409 },
            );
        }

        const body = await request.json();
        const parsed = surgeonOperativeNoteDraftSchema.safeParse(body.data);
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

        // Fetch nurse discrepancy for section completion
        const nurseIntraOp = await getNurseIntraOpData(caseId);
        const nurseHasDiscrepancy = nurseIntraOp
            ? getNurseCountDiscrepancy(nurseIntraOp.data?.counts)
            : false;

        const updated = await db.clinicalFormResponse.update({
            where: { id: existing.id },
            data: {
                data_json: JSON.stringify(parsed.data),
                updated_by_user_id: auth.user.userId,
            },
        });

        await db.clinicalAuditEvent.create({
            data: {
                actor_user_id: auth.user.userId,
                action_type: 'OPERATIVE_NOTE_DRAFT_SAVED',
                entity_type: 'ClinicalFormResponse',
                entity_id: updated.id,
                metadata: JSON.stringify({ surgicalCaseId: caseId }),
            },
        });

        return NextResponse.json({
            success: true,
            data: mapResponseDto(updated, nurseHasDiscrepancy),
            message: 'Operative note draft saved',
        });
    } catch (error) {
        console.error('[API] PUT operative-note error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────────────────────────
// POST — Import/refresh data from intra-op record (idempotent)
// ──────────────────────────────────────────────────────────────────────

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const { caseId } = await context.params;
        const auth = await authenticateAndAuthorize(request, WRITE_ROLES);
        if (!auth.success) return auth.error;

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
                { success: false, error: 'No operative note draft found.' },
                { status: 404 },
            );
        }

        if (existing.status === ClinicalFormStatus.FINAL) {
            return NextResponse.json(
                { success: false, error: 'Cannot import into a finalized operative note.' },
                { status: 409 },
            );
        }

        const nurseIntraOp = await getNurseIntraOpData(caseId);
        if (!nurseIntraOp) {
            return NextResponse.json(
                { success: false, error: 'No nurse intra-op record found to import from.' },
                { status: 404 },
            );
        }

        const currentData = JSON.parse(existing.data_json);
        const nurseHasDiscrepancy = getNurseCountDiscrepancy(nurseIntraOp.data?.counts);

        // Merge: overwrite implants and specimens from nurse record
        currentData.implantsUsed = {
            implantsUsed: prefillImplantsFromIntraOp(nurseIntraOp.data?.implantsUsed),
        };
        currentData.specimens = {
            specimens: prefillSpecimensFromIntraOp(nurseIntraOp.data?.specimens),
        };
        // Update counts if nurse flagged discrepancy
        if (nurseHasDiscrepancy) {
            currentData.countsConfirmation = {
                ...currentData.countsConfirmation,
                countsCorrect: false,
            };
        }

        const updated = await db.clinicalFormResponse.update({
            where: { id: existing.id },
            data: {
                data_json: JSON.stringify(currentData),
                updated_by_user_id: auth.user.userId,
            },
        });

        await db.clinicalAuditEvent.create({
            data: {
                actor_user_id: auth.user.userId,
                action_type: 'OPERATIVE_NOTE_INTRAOP_IMPORTED',
                entity_type: 'ClinicalFormResponse',
                entity_id: updated.id,
                metadata: JSON.stringify({
                    surgicalCaseId: caseId,
                    nurseIntraOpStatus: nurseIntraOp.status,
                    nurseHasDiscrepancy,
                }),
            },
        });

        return NextResponse.json({
            success: true,
            data: mapResponseDto(updated, nurseHasDiscrepancy),
            message: 'Intra-op data imported into operative note',
        });
    } catch (error) {
        console.error('[API] POST operative-note import error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
