import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { container } from '@/lib/container';
import { IntakeError } from '@/domain/errors/IntakeErrors';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['FRONTDESK', 'ADMIN']);

    const result = await container.startIntake.execute({
      createdByUserId: auth.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown): NextResponse {
  if (error instanceof IntakeError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode },
    );
  }
  console.error('[StartPatientIntake]', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
