import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { container } from '@/lib/container';
import { IntakeError } from '@/domain/errors/IntakeErrors';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ['FRONTDESK', 'ADMIN']);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const submissions = await container.submissionRepo.findPending(limit, offset);
    const total = await container.submissionRepo.countPending();

    const intakes = submissions.map((submission) => {
      const primitive = submission.toPrimitive();
      return {
        sessionId: primitive.sessionId,
        submissionId: primitive.submissionId,
        submittedAt: primitive.submittedAt,
        patientData: {
          firstName: primitive.personalInfo.firstName,
          lastName: primitive.personalInfo.lastName,
          email: primitive.contactInfo.email,
          phone: primitive.contactInfo.phone,
          dateOfBirth: primitive.personalInfo.dateOfBirth,
          gender: primitive.personalInfo.gender,
          address: primitive.contactInfo.address,
        },
        completenessScore: primitive.completenessScore,
        missingFields: submission.getIncompleteness(),
      };
    });

    return NextResponse.json({ intakes, total, limit, offset });
  } catch (error) {
    if (error instanceof IntakeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }
    console.error('[GetPendingIntakes]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
