/**
 * API Route: GET /api/admin/appointments
 * 
 * Admin Appointments endpoint.
 * 
 * Returns all appointments for admin management.
 * 
 * Query params:
 * - startDate: Filter by start date (optional, ISO format)
 * - endDate: Filter by end date (optional, ISO format)
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

/**
 * GET /api/admin/appointments
 * 
 * Returns all appointments
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

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // 4. Build where clause
    const where: any = {};

    if (startDateParam || endDateParam) {
      where.appointment_date = {};
      if (startDateParam) {
        const startDate = new Date(startDateParam);
        startDate.setHours(0, 0, 0, 0);
        where.appointment_date.gte = startDate;
      }
      if (endDateParam) {
        const endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
        where.appointment_date.lte = endDate;
      }
    }

    // 5. Fetch appointments
    const appointments = await db.appointment.findMany({
      where,
      orderBy: {
        appointment_date: 'desc',
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

    // 6. Map to DTOs
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
        // Include related data
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

    // 7. Return appointments
    return NextResponse.json(
      {
        success: true,
        data: appointmentDtos,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/admin/appointments - Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch appointments',
      },
      { status: 500 }
    );
  }
}
