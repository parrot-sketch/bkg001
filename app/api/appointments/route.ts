/**
 * API Route: GET /api/appointments
 * 
 * Get Appointments endpoint.
 * 
 * Supports querying appointments by patientId with optional status filtering.
 * Includes consultation_request_status and related workflow fields.
 * 
 * Security:
 * - Requires authentication
 * - Patients can only query their own appointments
 * - Other roles have broader access based on RBAC
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { extractConsultationRequestFields } from '@/infrastructure/mappers/ConsultationRequestMapper';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';

/**
 * GET /api/appointments
 * 
 * Query params:
 * - patientId: Filter by patient ID (required for patients, optional for others)
 * - status: Filter by appointment status (optional)
 * - consultationRequestStatus: Filter by consultation request status (optional, comma-separated)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const patientIdParam = searchParams.get('patientId');
    const statusParam = searchParams.get('status');
    const consultationRequestStatusParam = searchParams.get('consultationRequestStatus');

    // 3. Build where clause
    const where: any = {};

    // Patient ID filtering
    if (userRole === 'PATIENT') {
      // Patients can only query their own appointments
      where.patient_id = userId;
    } else if (patientIdParam) {
      // Other roles can query by patientId if provided
      where.patient_id = patientIdParam;
    }

    // Status filtering
    if (statusParam) {
      where.status = statusParam;
    }

    // Consultation request status filtering
    if (consultationRequestStatusParam) {
      const statuses = consultationRequestStatusParam.split(',').map(s => s.trim());
      where.consultation_request_status = {
        in: statuses,
      };
    }

    // 4. Fetch appointments
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
        appointment_date: 'desc',
      },
    });

    // 5. Map to DTO format
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

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: mappedAppointments,
        message: 'Appointments retrieved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Unexpected error - log and return generic error
    console.error('[API] /api/appointments - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
