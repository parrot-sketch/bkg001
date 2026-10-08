import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { IntakeSession } from '@/domain/entities/IntakeSession';
import { guardIntakeRequest } from '@/lib/middleware/intake-security';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/patient/intake/start
 *
 * Public endpoint used by the permanent (non-expiring) intake QR code.
 *
 * The QR code points to `/intake` (no sessionId). When a patient opens it,
 * the client calls this endpoint to create a fresh time-limited IntakeSession,
 * then redirects to `/intake/[sessionId]`.
 *
 * Privacy:
 * - The QR contains no PII and no embedded token.
 * - A new session is created per patient.
 */
export async function POST(request: NextRequest) {
  const blocked = guardIntakeRequest(request, 'start');
  if (blocked) return blocked;

  try {
    const sessionId = uuidv4();
    const expirationMinutes = Number(process.env.INTAKE_SESSION_EXP_MINUTES ?? '60');

    const session = IntakeSession.create({
      sessionId,
      expirationMinutes: Number.isFinite(expirationMinutes) ? expirationMinutes : 60,
    });

    await container.sessionRepo.create(session);

    return NextResponse.json(
      {
        sessionId,
        expiresAt: session.getExpiresAt().toISOString(),
        minutesRemaining: session.getMinutesRemaining(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[StartPatientIntake]', error);
    return NextResponse.json(
      { error: 'Could not start the form. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
