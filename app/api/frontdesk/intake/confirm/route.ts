import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { container } from '@/lib/container';
import { IntakeError } from '@/domain/errors/IntakeErrors';

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request, ['FRONTDESK', 'ADMIN']);

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    const result = await container.confirmIntake.execute(sessionId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof IntakeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('[ConfirmPatientIntake]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
