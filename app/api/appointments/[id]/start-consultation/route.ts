import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { authenticateRequest } from '@/lib/auth/jwt-helper';

/**
 * POST /api/appointments/[id]/start-consultation
 * 
 * Start a consultation for a checked-in patient
 * 
 * Request Body:
 * {
 *   doctorId: string;
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

        // Parse body (optional — some callers send empty body)
        let body: Record<string, unknown> = {};
        try {
            body = await request.json();
        } catch {
            // Empty body is acceptable for this endpoint
        }

        // Resolve the authenticated user's Doctor record
        // This is the canonical way to map User.id → Doctor.id
        const doctor = await db.doctor.findUnique({
            where: { user_id: authResult.user.userId },
            select: { id: true },
        });

        if (!doctor) {
            return NextResponse.json(
                { success: false, error: 'Doctor profile not found for authenticated user' },
                { status: 403 }
            );
        }

        // Find the appointment
        const appointment = await db.appointment.findUnique({
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

        // Verify appointment can start consultation
        // Patient MUST be checked in before consultation can start
        const validStatuses = [
            AppointmentStatus.CHECKED_IN,           // Primary: patient checked in by frontdesk
            AppointmentStatus.READY_FOR_CONSULTATION, // Optional: nurse prep completed
            AppointmentStatus.IN_CONSULTATION,      // Already in progress (resume)
        ];
        
        if (!validStatuses.includes(appointment.status as AppointmentStatus)) {
            let errorMessage: string;
            
            if (appointment.status === 'SCHEDULED' || 
                appointment.status === 'PENDING' || 
                appointment.status === 'CONFIRMED') {
                errorMessage = 'Patient hasn\'t arrived yet';
            } else if (appointment.status === 'COMPLETED') {
                errorMessage = 'This consultation has already been completed';
            } else if (appointment.status === 'CANCELLED') {
                errorMessage = 'This appointment was cancelled';
            } else if (appointment.status === 'NO_SHOW') {
                errorMessage = 'Patient was marked as no-show';
            } else {
                errorMessage = `Unable to start consultation (${appointment.status})`;
            }
            
            return NextResponse.json(
                { success: false, error: errorMessage },
                { status: 400 }
            );
        }

        // Verify doctor ownership: compare appointment.doctor_id against the
        // Doctor record resolved from the authenticated user (same table PK)
        const bodyDoctorId = body.doctorId as string | undefined;
        if (appointment.doctor_id !== doctor.id &&
            (!bodyDoctorId || appointment.doctor_id !== bodyDoctorId)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized: Not your appointment' },
                { status: 403 }
            );
        }

        // Update appointment status to IN_CONSULTATION
        const updatedAppointment = await db.appointment.update({
            where: { id: appointmentId },
            data: {
                status: AppointmentStatus.IN_CONSULTATION,
                consultation_started_at: new Date(),
            },
            include: {
                patient: true,
                doctor: true,
            },
        });

        // Check if consultation record already exists
        const existingConsultation = await db.consultation.findUnique({
            where: { appointment_id: appointmentId },
        });

        if (existingConsultation) {
            // Update existing record
            // Crucial: Only update started_at if it's currently null
            // This preserves the original start time if it was already started
            await db.consultation.update({
                where: { id: existingConsultation.id },
                data: {
                    doctor_id: updatedAppointment.doctor_id,
                    started_at: existingConsultation.started_at ?? new Date(), // Force start time if missing
                },
            });
        } else {
            // Create new record
            await db.consultation.create({
                data: {
                    appointment_id: appointmentId,
                    doctor_id: updatedAppointment.doctor_id,
                    user_id: authResult.user.userId,
                    started_at: new Date(),
                },
            });
        }

        // TODO: Send notification to frontdesk that consultation started
        // await notificationService.notifyFrontdeskConsultationStarted(appointmentId);

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
                    name: updatedAppointment.doctor.name,
                } : undefined,
            },
        });
    } catch (error) {
        console.error('Error starting consultation:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to start consultation' },
            { status: 500 }
        );
    }
}
