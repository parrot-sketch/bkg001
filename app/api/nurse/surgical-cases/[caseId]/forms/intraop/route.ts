
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
import { ClinicalFormStatus, Gender, SurgicalRole } from '@prisma/client';
import { endpointTimer } from '@/lib/observability/endpointLogger';
import { GateBlockedError } from '@/application/errors/GateBlockedError';
import {
    INTRAOP_TEMPLATE_KEY,
    INTRAOP_TEMPLATE_VERSION,
    nurseIntraOpRecordDraftSchema,
    createEmptyIntraOpDraft,
    getIntraOpSectionCompletion,
} from '@/domain/clinical-forms/NurseIntraOpRecord';
import { PatientVerificationService } from '@/domain/services/PatientVerificationService';

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
                    date_of_birth: true,
                    gender: true,
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
            },
            // Fetch accepted staff invites to pre-populate the staffing section
            staff_invites: {
                where: { status: 'ACCEPTED' },
                select: {
                    invited_role: true,
                    invited_user: {
                        select: { first_name: true, last_name: true },
                    },
                },
            },
        },
    });
}

/**
 * Build a staffing snapshot from accepted StaffInvites.
 * Maps SurgicalRole → staffing field name expected by the intra-op form.
 */
function buildSuggestedStaffing(surgicalCase: {
    primary_surgeon: { name: string } | null;
    staff_invites: Array<{ invited_role: SurgicalRole; invited_user: { first_name: string | null; last_name: string | null } }>;
}) {
    const fullName = (u: { first_name: string | null; last_name: string | null }) =>
        `${u.first_name || ''} ${u.last_name || ''}`.trim();

    // Start with the surgeon from case record (always present)
    const staffing: Record<string, string> = {
        surgeon: surgicalCase.primary_surgeon?.name || '',
        assistant: '',
        anaesthesiologist: '',
        scrubNurse: '',
        circulatingNurse: '',
    };

    // Override / fill from accepted invites
    for (const inv of surgicalCase.staff_invites) {
        switch (inv.invited_role) {
            case 'SURGEON':
                staffing.surgeon = fullName(inv.invited_user);
                break;
            case 'ASSISTANT_SURGEON':
                staffing.assistant = fullName(inv.invited_user);
                break;
            case 'ANESTHESIOLOGIST':
            case 'ANESTHETIST_NURSE':
                if (!staffing.anaesthesiologist) {
                    staffing.anaesthesiologist = fullName(inv.invited_user);
                }
                break;
            case 'SCRUB_NURSE':
                staffing.scrubNurse = fullName(inv.invited_user);
                break;
            case 'CIRCULATING_NURSE':
                staffing.circulatingNurse = fullName(inv.invited_user);
                break;
        }
    }
    return staffing;
}

function yesNoFromAutoTrue(value: boolean | null | undefined): 'Y' | undefined {
    return value ? 'Y' : undefined;
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

            // Auto-populate safety checks from patient verification data
            const verificationService = new PatientVerificationService(db);
            const autoPopulatedChecks = await verificationService.getAutoPopulatedSafetyChecks(
                surgicalCase.patient_id,
                caseId,
            );

            const staffing = buildSuggestedStaffing(surgicalCase);
            const patientName = `${surgicalCase.patient.first_name} ${surgicalCase.patient.last_name}`.trim();
            const age = surgicalCase.patient.date_of_birth
                ? new Date().getFullYear() - new Date(surgicalCase.patient.date_of_birth).getFullYear()
                : undefined;

            const sex =
                surgicalCase.patient.gender === Gender.MALE
                    ? 'Male'
                    : surgicalCase.patient.gender === Gender.FEMALE
                        ? 'Female'
                        : surgicalCase.patient.gender === Gender.OTHER
                            ? 'Other'
                            : undefined;

            const emptyData = {
                ...createEmptyIntraOpDraft(),
                patientFileNo: surgicalCase.patient.file_number || '',
                patientName,
                age,
                sex,
                doctor: surgicalCase.primary_surgeon?.name || '',
                allergies: autoPopulatedChecks.allergies || surgicalCase.patient.allergies || '',
                // Auto-populate safety checks only when we have a positive verification signal
                patientIdVerified: yesNoFromAutoTrue(autoPopulatedChecks.patientIdVerified),
                informedConsentSigned: yesNoFromAutoTrue(autoPopulatedChecks.informedConsentSigned),
                preOpChecklistCompleted: yesNoFromAutoTrue(autoPopulatedChecks.preOpChecklistCompleted),
                // Case context
                preOpDiagnosis: surgicalCase.diagnosis || '',
                operationsPerformed: surgicalCase.procedure_name || '',
                // Suggested staffing snapshot
                surgeon: staffing.surgeon || '',
                assistant: staffing.assistant || '',
                anaesthesiologist: staffing.anaesthesiologist || '',
                scrubNurse: staffing.scrubNurse || '',
                circulatingNurse: staffing.circulatingNurse || '',
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

        // Get verification data for auto-population info
        const verificationService = new PatientVerificationService(db);
        const verificationData = await verificationService.getPatientVerificationData(
            surgicalCase.patient_id,
            caseId,
        );
        const autoPopulatedChecks = await verificationService.getAutoPopulatedSafetyChecks(
            surgicalCase.patient_id,
            caseId,
        );

        const suggestedStaffing = buildSuggestedStaffing(surgicalCase);
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
                // Pre-populated team from accepted StaffInvites + primary surgeon
                suggestedStaffing,
                // Verification data for auto-population
                verificationData: {
                    autoPopulatedChecks,
                    sources: autoPopulatedChecks.verificationSources,
                },
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
            const { estimatedBloodLossML, urinaryOutputML } = parsed.data;
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

            return up;
        });

        // Apply inventory usage events (if any)
        let usageResult: any = null;
        try {
            const { getClinicalInventoryIntegrationService } = await import('@/lib/factories/clinicalInventoryIntegrationFactory');
            const integrationService = getClinicalInventoryIntegrationService();
            const events = await integrationService.extractUsageEventsFromIntraop(
                caseId,
                updated.id,
                JSON.stringify(parsed.data)
            );

            if (events.length > 0) {
                usageResult = await integrationService.applyUsageEvents(caseId, events, {
                    userId: auth.user.userId,
                });
            }
        } catch (error) {
            // If usage fails, return error (don't partially save)
            if (error instanceof GateBlockedError) {
                return NextResponse.json({
                    success: false,
                    error: error.message,
                    code: 'GATE_BLOCKED',
                    metadata: error.metadata,
                }, { status: 422 });
            }
            // Log but don't fail form save for non-critical errors
            console.error('[API] Intra-op usage integration error:', error);
        }

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
            data: {
                ...mapResponseDto(updated),
                usageIntegration: usageResult ? {
                    appliedUsageCount: usageResult.appliedUsageCount,
                    appliedBillLinesCount: usageResult.appliedBillLinesCount,
                    isIdempotentReplaySummary: usageResult.isIdempotentReplaySummary,
                    stockWarnings: usageResult.stockWarnings,
                } : null,
            },
            message: 'Intra-op record draft saved',
        });
    } catch (error) {
        console.error('[API] PUT intraop form error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
