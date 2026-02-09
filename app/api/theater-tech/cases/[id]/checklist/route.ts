/**
 * API Route: GET + PATCH /api/theater-tech/cases/:id/checklist
 *
 * GET:   Retrieve the full checklist status for a surgical case.
 * PATCH: Complete a checklist phase (Sign-In, Time-Out, or Sign-Out).
 *
 * Body (PATCH): { phase: "SIGN_IN" | "TIME_OUT" | "SIGN_OUT", items: [...] }
 *
 * Rules:
 * - All items must have confirmed: true to complete a phase.
 * - Phase completion is idempotent: re-completing is a no-op.
 * - Audit trail for every completion.
 *
 * Security:
 * - Requires authentication
 * - Only THEATER_TECHNICIAN and ADMIN roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { DomainException } from '@/domain/exceptions/DomainException';
import { ChecklistUpdateSchema } from '@/application/validation/theaterTechSchemas';
import { theaterTechService } from '@/lib/factories/theaterTechFactory';

const ALLOWED_ROLES = new Set([Role.THEATER_TECHNICIAN, Role.ADMIN]);

export async function GET(
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

    // 3. Fetch checklist status
    const { id: caseId } = await params;
    const status = await theaterTechService.getChecklistStatus(caseId);

    return NextResponse.json(
      { success: true, data: status },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] GET /api/theater-tech/cases/[id]/checklist - Error:', error);
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

export async function PATCH(
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
    const validation = ChecklistUpdateSchema.safeParse(body);
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

    // 4. Complete checklist phase
    const { id: caseId } = await params;
    const { phase, items } = validation.data;

    const result = await theaterTechService.completeChecklistPhase(
      caseId,
      phase,
      items,
      authResult.user.userId,
      authResult.user.role
    );

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] PATCH /api/theater-tech/cases/[id]/checklist - Error:', error);

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
