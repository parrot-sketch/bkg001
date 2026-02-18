/**
 * API Routes: Nurse Intra-Op Record
 *
 * GET  /api/nurse/surgical-cases/[caseId]/forms/intraop
 *   Returns existing form response or creates a new DRAFT from template.
 *
 * PUT  /api/nurse/surgical-cases/[caseId]/forms/intraop
 *   Saves draft updates (validated with draft schema).
 *
 * Security:
 * - GET: NURSE, DOCTOR, THEATER_TECHNICIAN (read-only summary for non-NURSE)
 * - PUT: NURSE only
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ClinicalFormStatus } from '@prisma/client';
import { endpointTimer } from '@/lib/observability/endpointLogger';
import {
    INTRAOP_TEMPLATE_KEY,
    INTRAOP_TEMPLATE_VERSION,
    nurseIntraOpRecordDraftSchema,
    getIntraOpSectionCompletion,
} from '@/domain/clinical-forms/NurseIntraOpRecord';

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
            side: true,
            diagnosis: true,
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
                select: { name: true },
            },
            case_plan: {
                select: {
                    procedure_plan: true,
                    pre_op_notes: true,
                    special_instructions: true,
                    planned_anesthesia: true,
                    implant_details: true,
                }
            }
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
        sectionCompletion: getIntraOpSectionCompletion(data),
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
        const auth = await authenticateAndAuthorize(request, [Role.NURSE, Role.DOCTOR, Role.THEATER_TECHNICIAN]);
        if (!auth.success) return auth.error;

        const timer = endpointTimer('GET /api/nurse/forms/intraop');
        const surgicalCase = await getSurgicalCaseWithPatient(caseId);
        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }

        let response = await db.clinicalFormResponse.findUnique({
            where: {
                template_key_template_version_surgical_case_id: {
                    template_key: INTRAOP_TEMPLATE_KEY,
                    template_version: INTRAOP_TEMPLATE_VERSION,
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
                    message: 'No intra-op record started yet',
                });
            }

            const template = await db.clinicalFormTemplate.findFirst({
                where: { key: INTRAOP_TEMPLATE_KEY, version: INTRAOP_TEMPLATE_VERSION, is_active: true },
            });
            if (!template) {
                return NextResponse.json(
                    { success: false, error: 'Intra-op record template not found. Contact admin.' },
                    { status: 500 },
                );
            }

            const emptyData = {
                entry: {
                    arrivalMethod: 'STRETCHER',
                    timeIn: '',
                    asaClass: '1',
                    allergies: surgicalCase.patient.allergies || ''
                },
                safety: {
                    patientIdVerified: false, informedConsentSigned: false,
                    preOpChecklistCompleted: false, whoChecklistCompleted: false,
                    arrivedWithIvInfusing: false, antibioticOrdered: false
                },
                timings: { timeIntoTheatre: '', timeOutOfTheatre: '', operationStart: '', operationFinish: '' },
                diagnoses: {
                    preOpDiagnosis: surgicalCase.diagnosis || '',
                    intraOpDiagnosis: '',
                    operationPerformed: surgicalCase.procedure_name || ''
                },
                positioning: { position: 'SUPINE', safetyBeltApplied: false, armsSecured: false, bodyAlignmentCorrect: false },
                catheter: { inSitu: false, insertedInTheatre: false },
                skinPrep: { prepAgent: 'HIBITANE_SPIRIT' },
                surgicalDetails: { woundClass: 'CLEAN', woundIrrigation: [], drainType: [] },
                equipment: {
                    electrosurgical: { cauteryUsed: false, cutSet: '30', coagSet: '30', skinCheckedBefore: false, skinCheckedAfter: false },
                    tourniquet: { tourniquetUsed: false, laterality: 'N/A', skinCheckedBefore: false, skinCheckedAfter: false }
                },
                staffing: {
                    surgeon: surgicalCase.primary_surgeon?.name || '',
                    assistant: '',
                    anaesthesiologist: '',
                    scrubNurse: '',
                    circulatingNurse: ''
                },
                anaesthesia: { type: 'GENERAL' },
                counts: {
                    items: [
                        { name: 'Abdominal Swabs', preliminary: 0, woundClosure: 0, final: 0 },
                        { name: 'Raytec Swabs', preliminary: 0, woundClosure: 0, final: 0 },
                        { name: 'Throat Packs', preliminary: 0, woundClosure: 0, final: 0 },
                        { name: 'Sharps', preliminary: 0, woundClosure: 0, final: 0 },
                        { name: 'Instruments', preliminary: 0, woundClosure: 0, final: 0 },
                    ],
                    countCorrect: true
                },
                closure: { skinClosure: '', dressingApplied: '' },
                fluids: {
                    bloodTransfusionPackedCellsMl: 0, bloodTransfusionWholeMl: 0,
                    bloodTransfusionOtherMl: 0, ivInfusionTotalMl: 0,
                    estimatedBloodLossMl: 0, urinaryOutputMl: 0
                },
                medications: [],
                implants: [],
                specimens: [],
                itemsToReturnToTheatre: '',
                billing: { anaestheticMaterialsCharge: '', theatreFee: '' }
            };

            response = await db.clinicalFormResponse.create({
                data: {
                    template_id: template.id,
                    template_key: INTRAOP_TEMPLATE_KEY,
                    template_version: INTRAOP_TEMPLATE_VERSION,
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
                surgeonName: surgicalCase.primary_surgeon?.name,
                casePlan: surgicalCase.case_plan,
            },
        });
    } catch (error) {
        console.error('[API] GET intraop form error:', error);
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
                { success: false, error: 'No intra-op record draft found. Open the form first.' },
                { status: 404 },
            );
        }

        if (existing.status === ClinicalFormStatus.FINAL) {
            return NextResponse.json(
                { success: false, error: 'Intra-op record is finalized and locked.' },
                { status: 409 },
            );
        }

        const body = await request.json();
        const parsed = nurseIntraOpRecordDraftSchema.safeParse(body.data);
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

        const updated = await db.$transaction(async (tx) => {
            const up = await tx.clinicalFormResponse.update({
                where: { id: existing.id },
                data: {
                    data_json: JSON.stringify(parsed.data),
                    updated_by_user_id: auth.user.userId,
                },
            });

            // Sync structured data to SurgicalProcedureRecord for real-time dashboard
            // Note: estimated_blood_loss and urine_output are currently not in schema
            // const fluids = parsed.data.fluids || {};
            // if (fluids.estimatedBloodLossMl !== undefined || fluids.urinaryOutputMl !== undefined) {
            //     const procedureRecord = await tx.surgicalProcedureRecord.findUnique({
            //         where: { surgical_case_id: caseId },
            //     });
            //
            //     if (procedureRecord) {
            //         await tx.surgicalProcedureRecord.update({
            //             where: { id: procedureRecord.id },
            //             data: {
            //                 estimated_blood_loss: fluids.estimatedBloodLossMl,
            //                 urine_output: fluids.urinaryOutputMl,
            //             },
            //         });
            //     }
            // }

            return up;
        });

        await db.clinicalAuditEvent.create({
            data: {
                actor_user_id: auth.user.userId,
                action_type: 'INTRAOP_RECORD_DRAFT_SAVED',
                entity_type: 'ClinicalFormResponse',
                entity_id: updated.id,
                metadata: JSON.stringify({ surgicalCaseId: caseId }),
            },
        });

        return NextResponse.json({
            success: true,
            data: mapResponseDto(updated),
            message: 'Intra-op record draft saved',
        });
    } catch (error) {
        console.error('[API] PUT intraop form error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
