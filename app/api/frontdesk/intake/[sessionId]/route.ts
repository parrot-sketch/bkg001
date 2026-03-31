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
    const submission = await container.submissionRepo.findBySessionId(sessionId);

    if (!submission) {
      return NextResponse.json(
        { error: 'Intake submission not found', code: 'SESSION_NOT_FOUND' },
        { status: 404 },
      );
    }

    const primitive = submission.toPrimitive();

    return NextResponse.json({
      submissionId: primitive.submissionId,
      sessionId: primitive.sessionId,
      personalInfo: primitive.personalInfo,
      contactInfo: primitive.contactInfo,
      emergencyContact: primitive.emergencyContact,
      medicalInfo: primitive.medicalInfo,
      insuranceInfo: primitive.insuranceInfo,
      consent: primitive.consent,
      submittedAt: primitive.submittedAt,
      status: primitive.status,
      completenessScore: primitive.completenessScore,
      isComplete: primitive.isComplete,
    });
  } catch (error) {
    if (error instanceof IntakeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('[GetIntakeSubmission]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
