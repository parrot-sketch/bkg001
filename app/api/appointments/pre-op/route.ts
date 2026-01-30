/**
 * API Route: GET /api/appointments/pre-op
 * 
 * Pre-operative Appointments endpoint for Nurses.
 * 
 * Returns appointments that require pre-operative care.
 * Uses CareNote and CasePlan models to determine which patients need pre-op care.
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
import { AppointmentStatus, CareNoteType, CaseReadinessStatus } from '@prisma/client';
import { Role } from '@/domain/enums/Role';

/**
 * GET /api/appointments/pre-op
 * 
 * Returns pre-operative appointments that need nurse care.
 * 
 * Logic:
 * - Appointments with upcoming dates (status: SCHEDULED or PENDING)
 * - AND either:
 *   - No CasePlan exists (needs planning)
 *   - CasePlan.readiness_status != READY (needs planning completion)
 *   - CasePlan.readiness_status = READY but no recent CareNote PRE_OP (needs nurse care)
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

    // 3. Fetch upcoming appointments (scheduled/confirmed)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingAppointments = await db.appointment.findMany({
      where: {
        appointment_date: {
          gte: today,
        },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.PENDING],
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            date_of_birth: true,
            gender: true,
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
        case_plan: {
          select: {
            id: true,
            readiness_status: true,
          },
        },
        care_notes: {
          where: {
            note_type: CareNoteType.PRE_OP,
          },
          orderBy: {
            recorded_at: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        appointment_date: 'asc',
      },
      take: 50, // Pagination limit to prevent unbounded growth
    });

    // 4. Filter appointments that need pre-op care
    const preOpAppointments = upcomingAppointments.filter((apt) => {
      const hasCasePlan = apt.case_plan !== null;
      const casePlan = apt.case_plan;
      const hasRecentCareNote = apt.care_notes.length > 0;

      // Need pre-op care if:
      // - No CasePlan exists (needs planning/nurse prep)
      // - CasePlan exists but readiness_status != READY (needs planning completion)
      // - CasePlan is READY but no recent PRE_OP care note (needs nurse care)
      if (!hasCasePlan) {
        return true; // Needs planning and nurse prep
      }
      if (casePlan && casePlan.readiness_status !== CaseReadinessStatus.READY) {
        return true; // Needs planning completion
      }
      if (casePlan && casePlan.readiness_status === CaseReadinessStatus.READY && !hasRecentCareNote) {
        return true; // Needs nurse pre-op care
      }
      return false; // Already has care or not ready
    });

    // 5. Map to DTOs
    const appointmentDtos: AppointmentResponseDto[] = preOpAppointments.map((apt) => {
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
    console.error('[API] /api/appointments/pre-op - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pre-op appointments',
      },
      { status: 500 }
    );
  }
}
