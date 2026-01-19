/**
 * API Route: POST /api/consultations/:id/start
 * 
 * Start Consultation endpoint.
 * 
 * Allows doctors to start a consultation for an appointment.
 * 
 * Security:
 * - Requires authentication (Doctor must be logged in)
 * - Only DOCTOR role can start consultations
 * - Validates doctor is assigned to the appointment
 * - Audit logging for all consultation starts
 */

import { NextRequest, NextResponse } from 'next/server';
import { StartConsultationUseCase } from '@/application/use-cases/StartConsultationUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { StartConsultationDto } from '@/application/dtos/StartConsultationDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const auditService = new ConsoleAuditService();

// Initialize use case
const startConsultationUseCase = new StartConsultationUseCase(
  appointmentRepository,
  auditService,
);

/**
 * POST /api/consultations/:id/start
 * 
 * Handles consultation start.
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

    // 2. Check permissions (only DOCTOR can start consultations)
    if (userRole !== Role.DOCTOR) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can start consultations',
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

    // 6. Build DTO
    const dto: StartConsultationDto = {
      appointmentId,
      doctorId,
      doctorNotes: body.doctorNotes || undefined,
    };

    // 7. Execute start consultation use case
    const response = await startConsultationUseCase.execute(dto);

    // 8. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Consultation started successfully',
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
    console.error('[API] /api/consultations/[id]/start - Unexpected error:', error);
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
