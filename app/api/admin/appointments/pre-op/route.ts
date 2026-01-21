/**
 * API Route: GET /api/admin/appointments/pre-op
 * 
 * Pre-operative Appointments endpoint.
 * 
 * Returns appointments that require pre-operative care.
 * 
 * Security:
 * - Requires authentication
 * - Only ADMIN role can access
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { AppointmentMapper } from '@/infrastructure/mappers/AppointmentMapper';
import { AppointmentResponseDto } from '@/application/dtos/AppointmentResponseDto';
import { AppointmentStatus } from '@prisma/client';

/**
 * GET /api/admin/appointments/pre-op
 * 
 * Returns pre-operative appointments
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

    // 2. Check permissions (only ADMIN)
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Admin access required',
        },
        { status: 403 }
      );
    }

    // 3. Fetch pre-op appointments (scheduled/confirmed upcoming appointments)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = await db.appointment.findMany({
      where: {
        appointment_date: {
          gte: today,
        },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.PENDING],
        },
      },
      orderBy: {
        appointment_date: 'asc',
      },
      include: {
        patient: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
      },
    });

    // 4. Map to DTOs
    const appointmentDtos: AppointmentResponseDto[] = appointments.map((apt) => {
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

    // 5. Return appointments
    return NextResponse.json(
      {
        success: true,
        data: appointmentDtos,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/admin/appointments/pre-op - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pre-op appointments',
      },
      { status: 500 }
    );
  }
}
