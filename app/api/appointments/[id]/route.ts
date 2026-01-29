/**
 * API Route: GET /api/appointments/:id
 * 
 * Get a single appointment by ID endpoint.
 * 
 * Security:
 * - Requires authentication
 * - Patients can only view their own appointments
 * - Doctors can view appointments assigned to them
 * - Frontdesk and Admin can view any appointment
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { extractConsultationRequestFields } from '@/infrastructure/mappers/ConsultationRequestMapper';
import { withRetry } from '@/lib/db';

/**
 * GET /api/appointments/:id
 * 
 * Get a single appointment by ID.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 1. Authenticate request
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || 'Authentication required',
        },
        { status: 401 }
      );
    }

    const userId = authResult.user.userId;
    const userRole = authResult.user.role;

    // 2. Extract appointment ID from params
    const params = await context.params;
    const appointmentId = parseInt(params.id, 10);
    if (isNaN(appointmentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid appointment ID',
        },
        { status: 400 }
      );
    }

    // 3. Fetch appointment with retry
    const appointment = await withRetry(async () => {
      return db.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          patient_id: true,
          doctor_id: true,
          appointment_date: true,
          time: true,
          status: true,
          type: true,
          note: true,
          reason: true,
          consultation_request_status: true,
          reviewed_by: true,
          reviewed_at: true,
          review_notes: true,
          created_at: true,
          updated_at: true,
          patient: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
              img: true,
              gender: true,
              date_of_birth: true,
              allergies: true,
              file_number: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
              img: true,
            },
          },
        },
      });
    });

    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment not found',
        },
        { status: 404 }
      );
    }

    // 4. Check permissions
    if (userRole === 'PATIENT') {
      // Patients can only view their own appointments
      const patient = await db.patient.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (!patient || patient.id !== appointment.patient_id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: You can only view your own appointments',
          },
          { status: 403 }
        );
      }
    } else if (userRole === 'DOCTOR') {
      // Doctors can only view appointments assigned to them
      const doctor = await db.doctor.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (!doctor || doctor.id !== appointment.doctor_id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: You can only view appointments assigned to you',
          },
          { status: 403 }
        );
      }
    }
    // FRONTDESK and ADMIN can view any appointment (no additional check needed)

    // 5. Map to DTO format
    const consultationFields = extractConsultationRequestFields(appointment);
    const responseDto: AppointmentResponseDto = {
      id: appointment.id,
      patientId: appointment.patient_id,
      doctorId: appointment.doctor_id,
      appointmentDate: appointment.appointment_date,
      time: appointment.time,
      status: appointment.status,
      type: appointment.type,
      note: appointment.note ?? undefined,
      reason: appointment.reason ?? undefined,
      consultationRequestStatus: consultationFields.consultationRequestStatus ?? undefined,
      reviewedBy: consultationFields.reviewedBy ?? undefined,
      reviewedAt: consultationFields.reviewedAt ?? undefined,
      reviewNotes: consultationFields.reviewNotes ?? undefined,
      createdAt: appointment.created_at,
      updatedAt: appointment.updated_at,
      patient: appointment.patient ? {
        id: appointment.patient.id,
        firstName: appointment.patient.first_name,
        lastName: appointment.patient.last_name,
        email: appointment.patient.email,
        phone: appointment.patient.phone,
        img: appointment.patient.img,
        fileNumber: appointment.patient.file_number,
        gender: appointment.patient.gender,
        dateOfBirth: appointment.patient.date_of_birth,
        allergies: appointment.patient.allergies ?? undefined,
      } : undefined,
      doctor: appointment.doctor ? {
        id: appointment.doctor.id,
        name: appointment.doctor.name,
        specialization: appointment.doctor.specialization,
        // img: appointment.doctor.img // DTO might mostly use id/name/spec
      } : undefined,
    };

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: responseDto,
        message: 'Appointment retrieved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle database connection errors
    if (error instanceof Error && error.message.includes("Can't reach database server")) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection error. Please try again.',
        },
        { status: 503 }
      );
    }

    // Unexpected error - log and return generic error
    console.error('[API] GET /api/appointments/[id] - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
