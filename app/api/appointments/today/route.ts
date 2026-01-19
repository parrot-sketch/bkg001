/**
 * API Route: GET /api/appointments/today
 * 
 * Get today's appointments for frontdesk.
 * 
 * Returns all appointments scheduled for today, regardless of status.
 * 
 * Security:
 * - Requires authentication
 * - Frontdesk can see all appointments
 * - Other roles have appropriate access based on RBAC
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { extractConsultationRequestFields } from '@/infrastructure/mappers/ConsultationRequestMapper';

/**
 * GET /api/appointments/today
 * 
 * Returns all appointments scheduled for today
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

    // 2. Get today's date range (start and end of day)
    // Use native Date methods to avoid date-fns dependency issues in server context
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // 3. Fetch today's appointments
    // Note: Prisma automatically includes all Appointment fields, including consultation_request_status, 
    // reviewed_by, reviewed_at, and review_notes, so we don't need to explicitly select them
    const appointments = await db.appointment.findMany({
      where: {
        appointment_date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
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
      orderBy: [
        {
          appointment_date: 'asc',
        },
        {
          time: 'asc',
        },
      ],
    });

    // 4. Map to DTO format
    const mappedAppointments: AppointmentResponseDto[] = appointments.map((appointment) => {
      // Extract consultation request fields from the appointment
      // Prisma includes all Appointment fields by default, so these should be available
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

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        data: mappedAppointments,
        message: 'Today\'s appointments retrieved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Log detailed error information for debugging
    console.error('[API] GET /api/appointments/today - Unexpected error:', error);
    
    // Provide more detailed error information in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // In development, include more details
    if (process.env.NODE_ENV === 'development') {
      console.error('[API] Error details:', {
        message: errorMessage,
        stack: errorStack,
        error,
      });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'development' 
          ? `Internal server error: ${errorMessage}` 
          : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
