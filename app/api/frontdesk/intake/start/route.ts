import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';
import { StartPatientIntakeUseCase } from '@/application/use-cases/StartPatientIntakeUseCase';
import { PrismaIntakeSessionRepository } from '@/infrastructure/repositories/IntakeSessionRepository';

// Module-level singleton — shared across requests
const sessionRepository = new PrismaIntakeSessionRepository(db);
const startIntakeUseCase = new StartPatientIntakeUseCase(sessionRepository);

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
    // Verify authentication — frontdesk staff only
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const result = await startIntakeUseCase.execute();

    // Rewrite the intakeFormUrl to use the new clean /intake/[sessionId] route
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;
    const cleanUrl = `${baseUrl}/intake/${result.sessionId}`;

    return NextResponse.json({ ...result, intakeFormUrl: cleanUrl }, { status: 201 });
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
