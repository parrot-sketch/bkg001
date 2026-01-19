/**
 * API Route: PUT /api/appointments/:id/notes
 * 
 * Add/Update Appointment Notes endpoint.
 * 
 * Allows doctors to add pre-consultation notes to appointments.
 * 
 * Security:
 * - Requires authentication (doctor must be logged in)
 * - Only DOCTOR role can add notes
 * - Doctor must be assigned to the appointment
 * - Audit logging for all note additions
 */

import { NextRequest, NextResponse } from 'next/server';
import { AddAppointmentNotesUseCase } from '@/application/use-cases/AddAppointmentNotesUseCase';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import { ConsoleAuditService } from '@/infrastructure/services/ConsoleAuditService';
import db from '@/lib/db';
import { AddAppointmentNotesDto } from '@/application/dtos/AddAppointmentNotesDto';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies (singleton pattern)
const appointmentRepository = new PrismaAppointmentRepository(db);
const auditService = new ConsoleAuditService();

// Initialize use case
const addAppointmentNotesUseCase = new AddAppointmentNotesUseCase(
  appointmentRepository,
  auditService,
);

/**
 * PUT /api/appointments/:id/notes
 * 
 * Handles adding/updating appointment notes by doctor.
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

    // 2. Check permissions (only DOCTOR or ADMIN can add notes)
    if (userRole !== Role.DOCTOR && userRole !== Role.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can add appointment notes',
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
    if (!body || !body.notes || body.notes.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Notes are required',
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
    const dto: AddAppointmentNotesDto = {
      appointmentId,
      doctorId,
      notes: body.notes,
    };

    // 8. Execute add appointment notes use case
    const response = await addAppointmentNotesUseCase.execute(dto);

    // 9. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Appointment notes added successfully',
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
    console.error('[API] /api/appointments/[id]/notes - Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
