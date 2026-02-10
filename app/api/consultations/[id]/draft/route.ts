/**
 * API Route: PUT /api/consultations/:id/draft
 * 
 * Save Consultation Draft endpoint.
 * 
 * Saves draft consultation notes during an active consultation session.
 * 
 * Security:
 * - Requires authentication (Doctor must be logged in)
 * - Only DOCTOR role can save consultation drafts
 * - Validates doctor is assigned to the appointment (RBAC)
 * - Validates consultation is IN_PROGRESS (state machine)
 * - Supports version safety (optimistic locking)
 * 
 * Aesthetic Surgery Considerations:
 * - Draft notes are legally sensitive → version safety enforced
 * - Audit-friendly structure (timestamped, user-tracked)
 * - Future extensibility (structured fields)
 */

import { NextRequest, NextResponse } from 'next/server';
import { SaveConsultationDraftUseCase } from '@/application/use-cases/SaveConsultationDraftUseCase';
import { PrismaConsultationRepository } from '@/infrastructure/database/repositories/PrismaConsultationRepository';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { SaveConsultationDraftDto } from '@/application/dtos/SaveConsultationDraftDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies (singleton pattern)
const consultationRepository = new PrismaConsultationRepository(db);
const appointmentRepository = new PrismaAppointmentRepository(db);
const auditService = new ConsoleAuditService();

// Initialize use case
const saveConsultationDraftUseCase = new SaveConsultationDraftUseCase(
  consultationRepository,
  appointmentRepository,
  auditService,
);

/**
 * PUT /api/consultations/:id/draft
 * 
 * Handles consultation draft save.
 */
export async function PUT(
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

    // 2. Check permissions (only DOCTOR can save consultation drafts)
    if (userRole !== Role.DOCTOR) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can save consultation drafts',
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
    if (!body || !body.notes) {
      return NextResponse.json(
        {
          success: false,
          error: 'Required field: notes',
        },
        { status: 400 }
      );
    }

    // 7. Validate notes structure
    if (!body.notes.rawText && !body.notes.structured) {
      return NextResponse.json(
        {
          success: false,
          error: 'Notes must contain either rawText or structured fields',
        },
        { status: 400 }
      );
    }

    // 8. Build DTO
    const dto: SaveConsultationDraftDto = {
      appointmentId,
      doctorId,
      notes: {
        rawText: body.notes.rawText || undefined,
        structured: body.notes.structured || undefined,
      },
      outcomeType: body.outcomeType || undefined,
      patientDecision: body.patientDecision || undefined,
      versionToken: body.versionToken || undefined,
    };

    // 9. Execute save consultation draft use case
    const response = await saveConsultationDraftUseCase.execute(dto);

    // 10. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Draft saved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle domain exceptions (e.g., validation errors, state machine violations, version conflicts)
    if (error instanceof DomainException) {
      // Check if it's a version conflict (optimistic locking)
      if (error.message.includes('updated by another session')) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            code: 'VERSION_CONFLICT',
          },
          { status: 409 } // Conflict status code
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    // Unexpected error - log and return generic error
    console.error('[API] /api/consultations/[id]/draft - Unexpected error:', error);
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
