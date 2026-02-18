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
import { DomainException } from '@/domain/exceptions/DomainException';
import { TimelinePatchSchema } from '@/domain/helpers/operativeTimeline';
import { getTheaterTechService } from '@/lib/factories/theaterTechFactory';
import { endpointTimer } from '@/lib/observability/endpointLogger';

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
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!READ_ROLES.has(authResult.user.role as Role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const { caseId } = await params;
    const theaterTechService = getTheaterTechService();
    const timer = endpointTimer('GET /api/theater-tech/timeline');
    const result = await theaterTechService.getTimeline(caseId);
    timer.end({ caseId });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    console.error('[API] GET /api/theater-tech/surgical-cases/[caseId]/timeline - Error:', error);

    if (error instanceof DomainException) {
      return NextResponse.json(
        { success: false, error: error.message, metadata: error.metadata },
        { status: 422 }
      );
    }

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

// ── PATCH — update timeline timestamps ────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!WRITE_ROLES.has(authResult.user.role as Role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Theater Technician, Nurse, or Admin role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = TimelinePatchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { caseId } = await params;
    const theaterTechService = getTheaterTechService();
    const result = await theaterTechService.updateTimeline(
      caseId,
      validation.data,
      authResult.user.userId,
      authResult.user.role
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    console.error('[API] PATCH /api/theater-tech/surgical-cases/[caseId]/timeline - Error:', error);

    if (error instanceof DomainException) {
      return NextResponse.json(
        { success: false, error: error.message, metadata: error.metadata },
        { status: 422 }
      );
    }

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
