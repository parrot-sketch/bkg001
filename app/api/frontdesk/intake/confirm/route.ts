import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ConfirmPatientIntakeUseCase } from '@/application/use-cases/ConfirmPatientIntakeUseCase';
import { PrismaIntakeSessionRepository } from '@/infrastructure/repositories/IntakeSessionRepository';
import { PrismaIntakeSubmissionRepository } from '@/infrastructure/repositories/IntakeSubmissionRepository';
import { PrismaPatientRepository } from '@/infrastructure/repositories/PatientRepository';

/**
 * POST /api/frontdesk/intake/confirm
 *
 * Frontdesk confirms intake & creates patient record
 *
 * Request Body:
 * {
 *   sessionId: "abc123xyz",
 *   corrections: { ... } (optional, for future enhancement)
 * }
 *
 * Response:
 * {
 *   patientId: "patient-123",
 *   fileNumber: "NS001",
 *   firstName: "John",
 *   lastName: "Doe",
 *   email: "john@example.com",
 *   phone: "254712345678"
 * }
 *
 * Errors:
 * - 400: Validation error or incomplete data
 * - 401: Not authenticated
 * - 403: Not frontdesk role
 * - 404: Session or submission not found
 * - 409: Already confirmed or rejected
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // TODO: Add role check (FRONTDESK only)
    // TODO: Add audit logging (log who confirmed, when)

    const body = await request.json();
    const { sessionId, corrections } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 },
      );
    }

    // Initialize repositories and use case
    const sessionRepository = new PrismaIntakeSessionRepository(db);
    const submissionRepository = new PrismaIntakeSubmissionRepository(db);
    const patientRepository = new PrismaPatientRepository(db);

    const useCase = new ConfirmPatientIntakeUseCase(
      submissionRepository,
      sessionRepository,
      patientRepository,
    );

    // Execute use case
    const result = await useCase.execute({
      sessionId,
      corrections,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[ConfirmPatientIntake]', error);

    if (error instanceof Error) {
      // Domain exceptions - client errors
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 },
        );
      }

      if (
        error.message.includes('already been') ||
        error.message.includes('rejected')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 },
        );
      }

      // Validation errors
      if (
        error.message.includes('incomplete') ||
        error.message.includes('Missing')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to confirm patient intake' },
      { status: 500 },
    );
  }
}
