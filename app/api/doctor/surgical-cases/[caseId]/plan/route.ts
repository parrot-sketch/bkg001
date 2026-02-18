/**
 * API Route: GET/PATCH /api/doctor/surgical-cases/[caseId]/plan
 *
 * Case-centric plan API — the primary planning endpoint.
 *
 * GET  — returns surgical case + full plan data including readiness checklist
 * PATCH — partial update of plan sections (procedure, risk, anesthesia, etc.)
 *
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can access
 * - Doctor must be the primary surgeon on the case
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { AnesthesiaType, CaseReadinessStatus, SurgicalCaseStatus } from '@prisma/client';
import { getMissingPlanningItems } from '@/domain/helpers/planningReadiness';
import { endpointTimer } from '@/lib/observability/endpointLogger';

// ─── Validation ──────────────────────────────────────────────────────────

const VALID_ANESTHESIA_TYPES = Object.values(AnesthesiaType);

/** Strip HTML tags and check for meaningful content */
function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
}

interface ValidationError { field: string; message: string; }

function validatePatchPayload(body: Record<string, any>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate anesthesiaPlan is a known enum value if provided
    if (body.anesthesiaPlan !== undefined && body.anesthesiaPlan !== null && body.anesthesiaPlan !== '') {
        if (!VALID_ANESTHESIA_TYPES.includes(body.anesthesiaPlan)) {
            errors.push({
                field: 'anesthesiaPlan',
                message: `Invalid anesthesia type. Valid values: ${VALID_ANESTHESIA_TYPES.join(', ')}`,
            });
        }
    }

    // Validate procedurePlan isn't just empty HTML
    if (body.procedurePlan !== undefined && body.procedurePlan !== null) {
        const raw = stripHtml(body.procedurePlan);
        if (body.procedurePlan.length > 0 && raw.length === 0) {
            errors.push({
                field: 'procedurePlan',
                message: 'Procedure plan cannot be empty HTML tags. Please enter meaningful content.',
            });
        }
    }

    // Validate estimatedDurationMinutes bounds (for P1)
    if (body.estimatedDurationMinutes !== undefined && body.estimatedDurationMinutes !== null) {
        const dur = Number(body.estimatedDurationMinutes);
        if (isNaN(dur) || dur < 15 || dur > 600) {
            errors.push({
                field: 'estimatedDurationMinutes',
                message: 'Estimated duration must be between 15 and 600 minutes.',
            });
        }
    }

    return errors;
}

// ─── Shared ─────────────────────────────────────────────────────────────

async function resolveDoctorId(userId: string): Promise<string | null> {
    const doc = await db.doctor.findUnique({
        where: { user_id: userId },
        select: { id: true },
    });
    return doc?.id ?? null;
}

/** Map raw Prisma to a camelCase DTO with readiness checklist truth */
function mapCasePlanResponse(sc: any) {
    const cp = sc.case_plan;

    // Compute readiness using the canonical domain helper (single source of truth)
    const readinessResult = getMissingPlanningItems({
        procedurePlan: cp?.procedure_plan ?? null,
        riskFactors: cp?.risk_factors ?? null,
        plannedAnesthesia: cp?.planned_anesthesia ?? null,
        signedConsentCount: cp?.consents?.filter((c: any) => c.status === 'SIGNED').length ?? 0,
        preOpPhotoCount: cp?.images?.filter((i: any) => i.timepoint === 'PRE_OP').length ?? 0,
    });

    const readinessChecklist = readinessResult.items.map(item => ({
        key: item.key,
        label: item.label,
        done: item.done,
    }));

    return {
        // Surgical Case
        id: sc.id,
        status: sc.status,
        urgency: sc.urgency,
        staffInvites: (sc.staff_invites ?? []).map((invite: any) => ({
            id: invite.id,
            status: invite.status,
            invitedRole: invite.invited_role,
            invitedUser: {
                firstName: invite.invited_user.first_name,
                lastName: invite.invited_user.last_name,
                role: invite.invited_user.role,
            }
        })),
        diagnosis: sc.diagnosis,
        procedureName: sc.procedure_name,
        side: sc.side,
        createdAt: sc.created_at,
        updatedAt: sc.updated_at,

        // Patient
        patient: sc.patient
            ? {
                id: sc.patient.id,
                firstName: sc.patient.first_name,
                lastName: sc.patient.last_name,
                fileNumber: sc.patient.file_number,
                gender: sc.patient.gender,
                dateOfBirth: sc.patient.date_of_birth,
                allergies: sc.patient.allergies,
            }
            : null,

        // Surgeon
        primarySurgeon: sc.primary_surgeon
            ? { id: sc.primary_surgeon.id, name: sc.primary_surgeon.name }
            : null,

        // Consultation
        consultation: sc.consultation
            ? { id: sc.consultation.id, appointmentId: sc.consultation.appointment_id }
            : null,

        // Theater Booking
        theaterBooking: sc.theater_booking
            ? {
                id: sc.theater_booking.id,
                startTime: sc.theater_booking.start_time,
                endTime: sc.theater_booking.end_time,
                status: sc.theater_booking.status,
                theaterName: sc.theater_booking.theater?.name ?? null,
            }
            : null,

        // Case Plan (the main planning data)
        casePlan: cp
            ? {
                id: cp.id,
                appointmentId: cp.appointment_id,
                procedurePlan: cp.procedure_plan,
                riskFactors: cp.risk_factors,
                preOpNotes: cp.pre_op_notes,
                implantDetails: cp.implant_details,
                anesthesiaPlan: cp.planned_anesthesia,
                specialInstructions: cp.special_instructions,
                estimatedDurationMinutes: cp.estimated_duration_minutes,
                readinessStatus: cp.readiness_status,
                readyForSurgery: cp.ready_for_surgery,
                updatedAt: cp.updated_at,

                // Consent forms
                consents: (cp.consents ?? []).map((c: any) => ({
                    id: c.id,
                    title: c.title,
                    type: c.type,
                    status: c.status,
                    signedAt: c.signed_at,
                    createdAt: c.created_at,
                })),

                // Patient images
                images: (cp.images ?? []).map((img: any) => ({
                    id: img.id,
                    imageUrl: img.image_url,
                    thumbnailUrl: img.thumbnail_url,
                    angle: img.angle,
                    timepoint: img.timepoint,
                    description: img.description,
                    consentForMarketing: img.consent_for_marketing,
                    takenAt: img.taken_at,
                })),

                // Procedure record + team
                procedureRecord: cp.procedure_record
                    ? {
                        id: cp.procedure_record.id,
                        anesthesiaType: cp.procedure_record.anesthesia_type,
                        urgency: cp.procedure_record.urgency,
                        staff: (cp.procedure_record.staff ?? []).map((s: any) => ({
                            id: s.id,
                            role: s.role,
                            userId: s.user_id,
                            user: s.user
                                ? {
                                    id: s.user.id,
                                    firstName: s.user.first_name,
                                    lastName: s.user.last_name,
                                    role: s.user.role,
                                }
                                : null,
                        })),
                    }
                    : null,
            }
            : null,

        // Readiness truth from data — used by UI checklist
        readinessChecklist,
    };
}

// ─── GET ────────────────────────────────────────────────────────────────

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (authResult.user.role !== 'DOCTOR') {
            return NextResponse.json({ success: false, error: 'Forbidden: Doctors only' }, { status: 403 });
        }

        const doctorId = await resolveDoctorId(authResult.user.userId);
        if (!doctorId) {
            return NextResponse.json({ success: false, error: 'Doctor profile not found' }, { status: 404 });
        }

        const { caseId } = await context.params;
        const timer = endpointTimer('GET /api/doctor/surgical-cases/plan');

        const sc = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: {
                id: true,
                status: true,
                urgency: true,
                diagnosis: true,
                procedure_name: true,
                side: true,
                created_at: true,
                updated_at: true,
                primary_surgeon_id: true,
                patient: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        file_number: true,
                        gender: true,
                        date_of_birth: true,
                        allergies: true,
                    },
                },
                primary_surgeon: { select: { id: true, name: true } },
                consultation: { select: { id: true, appointment_id: true } },
                theater_booking: {
                    select: {
                        id: true,
                        start_time: true,
                        end_time: true,
                        status: true,
                        theater: { select: { name: true } },
                    },
                },
                case_plan: {
                    select: {
                        id: true,
                        appointment_id: true,
                        procedure_plan: true,
                        risk_factors: true,
                        pre_op_notes: true,
                        implant_details: true,
                        planned_anesthesia: true,
                        special_instructions: true,
                        estimated_duration_minutes: true,
                        readiness_status: true,
                        ready_for_surgery: true,
                        updated_at: true,
                        consents: {
                            select: { id: true, title: true, type: true, status: true, signed_at: true, created_at: true },
                            orderBy: { created_at: 'desc' },
                        },
                        images: {
                            select: { id: true, image_url: true, thumbnail_url: true, angle: true, timepoint: true, description: true, consent_for_marketing: true, taken_at: true },
                            orderBy: { taken_at: 'desc' },
                        },
                        procedure_record: {
                            select: {
                                id: true,
                                anesthesia_type: true,
                                urgency: true,
                                staff: {
                                    select: {
                                        id: true,
                                        role: true,
                                        user_id: true,
                                        user: {
                                            select: { id: true, first_name: true, last_name: true, role: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                staff_invites: {
                    select: {
                        id: true,
                        status: true,
                        invited_role: true,
                        invited_user: {
                            select: {
                                first_name: true,
                                last_name: true,
                                role: true,
                            }
                        }
                    }
                },
            },
        });

        if (!sc) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }

        // Authorization: doctor must be primary surgeon OR have an accepted invite
        const isPrimary = sc.primary_surgeon_id === doctorId;
        const hasAcceptedInvite = sc.staff_invites.some(
            (invite: any) =>
                invite.invited_user.id === authResult.user?.userId &&
                invite.status === 'ACCEPTED'
        );

        if (!isPrimary && !hasAcceptedInvite) {
            return NextResponse.json({ success: false, error: 'Forbidden: You are not authorized to view this surgical plan' }, { status: 403 });
        }

        timer.end({ caseId });
        return NextResponse.json({ success: true, data: mapCasePlanResponse(sc) });
    } catch (error) {
        console.error('[API] GET /api/doctor/surgical-cases/[caseId]/plan - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// ─── PATCH ──────────────────────────────────────────────────────────────

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (authResult.user.role !== 'DOCTOR') {
            return NextResponse.json({ success: false, error: 'Forbidden: Doctors only' }, { status: 403 });
        }

        const doctorId = await resolveDoctorId(authResult.user.userId);
        if (!doctorId) {
            return NextResponse.json({ success: false, error: 'Doctor profile not found' }, { status: 404 });
        }

        const { caseId } = await context.params;
        const body = await request.json();

        // Server-side field validation
        const validationErrors = validatePatchPayload(body);
        if (validationErrors.length > 0) {
            return NextResponse.json(
                { success: false, error: 'Validation failed', validationErrors },
                { status: 400 },
            );
        }

        // Validate the case exists and this doctor owns it
        const sc = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: {
                id: true,
                status: true,
                primary_surgeon_id: true,
                patient_id: true,
                case_plan: { select: { id: true, appointment_id: true } },
                consultation: { select: { appointment_id: true } },
            },
        });

        if (!sc) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }

        // Authorization: only the primary surgeon can modify the core plan
        if (sc.primary_surgeon_id !== doctorId) {
            return NextResponse.json({ success: false, error: 'Forbidden: Only the primary surgeon can modify the surgical plan' }, { status: 403 });
        }

        // Determine the appointment ID (from existing plan or consultation)
        const appointmentId = sc.case_plan?.appointment_id ?? sc.consultation?.appointment_id;
        if (!appointmentId) {
            return NextResponse.json(
                { success: false, error: 'No appointment linked to this case. Cannot create plan.' },
                { status: 422 },
            );
        }

        // Build update payload — only include fields that were sent
        const updateData: Record<string, any> = {};
        if (body.procedurePlan !== undefined) updateData.procedure_plan = body.procedurePlan;
        if (body.riskFactors !== undefined) updateData.risk_factors = body.riskFactors;
        if (body.preOpNotes !== undefined) updateData.pre_op_notes = body.preOpNotes;
        if (body.implantDetails !== undefined) updateData.implant_details = body.implantDetails;
        if (body.anesthesiaPlan !== undefined) updateData.planned_anesthesia = body.anesthesiaPlan;
        if (body.specialInstructions !== undefined) updateData.special_instructions = body.specialInstructions;
        if (body.estimatedDurationMinutes !== undefined) {
            updateData.estimated_duration_minutes = body.estimatedDurationMinutes === null
                ? null
                : Number(body.estimatedDurationMinutes);
        }
        if (body.readinessStatus !== undefined) {
            if (Object.values(CaseReadinessStatus).includes(body.readinessStatus)) {
                updateData.readiness_status = body.readinessStatus;
                updateData.ready_for_surgery = body.readinessStatus === CaseReadinessStatus.READY;
            }
        }

        // Transaction: upsert plan + auto-transition DRAFT → PLANNING
        const result = await db.$transaction(async (tx) => {
            // Upsert the case plan
            const updatedPlan = await tx.casePlan.upsert({
                where: sc.case_plan
                    ? { id: sc.case_plan.id }
                    : { appointment_id: appointmentId },
                update: updateData,
                create: {
                    appointment_id: appointmentId,
                    patient_id: sc.patient_id,
                    doctor_id: doctorId,
                    surgical_case_id: caseId,
                    ...updateData,
                },
            });

            // Update Surgical Case fields if provided
            if (body.procedureName !== undefined || body.side !== undefined || body.diagnosis !== undefined) {
                const caseUpdate: any = {};
                if (body.procedureName !== undefined) caseUpdate.procedure_name = body.procedureName;
                if (body.side !== undefined) caseUpdate.side = body.side;
                if (body.diagnosis !== undefined) caseUpdate.diagnosis = body.diagnosis;

                await tx.surgicalCase.update({
                    where: { id: caseId },
                    data: caseUpdate,
                });
            }

            // Ensure plan is linked to case
            if (!sc.case_plan) {
                await tx.casePlan.update({
                    where: { id: updatedPlan.id },
                    data: { surgical_case_id: caseId },
                });
            }

            // Auto-transition DRAFT → PLANNING when plan is being actively worked on
            if (sc.status === SurgicalCaseStatus.DRAFT) {
                await tx.surgicalCase.update({
                    where: { id: caseId },
                    data: { status: SurgicalCaseStatus.PLANNING },
                });
            }

            // Audit log
            await tx.auditLog.create({
                data: {
                    user_id: authResult.user!.userId,
                    record_id: caseId,
                    action: 'UPDATE',
                    model: 'CasePlan',
                    details: `Surgical plan updated for case ${caseId}. Fields: ${Object.keys(updateData).join(', ')}`,
                },
            });

            return updatedPlan;
        });

        // Reload full case for response
        const reloaded = await db.surgicalCase.findUnique({
            where: { id: caseId },
            include: {
                patient: {
                    select: {
                        id: true, first_name: true, last_name: true,
                        file_number: true, gender: true, date_of_birth: true, allergies: true,
                    },
                },
                primary_surgeon: { select: { id: true, name: true } },
                consultation: { select: { id: true, appointment_id: true } },
                theater_booking: { include: { theater: { select: { name: true } } } },
                staff_invites: {
                    select: {
                        id: true,
                        status: true,
                        invited_role: true,
                        invited_user: {
                            select: {
                                first_name: true,
                                last_name: true,
                                role: true,
                            }
                        }
                    }
                },
                case_plan: {
                    include: {
                        consents: { orderBy: { created_at: 'desc' } },
                        images: { orderBy: { taken_at: 'desc' } },
                        procedure_record: {
                            include: {
                                staff: {
                                    include: {
                                        user: { select: { id: true, first_name: true, last_name: true, role: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: reloaded ? mapCasePlanResponse(reloaded) : null,
            message: 'Plan updated successfully',
        });
    } catch (error) {
        console.error('[API] PATCH /api/doctor/surgical-cases/[caseId]/plan - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
