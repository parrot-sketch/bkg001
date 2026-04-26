import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { AppointmentStatus } from '@prisma/client';
import { createSurgicalCaseFromPatient } from '@/application/services/theater-tech/CreateSurgicalCaseFromPatientService';

function isDoctorConfirmedStatus(status: AppointmentStatus): boolean {
  return status === AppointmentStatus.SCHEDULED || status === AppointmentStatus.CONFIRMED;
}

function isProcedureType(type: string | null | undefined): boolean {
  return (type ?? '').trim().toLowerCase() === 'procedure';
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ appointmentId: string }> },
): Promise<NextResponse> {
  try {
    const auth = await JwtMiddleware.authenticate(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const user = auth.user;
    if (user.role !== Role.THEATER_TECHNICIAN && user.role !== Role.ADMIN) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { appointmentId } = await context.params;
    const id = Number(appointmentId);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ success: false, error: 'Invalid appointment id' }, { status: 400 });
    }

    const appointment = await db.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        type: true,
        patient_id: true,
        doctor_id: true,
        appointment_date: true,
        surgical_case: { select: { id: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    if (appointment.surgical_case?.id) {
      return NextResponse.json({ success: true, surgicalCaseId: appointment.surgical_case.id });
    }

    if (!isProcedureType(appointment.type)) {
      return NextResponse.json({ success: false, error: 'Appointment is not a procedure booking' }, { status: 409 });
    }

    if (!isDoctorConfirmedStatus(appointment.status)) {
      return NextResponse.json(
        { success: false, error: 'Procedure must be doctor-confirmed before creating a surgical case' },
        { status: 409 },
      );
    }

    const created = await createSurgicalCaseFromPatient(db, {
      patientId: appointment.patient_id,
      createdByUserId: user.userId,
      appointmentId: appointment.id,
      primarySurgeonDoctorId: appointment.doctor_id,
      procedureDate: appointment.appointment_date,
    });

    return NextResponse.json({ success: true, surgicalCaseId: created.surgicalCaseId });
  } catch (error) {
    console.error('[API] POST theater-tech create surgical case from appointment error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create surgical case' }, { status: 500 });
  }
}

