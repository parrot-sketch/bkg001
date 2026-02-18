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
import { DomainException } from '@/domain/exceptions/DomainException';
import { CaseTransitionSchema } from '@/application/validation/theaterTechSchemas';
import { getTheaterTechService } from '@/lib/factories/theaterTechFactory';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const ALLOWED_ROLES = new Set([Role.THEATER_TECHNICIAN, Role.ADMIN]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    // 3. Validate request body
    const body = await request.json();
    const validation = CaseTransitionSchema.safeParse(body);
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

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/theater-tech/cases/[id]/transition - Error:', error);

    if (error instanceof DomainException) {
      const metadata = error.metadata as Record<string, unknown> | undefined;
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          missingItems: (metadata?.missingItems as string[]) ?? [],
          blockingCategory: (metadata?.gate as string) ?? 'UNKNOWN',
          message: error.message,
        },
        { status: 422 }
      );
    }

    // State machine validation errors from SurgicalCaseService
    if (error instanceof Error && error.message.includes('Cannot transition')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          missingItems: [],
          blockingCategory: 'STATE_MACHINE',
          message: error.message,
        },
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
