/**
 * API Route: GET /api/doctors/:id/dashboard-stats
 * 
 * Doctor Dashboard Statistics endpoint.
 * 
 * Returns aggregated statistics for doctor dashboard.
 * 
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can access (and must be own doctor ID)
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetDoctorDashboardStatsUseCase } from '@/application/use-cases/GetDoctorDashboardStatsUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import db from '@/lib/db';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const timeService = new SystemTimeService();

// Initialize use case
const getDoctorDashboardStatsUseCase = new GetDoctorDashboardStatsUseCase(
  appointmentRepository,
  timeService,
);

/**
 * GET /api/doctors/:id/dashboard-stats
 * 
 * Returns dashboard statistics for a doctor.
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

    // 2. Check permissions (only DOCTOR or ADMIN can access)
    if (userRole !== Role.DOCTOR && userRole !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can view dashboard statistics',
        },
        { status: 403 }
      );
    }

    // 3. Extract doctor ID from params
    const doctorId = params.id;
    if (!doctorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor ID is required',
        },
        { status: 400 }
      );
    }

    // 4. Verify doctor can only access their own stats (unless admin)
    if (userRole === Role.DOCTOR) {
      // Get doctor ID from user
      const doctor = await db.doctor.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });

      if (!doctor) {
        return NextResponse.json(
          {
            success: false,
            error: 'Doctor profile not found for this user',
          },
          { status: 404 }
        );
      }

      if (doctor.id !== doctorId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: Doctors can only view their own dashboard statistics',
          },
          { status: 403 }
        );
      }
    }

    // 5. Execute get doctor dashboard stats use case
    const response = await getDoctorDashboardStatsUseCase.execute(doctorId);

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Dashboard statistics retrieved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle domain exceptions (e.g., validation errors)
    if (error instanceof DomainException) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Unexpected error - log and return generic error
    console.error('[API] /api/doctors/[id]/dashboard-stats - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
