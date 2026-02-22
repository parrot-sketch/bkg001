/**
 * API Route: GET /api/theater-tech/dayboard
 *
 * Optimized Day-of-Operations Board endpoint.
 *
 * Returns surgical cases booked for a given date, grouped by theater,
 * with lean patient/case/booking data and readiness blocker summaries.
 *
 * Query params:
 *   date      - ISO date string (YYYY-MM-DD), defaults to today
 *   theaterId - Optional: filter by specific theater
 *
 * Security:
 * - Requires authentication
 * - THEATER_TECHNICIAN, NURSE, DOCTOR, and ADMIN roles can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { getTheaterTechService } from '@/lib/factories/theaterTechFactory';
import { endpointTimer } from '@/lib/observability/endpointLogger';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError, ValidationError } from '@/application/errors';

const ALLOWED_ROLES = new Set([
  Role.THEATER_TECHNICIAN,
  Role.ADMIN,
  Role.DOCTOR,
  Role.NURSE,
]);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    // 2. Authorize
    if (!ALLOWED_ROLES.has(authResult.user.role as Role)) {
      return handleApiError(new ForbiddenError('Access denied: insufficient role'));
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const theaterId = searchParams.get('theaterId') || undefined;

    const date = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(date.getTime())) {
      return handleApiError(
        new ValidationError('Invalid date parameter. Use YYYY-MM-DD format.', [
          { field: 'date', message: 'Invalid date format. Use YYYY-MM-DD.' },
        ])
      );
    }

    // 4. Fetch dayboard data
    const timer = endpointTimer('GET /api/theater-tech/dayboard');
    const theaterTechService = getTheaterTechService();
    const dayboard = await theaterTechService.getDayboard(date, theaterId);
    const totalCases = dayboard.theaters.reduce((s, t) => s + t.cases.length, 0);
    timer.end({ cases: totalCases, theaters: dayboard.theaters.length });

    const response = handleApiSuccess(dayboard);
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
