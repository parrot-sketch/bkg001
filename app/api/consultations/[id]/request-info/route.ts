/**
 * API Route: POST /api/consultations/:id/request-info
 * 
 * Request More Information endpoint.
 * 
 * Allows doctors to request more information from patients on consultation requests.
 * 
 * Security:
 * - Requires authentication (doctor must be logged in)
 * - Only DOCTOR role can request more info
 * - Doctor must be assigned to the consultation request
 * - Validates state transitions
 * - Audit logging for all request-info actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { RequestMoreInfoConsultationRequestUseCase } from '@/application/use-cases/RequestMoreInfoConsultationRequestUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { MockNotificationService } from '@/infrastructure/services/MockNotificationService';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import db from '@/lib/db';
import { RequestMoreInfoConsultationRequestDto } from '@/application/dtos/RequestMoreInfoConsultationRequestDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const notificationService = new MockNotificationService();
const auditService = new ConsoleAuditService();
const timeService = new SystemTimeService();

// Initialize use case
const requestMoreInfoConsultationRequestUseCase = new RequestMoreInfoConsultationRequestUseCase(
  appointmentRepository,
  patientRepository,
  notificationService,
  auditService,
  timeService,
);

/**
 * POST /api/consultations/:id/request-info
 * 
 * Handles consultation request more info request by doctor.
 */
export async function POST(
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

    // 2. Check permissions (only DOCTOR or ADMIN can request more info)
    if (userRole !== Role.DOCTOR && userRole !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can request more information',
        },
        { status: 403 }
      );
    }

    // 3. Extract appointment ID from params
    const appointmentId = parseInt(params.id, 10);
    if (isNaN(appointmentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid appointment ID',
        },
        { status: 400 }
      );
    }

    // 4. Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    // 5. Validate required fields
    if (!body || !body.questions || body.questions.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Questions are required when requesting more information',
        },
        { status: 400 }
      );
    }

    // 6. Get doctor ID from user
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

    const doctorId = doctor.id;

    // 7. Build DTO
    const dto: RequestMoreInfoConsultationRequestDto = {
      appointmentId,
      doctorId,
      questions: body.questions,
      notes: body.notes,
    };

    // 8. Execute request more info consultation request use case
    const response = await requestMoreInfoConsultationRequestUseCase.execute(dto);

    // 9. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'More information requested successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle domain exceptions (e.g., validation errors, invalid state transitions)
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
    console.error('[API] /api/consultations/[id]/request-info - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
