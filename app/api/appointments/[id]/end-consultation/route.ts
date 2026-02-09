import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { authenticateRequest } from '@/lib/auth/jwt-helper';

const prisma = db;

/**
 * POST /api/appointments/[id]/end-consultation
 * 
 * End a consultation and mark appointment as completed
 * 
 * Request Body:
 * {
 *   consultationNotes?: string;
 *   nextSteps?: string;
 * }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Verify authentication
        const authResult = await authenticateRequest(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const resolvedParams = await params;
        const appointmentId = parseInt(resolvedParams.id);

        if (isNaN(appointmentId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid appointment ID' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { consultationNotes, nextSteps } = body;

        // Find the appointment
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                patient: true,
                doctor: true,
            },
        });

        if (!appointment) {
            return NextResponse.json(
                { success: false, error: 'Appointment not found' },
                { status: 404 }
            );
        }

        // Verify appointment is in consultation
        if (appointment.status !== 'IN_CONSULTATION') {
            return NextResponse.json(
                {
                    success: false,
                    error: `Cannot end consultation for appointment with status: ${appointment.status}`
                },
                { status: 400 }
            );
        }

        // Calculate consultation duration
        const consultationEndedAt = new Date();
        const consultationDuration = appointment.consultation_started_at
            ? Math.round((consultationEndedAt.getTime() - appointment.consultation_started_at.getTime()) / 60000)
            : null;

        // Build notes
        let updatedNotes = appointment.note || '';
        if (consultationNotes) {
            updatedNotes += `\n\n[Consultation Notes]\n${consultationNotes}`;
        }
        if (nextSteps) {
            updatedNotes += `\n\n[Next Steps]\n${nextSteps}`;
        }

        // Update appointment status to COMPLETED
        const updatedAppointment = await prisma.appointment.update({
            where: { id: appointmentId },
            data: {
                status: AppointmentStatus.COMPLETED,
                consultation_ended_at: consultationEndedAt,
                consultation_duration: consultationDuration,
                note: updatedNotes.trim(),
            },
            include: {
                patient: true,
                doctor: true,
            },
        });

        // TODO: Send notification to frontdesk that consultation completed
        // await notificationService.notifyFrontdeskConsultationCompleted(appointmentId);

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
                reason: updatedAppointment.reason,
                checkedInAt: updatedAppointment.checked_in_at,
                checkedInBy: updatedAppointment.checked_in_by,
                consultationStartedAt: updatedAppointment.consultation_started_at,
                consultationEndedAt: updatedAppointment.consultation_ended_at,
                consultationDuration: updatedAppointment.consultation_duration,
                createdAt: updatedAppointment.created_at,
                updatedAt: updatedAppointment.updated_at,
                patient: updatedAppointment.patient ? {
                    id: updatedAppointment.patient.id,
                    firstName: updatedAppointment.patient.first_name,
                    lastName: updatedAppointment.patient.last_name,
                    email: updatedAppointment.patient.email,
                    phone: updatedAppointment.patient.phone,
                } : undefined,
                doctor: updatedAppointment.doctor ? {
                    id: updatedAppointment.doctor.id,
                    name: `${updatedAppointment.doctor.first_name} ${updatedAppointment.doctor.last_name}`,
                } : undefined,
            },
        });
    } catch (error) {
        console.error('Error ending consultation:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to end consultation' },
            { status: 500 }
        );
    }
}
