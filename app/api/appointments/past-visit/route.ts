/**
 * API Route: POST /api/appointments/past-visit
 *
 * Frontdesk/Admin late entry for visits that already happened but were never recorded.
 * Creates a COMPLETED appointment within the last 7 days. No queue, no billing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { handleApiSuccess, handleApiError } from '@/app/api/_utils/handleApiError';
import { ValidationError } from '@/application/errors/ValidationError';
import { ForbiddenError } from '@/application/errors/ForbiddenError';
import { Role } from '@/domain/enums/Role';
import { recordPastVisitRequestSchema } from '@/application/dtos/RecordPastVisitRequest';
import { getRecordPastVisitUseCase } from '@/lib/use-cases';
import { revalidateFrontdeskDashboard } from '@/actions/frontdesk/get-dashboard-data';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    const userId = authResult.user.userId;
    const userRole = authResult.user.role as Role;

    if (userRole !== Role.FRONTDESK && userRole !== Role.ADMIN) {
      return handleApiError(new ForbiddenError('Only front desk or admin can record past visits'));
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return handleApiError(new ValidationError('Invalid JSON in request body'));
    }

    const validation = recordPastVisitRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      return handleApiError(ValidationError.fromZodError(validation.error));
    }

    const useCase = getRecordPastVisitUseCase();
    const result = await useCase.execute(validation.data, userId, userRole);

    try {
      await revalidateFrontdeskDashboard();
    } catch {
      /* non-critical */
    }

    return handleApiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
