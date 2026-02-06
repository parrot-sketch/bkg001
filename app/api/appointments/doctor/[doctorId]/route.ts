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
import { JwtMiddleware } from '@/lib/auth/middleware';
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
  context: { params: Promise<{ doctorId: string }> }
): Promise<NextResponse> {
  const params = await context.params;
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
    const doctorIdParam = params?.doctorId;

    // 2. Validate doctor ID parameter
    if (!doctorIdParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor ID is required',
        },
        { status: 400 }
      );
    }

    // 3. If user is a doctor, verify they're querying their own appointments
    // and look up their doctor record to get the actual doctor_id
    let actualDoctorId = doctorIdParam;

    if (userRole === 'DOCTOR') {
      if (userId !== doctorIdParam) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: Doctors can only view their own appointments',
          },
          { status: 403 }
        );
      }

      // Look up doctor record by user_id to get the actual doctor.id
      const doctor = await db.doctor.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (!doctor) {
        return NextResponse.json(
          {
            success: false,
            error: 'Doctor profile not found',
          },
          { status: 404 }
        );
      }

      actualDoctorId = doctor.id;
    } else {
      // For non-doctors (admin, frontdesk), the doctorIdParam should be the actual doctor.id
      // Verify the doctor exists
      const doctor = await db.doctor.findUnique({
        where: { id: doctorIdParam },
        select: { id: true },
      });

      if (!doctor) {
        return NextResponse.json(
          {
            success: false,
            error: 'Doctor not found',
          },
          { status: 404 }
        );
      }

      actualDoctorId = doctorIdParam;
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const includeAll = searchParams.get('includeAll') === 'true';

    const limitParam = searchParams.get('limit');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // 5. Determine consultation request status filter
    // Default: Only show SCHEDULED and CONFIRMED (approved consultations)
    // This ensures doctors never see unreviewed requests
    // BUT: If includeAll=true, show all appointments regardless of consultation_request_status
    let consultationRequestStatuses: ConsultationRequestStatus[] = [
      ConsultationRequestStatus.SCHEDULED,
      ConsultationRequestStatus.CONFIRMED,
    ];

    if (statusParam) {
      // If status is explicitly provided, use it
      const statuses = statusParam.split(',').map(s => s.trim()) as ConsultationRequestStatus[];
      consultationRequestStatuses = statuses;
    }

    // 6. Execute Use Case
    // REFACTORED: Moved logic to GetDoctorAppointmentsUseCase (Query Service)
    const { GetDoctorAppointmentsUseCase } = await import('@/application/use-cases/GetDoctorAppointmentsUseCase');
    const getDoctorAppointmentsUseCase = new GetDoctorAppointmentsUseCase(db);

    const finalLimit = limitParam ? parseInt(limitParam, 10) : undefined;
    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    const mappedAppointments = await getDoctorAppointmentsUseCase.execute({
      doctorId: actualDoctorId,
      status: statusParam || undefined, // undefined if null
      includeAll: includeAll,
      startDate: startDate,
      endDate: endDate,
      limit: finalLimit,
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
