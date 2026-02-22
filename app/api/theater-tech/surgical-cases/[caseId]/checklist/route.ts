/**
 * API Route: GET + PUT /api/theater-tech/surgical-cases/:caseId/checklist
 *
 * GET:  Retrieve full WHO checklist status for a surgical case (all 3 phases).
 * PUT:  Save draft checklist items for a specific phase (partial confirmations OK).
 *
 * Body (PUT): { phase: "SIGN_IN" | "TIME_OUT" | "SIGN_OUT", items: [...] }
 *
 * Security:
 * - Requires authentication
 * - THEATER_TECHNICIAN and ADMIN can read + write
 * - NURSE and DOCTOR can read only (MVP)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { checklistDraftSchema } from '@/domain/clinical-forms/WhoSurgicalChecklist';
import { getTheaterTechService } from '@/lib/factories/theaterTechFactory';
import { endpointTimer } from '@/lib/observability/endpointLogger';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';

const READ_ROLES = new Set([
  Role.THEATER_TECHNICIAN,
  Role.ADMIN,
  Role.NURSE,
  Role.DOCTOR,
]);

const WRITE_ROLES = new Set([Role.THEATER_TECHNICIAN, Role.ADMIN]);

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
    const timer = endpointTimer('GET /api/theater-tech/checklist');
    const theaterTechService = getTheaterTechService();
    const checklist = await theaterTechService.getChecklistStatus(caseId);
    timer.end({ caseId });

    return handleApiSuccess(checklist);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
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
        new ForbiddenError('Access denied: Theater Technician or Admin role required')
      );
    }

    const body = await request.json();
    const validation = checklistDraftSchema.safeParse(body);
    if (!validation.success) {
      return handleApiError(validation.error);
    }

    const { caseId } = await params;
    const { phase, items } = validation.data;

    const theaterTechService = getTheaterTechService();
    const result = await theaterTechService.saveChecklistDraft(
      caseId,
      phase,
      items,
      authResult.user.userId,
      authResult.user.role
    );

    return handleApiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
