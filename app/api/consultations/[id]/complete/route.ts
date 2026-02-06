/**
 * API Route: POST /api/consultations/:id/complete
 * 
 * Complete Consultation endpoint.
 * 
 * Allows doctors to complete a consultation and optionally schedule follow-up.
 * 
 * Security:
 * - Requires authentication (Doctor must be logged in)
 * - Only DOCTOR role can complete consultations
 * - Validates doctor is assigned to the appointment
 * - Audit logging for all consultation completions
 */

import { NextRequest, NextResponse } from 'next/server';
import { CompleteConsultationUseCase } from '@/application/use-cases/CompleteConsultationUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { PrismaPaymentRepository } from '@/infrastructure/database/repositories/PrismaPaymentRepository';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { PrismaSurgicalCaseRepository } from '@/infrastructure/database/repositories/PrismaSurgicalCaseRepository';
import { PrismaCasePlanRepository } from '@/infrastructure/database/repositories/PrismaCasePlanRepository';
import { PrismaConsultationRepository } from '@/infrastructure/database/repositories/PrismaConsultationRepository';
import { emailNotificationService } from '@/infrastructure/services/EmailNotificationService';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { CompleteConsultationDto } from '@/application/dtos/CompleteConsultationDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const paymentRepository = new PrismaPaymentRepository(db);
const userRepository = new PrismaUserRepository(db);
const surgicalCaseRepository = new PrismaSurgicalCaseRepository(db);
const casePlanRepository = new PrismaCasePlanRepository(db);
const consultationRepository = new PrismaConsultationRepository(db);
const notificationService = emailNotificationService;
const auditService = new ConsoleAuditService();

// Initialize use case with billing and surgery workflow support
const completeConsultationUseCase = new CompleteConsultationUseCase(
  appointmentRepository,
  patientRepository,
  notificationService,
  auditService,
  paymentRepository,
  userRepository,
  surgicalCaseRepository,
  casePlanRepository,
  consultationRepository,
);

/**
 * POST /api/consultations/:id/complete
 * 
 * Handles consultation completion.
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

    // 2. Check permissions (only DOCTOR can complete consultations)
    if (userRole !== Role.DOCTOR) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can complete consultations',
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

    // 4. Get doctor ID from user
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

    // 5. Parse request body
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

    // 6. Validate required fields
    if (!body || !body.outcome || !body.outcome.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Required field: outcome',
        },
        { status: 400 }
      );
    }

    if (!body.outcomeType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Required field: outcomeType',
        },
        { status: 400 }
      );
    }

    // 7. Convert followUpDate to Date object if provided
    let followUpDate: Date | undefined;
    if (body.followUpDate) {
      followUpDate = typeof body.followUpDate === 'string' ? new Date(body.followUpDate) : body.followUpDate;
    }

    // 8. Build DTO
    const dto: CompleteConsultationDto = {
      appointmentId,
      doctorId,
      outcome: body.outcome.trim(),
      outcomeType: body.outcomeType,
      patientDecision: body.patientDecision || undefined,
      procedureRecommended: body.procedureRecommended || undefined,
      referralInfo: body.referralInfo || undefined,
      followUpDate,
      followUpTime: body.followUpTime || undefined,
      followUpType: body.followUpType || undefined,
    };

    // 9. Execute complete consultation use case
    const response = await completeConsultationUseCase.execute(dto);

    // 10. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Consultation completed successfully',
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
    console.error('[API] /api/consultations/[id]/complete - Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'development' 
          ? `Internal server error: ${errorMessage}` 
          : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
