/**
 * API Route: GET /api/appointments/post-op
 * 
 * Post-operative Appointments endpoint for Nurses.
 * 
 * Returns appointments that require post-operative care.
 * Uses CareNote and SurgicalOutcome models to determine which patients need post-op care.
 * 
 * Security:
 * - Requires authentication
 * - Only NURSE and ADMIN roles can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { AppointmentMapper } from '@/infrastructure/mappers/AppointmentMapper';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus, CareNoteType } from '@prisma/client';
import { Role } from '@/domain/enums/Role';

/**
 * GET /api/appointments/post-op
 * 
 * Returns post-operative appointments that need nurse care.
 * 
 * Logic:
 * - Appointments with status: COMPLETED (from last 30 days)
 * - AND either:
 *   - Has SurgicalOutcome (recent surgery)
 *   - No recent CareNote with note_type: POST_OP (needs follow-up)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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

    // 2. Check permissions (NURSE and ADMIN can access)
    if (authResult.user.role !== Role.NURSE && authResult.user.role !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Nurse or Admin access required',
        },
        { status: 403 }
      );
    }

    // 3. Fetch completed appointments from last 30 days
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const completedAppointments = await db.appointment.findMany({
      where: {
        appointment_date: {
          gte: thirtyDaysAgo,
          lte: today,
        },
        status: AppointmentStatus.COMPLETED,
      },
      include: {
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            file_number: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
        surgical_outcome: {
          select: {
            id: true,
            outcome_status: true,
            revision_required: true, // Note: schema uses revision_required, not follow_up_required
          },
        },
        care_notes: {
          where: {
            note_type: CareNoteType.POST_OP,
          },
          orderBy: {
            recorded_at: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        appointment_date: 'desc',
      },
    });

    // 4. Filter appointments that need post-op care
    const postOpAppointments = completedAppointments.filter((apt) => {
      const hasSurgicalOutcome = apt.surgical_outcome !== null;
      const hasRecentCareNote = apt.care_notes.length > 0;
      const surgicalOutcome = apt.surgical_outcome;

      // Need post-op care if:
      // - Has SurgicalOutcome (recent surgery - always needs post-op care)
      // - No recent POST_OP care note (needs follow-up documentation)
      // - SurgicalOutcome indicates revision required
      if (hasSurgicalOutcome) {
        // Recent surgery - always needs post-op care
        return true;
      }
      if (!hasRecentCareNote) {
        // Completed appointment without post-op documentation
        return true;
      }
      if (surgicalOutcome && surgicalOutcome.revision_required) {
        // Explicitly requires revision/follow-up
        return true;
      }
      return false;
    });

    // 5. Map to DTOs
    const appointmentDtos: AppointmentResponseDto[] = postOpAppointments.map((apt) => {
      const domainAppointment = AppointmentMapper.fromPrisma(apt);
      return {
        id: domainAppointment.getId(),
        patientId: domainAppointment.getPatientId(),
        doctorId: domainAppointment.getDoctorId(),
        appointmentDate: domainAppointment.getAppointmentDate(),
        time: domainAppointment.getTime(),
        status: domainAppointment.getStatus(),
        type: domainAppointment.getType(),
        note: domainAppointment.getNote(),
        reason: domainAppointment.getReason(),
        createdAt: domainAppointment.getCreatedAt(),
        updatedAt: domainAppointment.getUpdatedAt(),
        patient: apt.patient
          ? {
              id: apt.patient.id,
              firstName: apt.patient.first_name,
              lastName: apt.patient.last_name,
              email: apt.patient.email,
              phone: apt.patient.phone || '',
              fileNumber: apt.patient.file_number,
            }
          : undefined,
        doctor: apt.doctor
          ? {
              id: apt.doctor.id,
              name: apt.doctor.name,
              specialization: apt.doctor.specialization || '',
            }
          : undefined,
      };
    });

    // 6. Return appointments
    return NextResponse.json(
      {
        success: true,
        data: appointmentDtos,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/appointments/post-op - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch post-op appointments',
      },
      { status: 500 }
    );
  }
}
