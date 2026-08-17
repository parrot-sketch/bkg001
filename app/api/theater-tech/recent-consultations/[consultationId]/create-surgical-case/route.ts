import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { createSurgicalCaseFromPatient } from '@/application/services/theater-tech/CreateSurgicalCaseFromPatientService';
import { SurgicalCaseStatus } from '@prisma/client';

export async function POST(request: NextRequest, context: { params: Promise<{ consultationId: string }> }) {
  try {
    const auth = await JwtMiddleware.authenticate(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const user = auth.user;
    if (user.role !== Role.THEATER_TECHNICIAN && user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { consultationId } = await context.params;
    const consultationIdNum = Number(consultationId);
    if (!Number.isFinite(consultationIdNum)) {
      return NextResponse.json({ success: false, error: 'Invalid consultation id' }, { status: 400 });
    }

    const consultation = await db.consultation.findUnique({
      where: { id: consultationIdNum },
      select: {
        id: true,
        completed_at: true,
        surgical_case: { select: { id: true } },
        appointment: {
          select: {
            id: true,
            patient_id: true,
            doctor_id: true,
            appointment_date: true,
            case_plan: { select: { id: true, surgical_case_id: true } },
          },
        },
      },
    });

    if (!consultation) {
      return NextResponse.json({ success: false, error: 'Consultation not found' }, { status: 404 });
    }
    if (!consultation.completed_at) {
      return NextResponse.json({ success: false, error: 'Consultation is not completed yet' }, { status: 409 });
    }
    if (consultation.surgical_case?.id) {
      return NextResponse.json({ success: true, surgicalCaseId: consultation.surgical_case.id });
    }
    if (!consultation.appointment) {
      return NextResponse.json({ success: false, error: 'Consultation appointment not found' }, { status: 500 });
    }

    const created = await createSurgicalCaseFromPatient(db, {
      patientId: consultation.appointment.patient_id,
      createdByUserId: user.userId,
      primarySurgeonDoctorId: consultation.appointment.doctor_id,
      appointmentId: consultation.appointment.id,
      procedureDate: consultation.appointment.appointment_date,
      status: SurgicalCaseStatus.DRAFT,
    });

    if (!created.alreadyExisted) {
      await db.surgicalCase.update({
        where: { id: created.surgicalCaseId },
        data: { consultation_id: consultation.id },
      });

      if (consultation.appointment.case_plan?.id && !consultation.appointment.case_plan.surgical_case_id) {
        await db.casePlan.update({
          where: { id: consultation.appointment.case_plan.id },
          data: { surgical_case_id: created.surgicalCaseId },
        });
      }
    } else {
      await db.surgicalCase.update({
        where: { id: created.surgicalCaseId },
        data: { consultation_id: consultation.id },
      });
    }

    return NextResponse.json({ success: true, surgicalCaseId: created.surgicalCaseId });
  } catch (error) {
    console.error('[API] POST theater-tech create surgical case from consultation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create surgical case' }, { status: 500 });
  }
}

