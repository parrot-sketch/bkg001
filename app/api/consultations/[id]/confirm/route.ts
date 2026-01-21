/**
 * API Route: POST /api/consultations/:id/confirm
 * 
 * Consultation Confirmation endpoint.
 * 
 * Allows patients to confirm a scheduled consultation.
 * 
 * Security:
 * - Requires authentication (patient must be logged in)
 * - Patients can only confirm their own consultations
 * - Validates state transition (SCHEDULED → CONFIRMED)
 * - Audit logging for all confirmations
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConfirmConsultationUseCase } from '@/application/use-cases/ConfirmConsultationUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { emailNotificationService } from '@/infrastructure/services/EmailNotificationService';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import db from '@/lib/db';
import { ConfirmConsultationDto } from '@/application/dtos/ConfirmConsultationDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const userRepository = new PrismaUserRepository(db);
const notificationService = emailNotificationService;
const auditService = new ConsoleAuditService();
const timeService = new SystemTimeService();

// Initialize use case
const confirmConsultationUseCase = new ConfirmConsultationUseCase(
  appointmentRepository,
  patientRepository,
  userRepository,
  notificationService,
  auditService,
  timeService,
);

/**
 * POST /api/consultations/:id/confirm
 * 
 * Handles consultation confirmation.
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

    // 2. Extract appointment ID from params
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

    // 3. Resolve Patient ID from User ID
    // Patient records are linked to User accounts via user_id field
    const patient = await db.patient.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient profile not found. Please complete your profile first.',
        },
        { status: 404 }
      );
    }

    const patientId = patient.id;

    // 4. Build DTO
    const dto: ConfirmConsultationDto = {
      appointmentId,
      patientId,
    };

    // 5. Execute confirm consultation use case
    const response = await confirmConsultationUseCase.execute(dto, userId);

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Consultation confirmed successfully',
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
    console.error('[API] /api/consultations/[id]/confirm - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
