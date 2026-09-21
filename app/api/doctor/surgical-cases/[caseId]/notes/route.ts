import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import {
  ensureCasePlanForDoctor,
  resolveDoctorCaseAccess,
} from '@/lib/doctor/surgicalCaseDocumentAccess';

/**
 * Doctor Surgical Notes — CasePlan narrative fields only.
 * Never reads or writes nurse clinical forms (NOR / recovery / ward checklist).
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await context.params;
    const auth = await JwtMiddleware.authenticate(request);

    if (!auth.success || !auth.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.user.role !== Role.DOCTOR && auth.user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Doctors only.' }, { status: 403 });
    }

    const access = await resolveDoctorCaseAccess(auth.user.userId, caseId);
    if (!access) {
      return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
    }
    if (!access.canView) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You are not assigned to this surgical case.' },
        { status: 403 },
      );
    }

    const casePlan = await db.casePlan.findFirst({
      where: { surgical_case_id: caseId },
      select: {
        pre_op_notes: true,
        procedure_plan: true,
        surgeon_narrative: true,
        equipment_notes: true,
        special_instructions: true,
        risk_factors: true,
        post_op_instructions: true,
        planned_anesthesia: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: casePlan ?? {
        pre_op_notes: null,
        procedure_plan: null,
        surgeon_narrative: null,
        equipment_notes: null,
        special_instructions: null,
        risk_factors: null,
        post_op_instructions: null,
        planned_anesthesia: null,
      },
      meta: { canEdit: access.canEdit, canView: access.canView },
    });
  } catch (error) {
    console.error('[GET Surgical Notes Error]:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
) {
  try {
    const { caseId } = await context.params;
    const auth = await JwtMiddleware.authenticate(request);

    if (!auth.success || !auth.user || auth.user.role !== Role.DOCTOR) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Doctors only.' }, { status: 403 });
    }

    const access = await resolveDoctorCaseAccess(auth.user.userId, caseId);
    if (!access) {
      return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
    }
    if (!access.canEdit) {
      return NextResponse.json(
        {
          success: false,
          error: 'Read-only: Only the primary or invited surgeon can edit surgical notes.',
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const plan = await ensureCasePlanForDoctor({
      caseId: access.caseId,
      patientId: access.patientId,
      doctorId: access.doctorId,
    });

    await db.casePlan.update({
      where: { id: plan.id },
      data: {
        surgeon_narrative: body.content ?? body.surgeon_narrative ?? undefined,
        procedure_plan: body.procedure_plan ?? undefined,
        risk_factors: body.risk_factors ?? undefined,
        planned_anesthesia: body.planned_anesthesia ?? undefined,
        pre_op_notes: body.pre_op_notes ?? undefined,
        post_op_instructions: body.post_op_instructions ?? undefined,
        special_instructions: body.special_instructions ?? undefined,
        equipment_notes: body.equipment_notes ?? undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PUT Surgical Notes Error]:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
