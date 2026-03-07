import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/jwt-helper';

/**
 * GET /api/frontdesk/intake/[sessionId]/status
 *
 * Lightweight status check polled by the QR station every 4 seconds.
 * Returns only the minimal fields needed to drive the station's UI state machine.
 *
 * Response:
 * {
 *   sessionId:     string,
 *   status:        'PENDING_SUBMISSION' | 'SUBMITTED' | 'CONFIRMED' | 'EXPIRED',
 *   expiresAt:     string  (ISO),
 *   patientName?:  string  (only when SUBMITTED / CONFIRMED),
 *   submittedAt?:  string  (only when SUBMITTED / CONFIRMED),
 * }
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> },
) {
    try {
        const authResult = await authenticateRequest(request);
        if (!authResult.success) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sessionId } = await params;

        // Fetch session + its one-to-one submission in a single query
        const session = await db.intakeSession.findUnique({
            where: { session_id: sessionId },
            include: {
                submissions: {
                    select: {
                        first_name: true,
                        last_name: true,
                        submitted_at: true,
                    },
                },
            },
        });

        if (!session) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Auto-expire sessions whose time has elapsed but DB status hasn't been updated yet
        const now = new Date();
        let effectiveStatus = session.status;
        if (
            effectiveStatus === 'PENDING_SUBMISSION' &&
            session.expires_at &&
            session.expires_at <= now
        ) {
            effectiveStatus = 'EXPIRED';
            // Best-effort update — fire and forget, don't block the response
            db.intakeSession
                .update({ where: { session_id: sessionId }, data: { status: 'EXPIRED' } })
                .catch(() => { });
        }

        const submission = session.submissions;

        return NextResponse.json({
            sessionId: session.session_id,
            status: effectiveStatus,
            expiresAt: session.expires_at?.toISOString() ?? null,
            ...(submission && {
                patientName: `${submission.first_name} ${submission.last_name}`.trim(),
                submittedAt: submission.submitted_at?.toISOString() ?? null,
            }),
        });
    } catch (error) {
        console.error('[IntakeSessionStatus]', error);
        return NextResponse.json(
            { error: 'Failed to fetch session status' },
            { status: 500 },
        );
    }
}
