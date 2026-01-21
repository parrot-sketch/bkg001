/**
 * API Route: POST /api/consultations/:id/review
 * 
 * Consultation Request Review endpoint.
 * 
 * Allows Frontdesk to review, approve, request more info, or reject consultation requests.
 * 
 * Security:
 * - Requires authentication (Frontdesk/Admin must be logged in)
 * - Only FRONTDESK or ADMIN roles can review requests
 * - Validates state transitions
 * - Audit logging for all review actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReviewConsultationRequestUseCase } from '@/application/use-cases/ReviewConsultationRequestUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { PrismaUserRepository } from '@/infrastructure/database/repositories/PrismaUserRepository';
import { emailNotificationService } from '@/infrastructure/services/EmailNotificationService';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import { SystemTimeService } from '@/infrastructure/services/SystemTimeService';
import db from '@/lib/db';
import { ReviewConsultationRequestDto } from '@/application/dtos/ReviewConsultationRequestDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { ConsultationRequestStatus } from '@/domain/enums/ConsultationRequestStatus';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const userRepository = new PrismaUserRepository(db);
const notificationService = emailNotificationService;
const auditService = new ConsoleAuditService();
const timeService = new SystemTimeService();

// Initialize use case
const reviewConsultationRequestUseCase = new ReviewConsultationRequestUseCase(
  appointmentRepository,
  patientRepository,
  userRepository,
  notificationService,
  auditService,
  timeService,
);

/**
 * POST /api/consultations/:id/review
 * 
 * Handles consultation request review.
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

    // 2. Check permissions (only FRONTDESK or ADMIN can review)
    if (userRole !== Role.FRONTDESK && userRole !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only Frontdesk or Admin can review consultation requests',
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

    // 5. Validate action
    if (!body || !body.action || !['approve', 'needs_more_info', 'reject'].includes(body.action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Required field: action (must be "approve", "needs_more_info", or "reject")',
        },
        { status: 400 }
      );
    }

    // 6. Validate action-specific requirements
    if (body.action === 'approve' && (!body.proposedDate || !body.proposedTime)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Proposed date and time are required when approving',
        },
        { status: 400 }
      );
    }

    if (body.action === 'needs_more_info' && !body.reviewNotes) {
      return NextResponse.json(
        {
          success: false,
          error: 'Review notes are required when requesting more information',
        },
        { status: 400 }
      );
    }

    // 7. Convert proposedDate to Date object if provided
    let proposedDate: Date | undefined;
    if (body.proposedDate) {
      proposedDate = typeof body.proposedDate === 'string' ? new Date(body.proposedDate) : body.proposedDate;
    }

    // 8. Build DTO
    const dto: ReviewConsultationRequestDto = {
      appointmentId,
      action: body.action,
      reviewedBy: userId,
      reviewNotes: body.reviewNotes,
      proposedDate,
      proposedTime: body.proposedTime,
    };

    // 9. Execute review consultation request use case
    const response = await reviewConsultationRequestUseCase.execute(dto, userId);

    // 10. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: `Consultation request ${body.action === 'approve' ? 'approved' : body.action === 'needs_more_info' ? 'requires more information' : 'rejected'} successfully`,
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
    console.error('[API] /api/consultations/[id]/review - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
