/**
 * API Route: GET /api/theater-tech/today
 *
 * Day-of-Operations Board endpoint.
 *
 * Returns surgical cases scheduled for today, grouped by theater,
 * with patient summary, readiness %, checklist status, and booking times.
 *
 * Security:
 * - Requires authentication
 * - Only THEATER_TECHNICIAN and ADMIN roles can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { getTheaterTechService } from '@/lib/factories/theaterTechFactory';

const ALLOWED_ROLES = new Set([Role.THEATER_TECHNICIAN, Role.ADMIN]);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Authorize
    if (!ALLOWED_ROLES.has(authResult.user.role as Role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Theater Technician or Admin role required' },
        { status: 403 }
      );
    }

    // 3. Parse optional date parameter (defaults to today)
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const date = dateParam ? new Date(dateParam) : new Date();

    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date parameter' },
        { status: 400 }
      );
    }

    // 4. Fetch board data
    const theaterTechService = getTheaterTechService();
    const board = await theaterTechService.getTodayBoard(date);

    return NextResponse.json(
      { success: true, data: board },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/theater-tech/today - Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'development'
          ? `Internal server error: ${message}`
          : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
