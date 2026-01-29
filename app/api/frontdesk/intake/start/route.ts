import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { StartPatientIntakeUseCase } from '@/application/use-cases/StartPatientIntakeUseCase';
import { PrismaIntakeSessionRepository } from '@/infrastructure/repositories/IntakeSessionRepository';

/**
 * POST /api/frontdesk/intake/start
 *
 * Frontdesk initiates patient intake session
 *
 * Response:
 * {
 *   sessionId: "abc123xyz",
 *   qrCodeUrl: "data:image/png;base64,...",
 *   intakeFormUrl: "https://yoursite.com/patient/intake?sessionId=abc123xyz",
 *   expiresAt: "2026-01-25T11:30:00Z",
 *   minutesRemaining: 60
 * }
 *
 * Errors:
 * - 401: Not authenticated
 * - 403: Not frontdesk role
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // TODO: Add role check (FRONTDESK only)

    const repository = new PrismaIntakeSessionRepository(db);
    const useCase = new StartPatientIntakeUseCase(repository);

    const result = await useCase.execute();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[StartPatientIntake]', error);

    if (error instanceof Error) {
      // Domain exceptions
      if (
        error.message.includes('Session') ||
        error.message.includes('validation')
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to start patient intake' },
      { status: 500 },
    );
  }
}
