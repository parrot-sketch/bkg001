/**
 * API Route: GET /api/consultations/doctor/:doctorId/pending
 * 
 * Get Pending Consultation Requests endpoint.
 * 
 * Returns pending consultation requests assigned to a doctor.
 * 
 * Security:
 * - Requires authentication
 * - Only DOCTOR role can access (and must be own doctor ID)
 * - Supports pagination and status filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetPendingConsultationRequestsUseCase } from '@/application/use-cases/GetPendingConsultationRequestsUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import db from '@/lib/db';
import { GetPendingConsultationRequestsDto } from '@/application/dtos/GetPendingConsultationRequestsDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);

// Initialize use case
const getPendingConsultationRequestsUseCase = new GetPendingConsultationRequestsUseCase(
  appointmentRepository,
);

/**
 * GET /api/consultations/doctor/:doctorId/pending
 * 
 * Query params:
 * - status: Filter by consultation request status (optional)
 * - limit: Limit results (optional, default: 50)
 * - offset: Offset for pagination (optional, default: 0)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ doctorId: string }> }
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
          error: 'Access denied: Only doctors can view pending consultation requests',
        },
        { status: 403 }
      );
    }

    // 3. Extract doctor ID from params
    const doctorId = params.doctorId;
    if (!doctorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor ID is required',
        },
        { status: 400 }
      );
    }

    // 4. Verify doctor can only access their own requests (unless admin)
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
            error: 'Access denied: Doctors can only view their own pending consultation requests',
          },
          { status: 403 }
        );
      }
    }

    // 5. Parse query parameters
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // 6. Build DTO
    const dto: GetPendingConsultationRequestsDto = {
      doctorId,
      status: statusParam || undefined,
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
      offset: offsetParam ? parseInt(offsetParam, 10) : undefined,
    };

    // 7. Execute get pending consultation requests use case
    const response = await getPendingConsultationRequestsUseCase.execute(dto);

    // 8. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Pending consultation requests retrieved successfully',
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
    console.error('[API] /api/consultations/doctor/[doctorId]/pending - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
