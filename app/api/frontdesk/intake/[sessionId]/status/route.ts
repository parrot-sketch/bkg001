import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { container } from '@/lib/container';
import { IntakeError } from '@/domain/errors/IntakeErrors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    await requireAuth(request, ['FRONTDESK', 'ADMIN']);

    const { sessionId } = await params;
    const result = await container.getIntakeSessionStatus.execute(sessionId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof IntakeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('[IntakeSessionStatus]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
