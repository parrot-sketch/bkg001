/**
 * API Routes: Operative Timeline
 *
 * GET  /api/theater-tech/surgical-cases/[caseId]/timeline — fetch timeline + durations
 * PATCH /api/theater-tech/surgical-cases/[caseId]/timeline — partial timestamp update
 *
 * Security: THEATER_TECHNICIAN, NURSE, ADMIN can read; THEATER_TECHNICIAN and ADMIN can edit.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { TimelinePatchSchema } from '@/domain/helpers/operativeTimeline';
import { getTheaterTechService } from '@/lib/factories/theaterTechFactory';
import { endpointTimer } from '@/lib/observability/endpointLogger';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';

const READ_ROLES = new Set([Role.THEATER_TECHNICIAN, Role.NURSE, Role.ADMIN, Role.DOCTOR]);
const WRITE_ROLES = new Set([Role.THEATER_TECHNICIAN, Role.NURSE, Role.ADMIN]);

// ── GET — fetch timeline ──────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    if (!READ_ROLES.has(authResult.user.role as Role)) {
      return handleApiError(new ForbiddenError('Access denied'));
    }

    const { caseId } = await params;
    const theaterTechService = getTheaterTechService();
    const timer = endpointTimer('GET /api/theater-tech/timeline');
    const result = await theaterTechService.getTimeline(caseId);
    timer.end({ caseId });

    return handleApiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

// ── PATCH — update timeline timestamps ────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    if (!WRITE_ROLES.has(authResult.user.role as Role)) {
      return handleApiError(
        new ForbiddenError('Access denied: Theater Technician, Nurse, or Admin role required')
      );
    }

    const body = await request.json();
    const validation = TimelinePatchSchema.safeParse(body);
    if (!validation.success) {
      return handleApiError(validation.error);
    }

    const { caseId } = await params;
    const theaterTechService = getTheaterTechService();
    const result = await theaterTechService.updateTimeline(
      caseId,
      validation.data,
      authResult.user.userId,
      authResult.user.role
    );

    return handleApiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
