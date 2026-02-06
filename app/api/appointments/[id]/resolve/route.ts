import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import db from '@/lib/db';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

/**
 * POST /api/appointments/[id]/resolve
 * 
 * Resolves a stale/overdue appointment by marking it as completed or cancelled.
 * Used by frontdesk to handle appointments stuck in IN_CONSULTATION status.
 * 
 * Body: { action: 'complete' | 'cancel' }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate request
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const appointmentId = parseInt(id, 10);

    if (isNaN(appointmentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { action } = body;

    if (!action || !['complete', 'cancel'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "complete" or "cancel"' },
        { status: 400 }
      );
    }

    // 3. Get the appointment
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: true,
        consultation: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // 4. Verify the appointment is in a state that can be resolved
    const resolvableStatuses = [
      AppointmentStatus.IN_CONSULTATION,
      AppointmentStatus.CHECKED_IN,
      AppointmentStatus.READY_FOR_CONSULTATION,
    ];

    if (!resolvableStatuses.includes(appointment.status as AppointmentStatus)) {
      return NextResponse.json(
        { success: false, error: `Cannot resolve appointment with status: ${appointment.status}` },
        { status: 400 }
      );
    }

    // 5. Determine new status based on action
    const newStatus = action === 'complete' 
      ? AppointmentStatus.COMPLETED 
      : AppointmentStatus.CANCELLED;

    // 6. Update appointment and consultation in a transaction
    const updatedAppointment = await db.$transaction(async (tx) => {
      // Update appointment status
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: newStatus,
          ...(action === 'complete' && {
            consultation_ended_at: new Date(),
          }),
        },
        include: {
          patient: true,
          doctor: true,
        },
      });

      // If completing, also update the consultation record if it exists
      if (action === 'complete' && appointment.consultation) {
        await tx.consultation.update({
          where: { id: appointment.consultation.id },
          data: {
            completed_at: new Date(),
            outcome_type: 'CONSULTATION_ONLY', // Default outcome for resolved consultations
            doctor_notes: JSON.stringify({
              chiefComplaint: '',
              examination: '',
              assessment: 'Consultation resolved by frontdesk',
              plan: '',
            }),
          },
        });
      }

      // Log the action in audit trail
      await tx.auditLog.create({
        data: {
          user_id: authResult.user!.userId,
          action: action === 'complete' ? 'RESOLVE_COMPLETE' : 'RESOLVE_CANCEL',
          model: 'Appointment',
          record_id: appointmentId.toString(),
          details: JSON.stringify({
            description: `Appointment ${appointmentId} resolved as ${newStatus} by frontdesk`,
            previousStatus: appointment.status,
            newStatus,
            resolvedBy: authResult.user!.userId,
            resolvedAt: new Date().toISOString(),
          }),
        },
      });

      return updated;
    });

    // 7. Return the updated appointment
    return NextResponse.json({
      success: true,
      data: {
        id: updatedAppointment.id,
        patientId: updatedAppointment.patient_id,
        doctorId: updatedAppointment.doctor_id,
        appointmentDate: updatedAppointment.appointment_date,
        time: updatedAppointment.time,
        status: updatedAppointment.status,
        type: updatedAppointment.type,
        note: updatedAppointment.note,
        patient: updatedAppointment.patient ? {
          id: updatedAppointment.patient.id,
          firstName: updatedAppointment.patient.first_name,
          lastName: updatedAppointment.patient.last_name,
          email: updatedAppointment.patient.email,
        } : undefined,
        doctor: updatedAppointment.doctor ? {
          id: updatedAppointment.doctor.id,
          name: updatedAppointment.doctor.name,
        } : undefined,
      },
      message: `Appointment ${action === 'complete' ? 'marked as completed' : 'cancelled'} successfully`,
    });
  } catch (error) {
    console.error('[API] POST /api/appointments/[id]/resolve - Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve appointment' },
      { status: 500 }
    );
  }
}
