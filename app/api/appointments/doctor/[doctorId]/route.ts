/**
 * API Route: GET /api/appointments/doctor/:doctorId
 * 
 * Get Doctor Appointments endpoint.
 * 
 * Returns appointments for a specific doctor with status filtering.
 * By default, only returns SCHEDULED and CONFIRMED consultations
 * (excludes unreviewed requests).
 * 
 * Security:
 * - Requires authentication
 * - Doctors can only query their own appointments
 * - Other roles can query any doctor's appointments
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/controllers/middleware/JwtMiddleware';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { extractConsultationRequestFields } from '@/infrastructure/mappers/ConsultationRequestMapper';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';

/**
 * GET /api/appointments/doctor/:doctorId
 * 
 * Query params:
 * - status: Filter by consultation request status (optional, comma-separated)
 *   Default: SCHEDULED,CONFIRMED (only approved consultations)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { doctorId: string } }
): Promise<NextResponse> {
  try {
    // 1. Authenticate request
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const userId = authResult.user.userId;
    const userRole = authResult.user.role;
    const doctorId = params.doctorId;

    // 2. Validate doctor ID
    if (!doctorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor ID is required',
        },
        { status: 400 }
      );
    }

    // 3. Check permissions: Doctors can only query their own appointments
    if (userRole === 'DOCTOR' && userId !== doctorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Doctors can only view their own appointments',
        },
        { status: 403 }
      );
    }

    // 4. Parse query parameters
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    // 5. Determine consultation request status filter
    // Default: Only show SCHEDULED and CONFIRMED (approved consultations)
    // This ensures doctors never see unreviewed requests
    let consultationRequestStatuses: ConsultationRequestStatus[] = [
      ConsultationRequestStatus.SCHEDULED,
      ConsultationRequestStatus.CONFIRMED,
    ];

    if (statusParam) {
      // If status is explicitly provided, use it
      const statuses = statusParam.split(',').map(s => s.trim()) as ConsultationRequestStatus[];
      consultationRequestStatuses = statuses;
    }

    // 6. Build where clause
    const where: any = {
      doctor_id: doctorId,
      consultation_request_status: {
        in: consultationRequestStatuses,
      },
    };

    // 7. Fetch appointments
    const appointments = await db.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            img: true,
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
      orderBy: {
        appointment_date: 'asc', // Upcoming first
      },
    });

    // 8. Map to DTO format
    const mappedAppointments: AppointmentResponseDto[] = appointments.map((appointment) => {
      const consultationFields = extractConsultationRequestFields(appointment);

      return {
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
      };
    });

    // 9. Return success response
    return NextResponse.json(
      {
        success: true,
        data: mappedAppointments,
        message: 'Doctor appointments retrieved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Unexpected error - log and return generic error
    console.error('[API] /api/appointments/doctor/[doctorId] - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
