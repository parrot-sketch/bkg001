import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { Role } from '@/domain/enums/Role';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> }
) {
    try {
        const { caseId } = await context.params;
        const auth = await JwtMiddleware.authenticate(request);
        
        if (!auth.success || !auth.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (auth.user.role !== Role.DOCTOR) {
            return NextResponse.json({ success: false, error: 'Doctors only.' }, { status: 403 });
        }

        const doctor = await db.doctor.findFirst({
            where: { user_id: auth.user.userId },
            select: { id: true },
        });
        if (!doctor) {
            return NextResponse.json({ success: false, error: 'Doctor record not found.' }, { status: 400 });
        }

        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: { id: true, primary_surgeon_id: true },
        });
        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
        }

        const casePlan = await db.casePlan.findFirst({
            where: { surgical_case_id: caseId },
            select: {
                doctor_id: true,
                pre_op_notes: true,
                procedure_plan: true,
                surgeon_narrative: true,
                equipment_notes: true,
                special_instructions: true,
                risk_factors: true,
                post_op_instructions: true,
                planned_anesthesia: true,
            }
        });

        // ── Membership gate ────────────────────────────────────────────────
        // "Membership" is expressed by:
        // 1) being the primary surgeon on the SurgicalCase, or
        // 2) having an ACCEPTED StaffInvite for this surgical_case_id, or
        // 3) being the author of the CasePlan (legacy/edge cases).
        const hasAcceptedInvite = await db.staffInvite.findFirst({
            where: {
                surgical_case_id: caseId,
                invited_user_id: auth.user.userId,
                status: 'ACCEPTED' as any,
            },
            select: { id: true },
        });

        const isPrimary = doctor.id === surgicalCase.primary_surgeon_id;
        const isAuthor = (casePlan?.doctor_id ? casePlan.doctor_id === doctor.id : false);
        const canView = isPrimary || isAuthor || !!hasAcceptedInvite;

        if (!canView) {
            return NextResponse.json(
                { success: false, error: 'Forbidden: You are not assigned to this surgical case.' },
                { status: 403 },
            );
        }

        const canEdit =
            isPrimary || isAuthor;

        // It is perfectly okay if casePlan is completely null initially
        const { doctor_id: _authorId, ...publicPlan } = (casePlan || {}) as any;
        return NextResponse.json({
            success: true,
            data: publicPlan,
            meta: { canEdit, canView },
        });

    } catch (error) {
        console.error('[GET Surgical Notes Error]:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ caseId: string }> }
) {
    try {
        const { caseId } = await context.params;
        const auth = await JwtMiddleware.authenticate(request);
        
        if (!auth.success || !auth.user || auth.user.role !== Role.DOCTOR) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Doctors only.' }, { status: 403 });
        }

        const body = await request.json();

        const doctor = await db.doctor.findFirst({
            where: { user_id: auth.user.userId },
            select: { id: true },
        });
        if (!doctor) {
            return NextResponse.json({ success: false, error: 'Doctor record not found.' }, { status: 400 });
        }
        
        // Find existing surgical case
        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: caseId },
            select: {
                id: true,
                patient_id: true,
                primary_surgeon_id: true,
                consultation: { select: { appointment_id: true } },
            },
        });

        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
        }

        const existingPlan = await db.casePlan.findFirst({
            where: { surgical_case_id: caseId },
            select: { id: true, doctor_id: true },
        });

        // Membership gate (same semantics as GET)
        const hasAcceptedInvite = await db.staffInvite.findFirst({
            where: {
                surgical_case_id: caseId,
                invited_user_id: auth.user.userId,
                status: 'ACCEPTED' as any,
            },
            select: { id: true },
        });

        const isPrimary = doctor.id === surgicalCase.primary_surgeon_id;
        const isAuthor = (existingPlan?.doctor_id ? existingPlan.doctor_id === doctor.id : false);
        const canView = isPrimary || isAuthor || !!hasAcceptedInvite;
        if (!canView) {
            return NextResponse.json(
                { success: false, error: 'Forbidden: You are not assigned to this surgical case.' },
                { status: 403 },
            );
        }

        const canEdit =
            isPrimary || isAuthor;

        if (!canEdit) {
            return NextResponse.json(
                { success: false, error: 'Read-only: Only the primary surgeon (or original author) can edit surgical notes.' },
                { status: 403 },
            );
        }

        // Consolidate data into surgeon_narrative if 'content' is provided
        const updateData: any = {
            pre_op_notes: body.pre_op_notes,
            procedure_plan: body.procedure_plan,
            surgeon_narrative: body.content ?? body.surgeon_narrative,
            equipment_notes: body.equipment_notes,
            special_instructions: body.special_instructions,
            risk_factors: body.risk_factors,
            post_op_instructions: body.post_op_instructions,
            planned_anesthesia: body.planned_anesthesia,
        };

        if (existingPlan) {
            // Update existing CasePlan
            await db.casePlan.update({
                where: { id: existingPlan.id },
                data: updateData
            });
            return NextResponse.json({ success: true });
        } else {
            // Create a new CasePlan
            // We require an appointment ID for CasePlan according to Prisma schema
            let appointmentId = surgicalCase.consultation?.appointment_id;
            
            // Check if this appointment is already consumed by another CasePlan!
            if (appointmentId) {
                 const aptCheck = await db.casePlan.findUnique({ where: { appointment_id: appointmentId } });
                 if (aptCheck && aptCheck.surgical_case_id !== caseId) {
                      appointmentId = undefined; // It's taken! Clear it to fallback.
                 }
            }

            // Fallback: fetch most recent appointment for this patient that does NOT share a CasePlan
            if (!appointmentId) {
                const availableApt = await db.appointment.findFirst({
                    where: { 
                        patient_id: surgicalCase.patient_id,
                        case_plan: null 
                    },
                    orderBy: { created_at: 'desc' }
                });
                
                if (availableApt) {
                    appointmentId = availableApt.id;
                } else {
                    // Create a silent proxy appointment to satisfy the strict schema relations.
                    const proxyApt = await db.appointment.create({
                        data: {
                             patient_id: surgicalCase.patient_id,
                             doctor_id: doctor.id,
                             appointment_date: new Date(),
                             time: '00:00',
                             type: 'SURGICAL_NOTES_PROXY',
                             status: 'COMPLETED',
                             reason: 'Auto-generated to anchor backend Surgical Notes constraints'
                        }
                    });
                    appointmentId = proxyApt.id;
                }
            }

            await db.casePlan.create({
                data: {
                    surgical_case_id: caseId,
                    patient_id: surgicalCase.patient_id,
                    doctor_id: doctor.id,
                    appointment_id: appointmentId,
                    ...updateData
                }
            });
            return NextResponse.json({ success: true });
        }
    } catch (error) {
        console.error('[PUT Surgical Notes Error]:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
