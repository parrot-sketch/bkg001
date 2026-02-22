/**
 * API Route: POST /api/theater-tech/cases/:id/transition
 *
 * Advance a surgical case through day-of-operations statuses.
 *
 * Body: { action: "IN_PREP" | "IN_THEATER" | "RECOVERY" | "COMPLETED", reason?: string }
 *
 * Enforces:
 * - State machine validation (SurgicalCaseService)
 * - Checklist gates (Sign-In before IN_THEATER, Sign-Out before RECOVERY)
 * - Audit trail
 *
 * Security:
 * - Requires authentication
 * - Only THEATER_TECHNICIAN and ADMIN roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { CaseTransitionSchema } from '@/application/validation/theaterTechSchemas';
import { getTheaterTechService } from '@/lib/factories/theaterTechFactory';
import { endpointTimer } from '@/lib/observability/endpointLogger';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { fromZodError } from '@/lib/http/apiResponse';

const ALLOWED_ROLES = new Set([Role.THEATER_TECHNICIAN, Role.ADMIN]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    // 2. Authorize
    if (!ALLOWED_ROLES.has(authResult.user.role as Role)) {
      return handleApiError(
        new ForbiddenError('Access denied: Theater Technician or Admin role required')
      );
    }

    // 3. Validate request body
    const body = await request.json();
    const validation = CaseTransitionSchema.safeParse(body);
    if (!validation.success) {
      return handleApiError(validation.error);
    }

    // 4. Process transition
    const { id: caseId } = await params;
    const { action, reason } = validation.data;

    const theaterTechService = getTheaterTechService();
    const timer = endpointTimer('POST /api/theater-tech/cases/[id]/transition');
    const result = await theaterTechService.transitionCase(
      caseId,
      action,
      authResult.user.userId,
      authResult.user.role,
      reason
    );
    timer.end({ caseId, action });

    return handleApiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
