/**
 * API Route: POST /api/theater-tech/surgical-cases/:caseId/checklist/sign-in/finalize
 *
 * Finalize the WHO Sign-In phase of the surgical safety checklist.
 *
 * Validates all required WHO Sign-In items are confirmed,
 * then marks the phase as complete with signature metadata.
 *
 * Body: { items: ChecklistItem[] }
 *
 * Returns 422 with structured missingItems on validation failure.
 * Emits audit event: CHECKLIST_SIGNIN_FINALIZED
 *
 * Security: THEATER_TECHNICIAN and ADMIN only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { checklistItemSchema } from '@/domain/clinical-forms/WhoSurgicalChecklist';
import { getTheaterTechService } from '@/lib/factories/theaterTechFactory';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { z } from 'zod';

const ALLOWED_ROLES = new Set([Role.THEATER_TECHNICIAN, Role.ADMIN]);

const bodySchema = z.object({
  items: z.array(checklistItemSchema).min(1, 'At least one item is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    if (!ALLOWED_ROLES.has(authResult.user.role as Role)) {
      return handleApiError(
        new ForbiddenError('Access denied: Theater Technician or Admin role required')
      );
    }

    const body = await request.json();
    const validation = bodySchema.safeParse(body);
    if (!validation.success) {
      return handleApiError(validation.error);
    }

    const { caseId } = await params;
    const { items } = validation.data;

    const theaterTechService = getTheaterTechService();
    const result = await theaterTechService.finalizeChecklistPhase(
      caseId,
      'SIGN_IN',
      items,
      authResult.user.userId,
      authResult.user.role
    );

    return handleApiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
