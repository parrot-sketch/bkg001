import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { container } from '@/lib/container';
import { IntakeError, ValidationError } from '@/domain/errors/IntakeErrors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request, ['FRONTDESK', 'ADMIN', 'DOCTOR', 'NURSE']);
    const { id } = await params;

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined;

    const result = await container.getPatientDetail.execute(id, {
      userId: auth.userId,
      ipAddress,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof IntakeError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('[GET /api/patients/[id]]', error);
    return NextResponse.json({ success: false, error: 'Failed to load patient' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(request, ['FRONTDESK', 'ADMIN', 'DOCTOR', 'NURSE']);
    const { id } = await params;
    const body = await request.json();

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined;

    const result = await container.updatePatient.execute(id, body, {
      userId: auth.userId,
      ipAddress,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code, details: error.fieldErrors },
        { status: error.statusCode },
      );
    }
    if (error instanceof IntakeError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('[PUT /api/patients/[id]]', error);
    return NextResponse.json({ success: false, error: 'Failed to update patient' }, { status: 500 });
  }
}
