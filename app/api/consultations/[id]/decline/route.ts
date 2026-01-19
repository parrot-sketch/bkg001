/**
 * API Route: POST /api/consultations/:id/decline
 * 
 * Decline Consultation Request endpoint.
 * 
 * Allows doctors to decline consultation requests assigned to them.
 * 
 * Security:
 * - Requires authentication (doctor must be logged in)
 * - Only DOCTOR role can decline requests
 * - Doctor must be assigned to the consultation request
 * - Audit logging for all decline actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { DeclineConsultationRequestUseCase } from '@/application/use-cases/DeclineConsultationRequestUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { MockNotificationService } from '@/infrastructure/services/MockNotificationService';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { DeclineConsultationRequestDto } from '@/application/dtos/DeclineConsultationRequestDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const notificationService = new MockNotificationService();
const auditService = new ConsoleAuditService();

// Initialize use case
const declineConsultationRequestUseCase = new DeclineConsultationRequestUseCase(
  appointmentRepository,
  patientRepository,
  notificationService,
  auditService,
);

/**
 * POST /api/consultations/:id/decline
 * 
 * Handles consultation request decline by doctor.
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

    // 2. Check permissions (only DOCTOR or ADMIN can decline)
    if (userRole !== Role.DOCTOR && userRole !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can decline consultation requests',
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

    // 6. Build DTO
    const dto: DeclineConsultationRequestDto = {
      appointmentId,
      doctorId,
      reason: body.reason,
    };

    // 7. Execute decline consultation request use case
    const response = await declineConsultationRequestUseCase.execute(dto);

    // 8. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Consultation request declined successfully',
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
    console.error('[API] /api/consultations/[id]/decline - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
