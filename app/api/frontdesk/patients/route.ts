import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { container } from '@/lib/container';
import { IntakeError } from '@/domain/errors/IntakeErrors';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request, ['FRONTDESK', 'ADMIN']);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || 12), 100);
    const search = searchParams.get('q')?.trim() || undefined;

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await container.listPatients.execute(
      { page, limit, search },
      { userId: auth.userId, ipAddress, userAgent },
    );

    return NextResponse.json({
      success: true,
      data: result.records,
      meta: {
        totalRecords: result.totalRecords,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        limit,
      },
    });
  } catch (error) {
    if (error instanceof IntakeError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('[ListPatients]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch patients' },
      { status: 500 },
    );
  }
}
