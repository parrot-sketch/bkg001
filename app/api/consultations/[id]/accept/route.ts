/**
 * API Route: POST /api/consultations/:id/accept
 * 
 * Accept Consultation Request endpoint.
 * 
 * Allows doctors to accept consultation requests assigned to them.
 * 
 * Security:
 * - Requires authentication (doctor must be logged in)
 * - Only DOCTOR role can accept requests
 * - Doctor must be assigned to the consultation request
 * - Validates state transitions
 * - Audit logging for all accept actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { AcceptConsultationRequestUseCase } from '@/application/use-cases/AcceptConsultationRequestUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { emailNotificationService } from '@/infrastructure/services/EmailNotificationService';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import db from '@/lib/db';
import { AcceptConsultationRequestDto } from '@/application/dtos/AcceptConsultationRequestDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const notificationService = emailNotificationService;
const auditService = new ConsoleAuditService();
const timeService = new SystemTimeService();

// Initialize use case
const acceptConsultationRequestUseCase = new AcceptConsultationRequestUseCase(
  appointmentRepository,
  patientRepository,
  notificationService,
  auditService,
  timeService,
);

/**
 * POST /api/consultations/:id/accept
 * 
 * Handles consultation request acceptance by doctor.
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

    // 2. Check permissions (only DOCTOR or ADMIN can accept)
    if (userRole !== Role.DOCTOR && userRole !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can accept consultation requests',
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

    // 5. Get doctor ID from user
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

    // 6. Convert appointmentDate to Date object if provided
    let appointmentDate: Date | undefined;
    if (body.appointmentDate) {
      appointmentDate = typeof body.appointmentDate === 'string' 
        ? new Date(body.appointmentDate) 
        : body.appointmentDate;
    }

    // 7. Build DTO
    const dto: AcceptConsultationRequestDto = {
      appointmentId,
      doctorId,
      appointmentDate,
      time: body.time,
      notes: body.notes,
    };

    // 8. Execute accept consultation request use case
    const response = await acceptConsultationRequestUseCase.execute(dto);

    // 9. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Consultation request accepted successfully',
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
    console.error('[API] /api/consultations/[id]/accept - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
