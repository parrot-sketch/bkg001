/**
 * API Route: GET /api/consultations/:id
 * 
 * Get Consultation endpoint.
 * 
 * Retrieves consultation details by appointment ID.
 * 
 * Security:
 * - Requires authentication (Doctor must be logged in)
 * - Only DOCTOR role can access consultations
 * - Validates doctor is assigned to the appointment (RBAC)
 * - Returns null if consultation doesn't exist yet (not started)
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetConsultationUseCase } from '@/application/use-cases/GetConsultationUseCase';
import { PrismaConsultationRepository } from '@/infrastructure/database/repositories/PrismaConsultationRepository';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import db from '@/lib/db';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies (singleton pattern)
const consultationRepository = new PrismaConsultationRepository(db);
const appointmentRepository = new PrismaAppointmentRepository(db);

// Initialize use case
const getConsultationUseCase = new GetConsultationUseCase(
  consultationRepository,
  appointmentRepository,
);

/**
 * GET /api/consultations/:id
 * 
 * Handles consultation retrieval.
 */
export async function GET(
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

    // 2. Check permissions (only DOCTOR can access consultations)
    if (userRole !== Role.DOCTOR) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors can access consultations',
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

    // 5. Execute get consultation use case
    const response = await getConsultationUseCase.execute(appointmentId, doctorId);

    // 6. Return success response (null is valid - consultation not started yet)
    return NextResponse.json(
      {
        success: true,
        data: response, // Can be null if consultation doesn't exist
        message: response ? 'Consultation retrieved successfully' : 'Consultation not started yet',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle domain exceptions (e.g., validation errors, access denied)
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
    console.error('[API] /api/consultations/[id] - Unexpected error:', error);
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
