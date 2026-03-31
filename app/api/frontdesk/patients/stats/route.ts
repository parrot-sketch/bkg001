import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { container } from '@/lib/container';
import { IntakeError } from '@/domain/errors/IntakeErrors';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['FRONTDESK', 'ADMIN']);

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await container.getPatientStats.execute({
      userId: auth.userId,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof IntakeError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('[GetPatientStats]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch patient stats' },
      { status: 500 },
    );
  }
}
