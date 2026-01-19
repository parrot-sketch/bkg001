/**
 * API Route: POST /api/consultations/submit
 * 
 * Consultation Request Submission endpoint.
 * 
 * Allows patients to submit a consultation request for review by Frontdesk.
 * 
 * Security:
 * - Requires authentication (patient must be logged in)
 * - Patients can only submit requests for themselves
 * - Validation of required fields
 * - Audit logging for all submissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { SubmitConsultationRequestUseCase } from '@/application/use-cases/SubmitConsultationRequestUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { MockNotificationService } from '@/infrastructure/services/MockNotificationService';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import db from '@/lib/db';
import { SubmitConsultationRequestDto } from '@/application/dtos/SubmitConsultationRequestDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/controllers/middleware/JwtMiddleware';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const notificationService = new MockNotificationService();
const auditService = new ConsoleAuditService();
const timeService = new SystemTimeService();

// Initialize use case
const submitConsultationRequestUseCase = new SubmitConsultationRequestUseCase(
  appointmentRepository,
  patientRepository,
  notificationService,
  auditService,
  timeService,
);

/**
 * POST /api/consultations/submit
 * 
 * Handles consultation request submission.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // 2. Parse request body
    let body: SubmitConsultationRequestDto;
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

    // 3. Validate required fields
    if (
      !body ||
      !body.patientId ||
      !body.serviceId ||
      !body.concernDescription ||
      !body.preferredDate ||
      !body.timePreference ||
      body.isOver18 === undefined ||
      !body.contactConsent ||
      !body.privacyConsent ||
      !body.acknowledgmentConsent
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Required fields: patientId, serviceId, concernDescription, preferredDate, timePreference, isOver18, contactConsent, privacyConsent, acknowledgmentConsent',
        },
        { status: 400 }
      );
    }

    // 4. Convert preferredDate to Date object if it's a string
    if (typeof body.preferredDate === 'string') {
      body.preferredDate = new Date(body.preferredDate);
    }

    // 5. Execute submit consultation request use case
    const response = await submitConsultationRequestUseCase.execute(body, userId);

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Consultation request submitted successfully',
      },
      { status: 201 }
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
    console.error('[API] /api/consultations/submit - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
