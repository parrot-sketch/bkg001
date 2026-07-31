import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { revalidateFrontdeskDashboard } from '@/actions/frontdesk/get-dashboard-data';
import { revalidateDoctorDashboard } from '@/actions/doctor/get-dashboard-data';

/**
 * POST /api/appointments/[id]/cancel
 * 
 * Cancel an appointment.
 * Accessible by FRONTDESK and DOCTOR roles.
 * Reason is optional.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const allowedRoles = ['FRONTDESK', 'DOCTOR', 'ADMIN'];
    if (!allowedRoles.includes(authResult.user.role)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { id } = await context.params;
    const appointmentId = parseInt(id, 10);
    if (isNaN(appointmentId)) {
      return NextResponse.json({ success: false, error: 'Invalid appointment ID' }, { status: 400 });
    }

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true },
    });

    if (!appointment) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      return NextResponse.json({ success: false, error: 'Appointment is already cancelled' }, { status: 409 });
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      return NextResponse.json({ success: false, error: 'Cannot cancel a completed appointment' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body?.reason?.trim() || 'Cancelled';

    const updated = await db.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
        note: reason,
        status_changed_at: new Date(),
        status_changed_by: authResult.user.userId,
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    await db.auditLog.create({
      data: {
        user_id: authResult.user.userId,
        action: 'CANCEL',
        model: 'Appointment',
        record_id: appointmentId.toString(),
        details: `Appointment #${appointmentId} cancelled by ${authResult.user.role}. Reason: ${reason}`,
      },
    }).catch(() => {});

    try { await revalidateFrontdeskDashboard(); } catch (_) {}
    try { await revalidateDoctorDashboard(appointment.doctor_id); } catch (_) {}

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        patientId: updated.patient_id,
        doctorId: updated.doctor_id,
        appointmentDate: updated.appointment_date,
        time: updated.time,
        type: updated.type,
        note: updated.note,
        patient: updated.patient ? {
          id: updated.patient.id,
          firstName: updated.patient.first_name,
          lastName: updated.patient.last_name,
          email: updated.patient.email,
        } : undefined,
        doctor: updated.doctor ? {
          id: updated.doctor.id,
          name: updated.doctor.name,
        } : undefined,
      },
      message: 'Appointment cancelled successfully',
    });
  } catch (error) {
    console.error('[API] POST /api/appointments/[id]/cancel - Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to cancel appointment' }, { status: 500 });
  }
}
