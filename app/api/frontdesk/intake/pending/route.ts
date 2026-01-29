import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PrismaIntakeSubmissionRepository } from '@/infrastructure/repositories/IntakeSubmissionRepository';
import { IntakeSubmissionMapper } from '@/infrastructure/mappers/IntakeSubmissionMapper';

/**
 * GET /api/frontdesk/intake/pending
 *
 * Frontdesk views pending intake submissions
 *
 * Query Parameters:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 * - status: string (optional - PENDING, CONFIRMED, REJECTED)
 *
 * Response:
 * {
 *   intakes: [
 *     {
 *       sessionId: "...",
 *       submittedAt: "2026-01-25T10:30:00Z",
 *       patientData: {
 *         firstName: "John",
 *         lastName: "Doe",
 *         email: "john@example.com",
 *         phone: "254712345678",
 *         dateOfBirth: "1990-01-15T00:00:00Z",
 *         gender: "MALE",
 *         address: "Nairobi, Kenya"
 *       },
 *       completenessScore: 95,
 *       missingFields: []
 *     }
 *   ],
 *   total: 5,
 *   limit: 20,
 *   offset: 0
 * }
 *
 * Errors:
 * - 401: Not authenticated
 * - 403: Not frontdesk role
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add authentication check
    // TODO: Add role check (FRONTDESK only)

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const status = searchParams.get('status') || undefined;

    const repository = new PrismaIntakeSubmissionRepository(db);

    // Get pending submissions (using provided limit/offset)
    const submissions = await repository.findPending(limit, offset);
    const total = await repository.countPending();

    // Map to DTOs
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

    return NextResponse.json({
      intakes,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[GetPendingIntakes]', error);

    return NextResponse.json(
      { error: 'Failed to fetch pending intakes' },
      { status: 500 },
    );
  }
}
