/**
 * API Route: GET /api/patients/:id/consultations
 * 
 * Get Patient Consultation History endpoint.
 * 
 * Retrieves consultation history for a patient, optimized for aesthetic surgery workflows.
 * 
 * Security:
 * - Requires authentication
 * - DOCTOR role: Can access any patient's consultation history
 * - PATIENT role: Can only access own consultation history
 * - Validates patient exists
 * 
 * Aesthetic Surgery Considerations:
 * - Timeline-based UI (chronological display)
 * - Fast doctor scanning (key decisions visible)
 * - Photo tracking (before/after progression)
 * - Decision status (proceeded, declined, undecided)
 * - Case plan linkage (surgical planning workflow)
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetPatientConsultationHistoryUseCase } from '@/application/use-cases/GetPatientConsultationHistoryUseCase';
import { PrismaConsultationRepository } from '@/infrastructure/database/repositories/PrismaConsultationRepository';
import { PrismaPatientRepository } from '@/infrastructure/database/repositories/PrismaPatientRepository';
import { PrismaAppointmentRepository } from '@/infrastructure/database/repositories/PrismaAppointmentRepository';
import db from '@/lib/db';
import { DomainException } from '@/domain/exceptions/DomainException';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

// Initialize dependencies (singleton pattern)
const consultationRepository = new PrismaConsultationRepository(db);
const patientRepository = new PrismaPatientRepository(db);
const appointmentRepository = new PrismaAppointmentRepository(db);

// Initialize use case
const getPatientConsultationHistoryUseCase = new GetPatientConsultationHistoryUseCase(
  consultationRepository,
  patientRepository,
  appointmentRepository,
);

/**
 * GET /api/patients/:id/consultations
 * 
 * Handles patient consultation history retrieval.
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

    // 2. Extract patient ID from params
    const patientId = params.id;
    if (!patientId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Patient ID is required',
        },
        { status: 400 }
      );
    }

    // 3. Check permissions (RBAC)
    // - DOCTOR: Can access any patient's consultation history
    // - PATIENT: Can only access own consultation history
    if (userRole === Role.PATIENT) {
      // Patient can only access their own consultation history
      if (userId !== patientId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: Patients can only access their own consultation history',
          },
          { status: 403 }
        );
      }
    } else if (userRole !== Role.DOCTOR && userRole !== Role.ADMIN) {
      // Only DOCTOR and ADMIN can access patient consultation history
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only doctors and admins can access patient consultation history',
        },
        { status: 403 }
      );
    }

    // 4. Execute get patient consultation history use case
    const response = await getPatientConsultationHistoryUseCase.execute(patientId);

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        data: response,
        message: 'Consultation history retrieved successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle domain exceptions (e.g., patient not found)
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
    console.error('[API] /api/patients/[id]/consultations - Unexpected error:', error);
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
