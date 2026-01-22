/**
 * API Route: GET /api/doctors/[id]/appointments/upcoming
 * 
 * Get Upcoming Appointments for Doctor endpoint.
 * 
 * Returns upcoming (future) appointments for a specific doctor.
 * The [id] parameter can be either a doctor ID or user ID.
 * If user ID is provided, it will be resolved to doctor ID.
 * 
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
import { JwtMiddleware } from '@/lib/auth/middleware';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { extractConsultationRequestFields } from '@/infrastructure/mappers/ConsultationRequestMapper';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';
import { Role } from '@/domain/enums/Role';

/**
 * GET /api/doctors/[id]/appointments/upcoming
 * 
 * Returns upcoming appointments for a doctor.
 * The [id] can be either doctor ID or user ID.
 * Upcoming means appointments scheduled for future dates (after today).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;
    
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
    const providedId = params?.id;

    // 2. Validate ID
    if (!providedId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor ID or User ID is required',
        },
        { status: 400 }
      );
    }

    // 3. Resolve doctor ID from provided ID (could be doctor ID or user ID)
    let doctorId: string;
    let doctorUserId: string | undefined;

    // First, try to find doctor by ID (assuming providedId is doctor ID)
    const doctorById = await db.doctor.findUnique({
      where: { id: providedId },
      select: { id: true, user_id: true },
    });

    if (doctorById) {
      // Provided ID is a doctor ID
      doctorId = doctorById.id;
      doctorUserId = doctorById.user_id;
    } else {
      // Try to find doctor by user_id (assuming providedId is user ID)
      const doctorByUserId = await db.doctor.findUnique({
        where: { user_id: providedId },
        select: { id: true, user_id: true },
      });

      if (doctorByUserId) {
        // Provided ID is a user ID
        doctorId = doctorByUserId.id;
        doctorUserId = doctorByUserId.user_id;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Doctor not found',
          },
          { status: 404 }
        );
      }
    }

    // 4. Check permissions: Doctors can only query their own appointments
    if (userRole === Role.DOCTOR && userId !== doctorUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Doctors can only view their own appointments',
        },
        { status: 403 }
      );
    }

    // 5. Get tomorrow's start time (future dates only, excluding today)
    const today = new Date();
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    // 6. Build where clause
    // Default: Only show SCHEDULED and CONFIRMED (approved consultations)
    // Filter for future dates (after today)
    const where: any = {
      doctor_id: doctorId,
      appointment_date: {
        gte: tomorrowStart, // Future dates only (after today)
      },
      consultation_request_status: {
        in: [
          ConsultationRequestStatus.SCHEDULED,
          ConsultationRequestStatus.CONFIRMED,
        ],
      },
    };

    // 7. Fetch upcoming appointments
    // REFACTORED: Added take limit to prevent unbounded query and connection exhaustion
    // Limits to 200 upcoming appointments (reasonable for dashboard view)
    const appointments = await db.appointment.findMany({
      where,
      take: 200, // REFACTORED: Bounded query to prevent connection pool exhaustion
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
          appointment_date: 'asc', // Upcoming first (chronological order)
        },
        {
          time: 'asc',
        },
      ],
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
        message: 'Upcoming appointments retrieved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Enhanced error logging for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[API] GET /api/doctors/[id]/appointments/upcoming - Error Details:', {
      message: errorMessage,
      stack: errorStack,
      error: error,
    });

    // Return detailed error in development, generic in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      {
        success: false,
        error: isDevelopment 
          ? `Failed to fetch upcoming appointments: ${errorMessage}` 
          : 'Failed to fetch upcoming appointments',
        ...(isDevelopment && {
          details: {
            message: errorMessage,
            stack: errorStack,
          },
        }),
      },
      { status: 500 }
    );
  }
}
