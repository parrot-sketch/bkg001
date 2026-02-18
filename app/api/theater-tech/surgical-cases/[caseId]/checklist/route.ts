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
import { DomainException } from '@/domain/exceptions/DomainException';
import { checklistDraftSchema } from '@/domain/clinical-forms/WhoSurgicalChecklist';
import { getTheaterTechService } from '@/lib/factories/theaterTechFactory';
import { endpointTimer } from '@/lib/observability/endpointLogger';

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
    const timer = endpointTimer('GET /api/theater-tech/checklist');
    const theaterTechService = getTheaterTechService();
    const checklist = await theaterTechService.getChecklistByCaseId(caseId);
    timer.end({ caseId });

    return NextResponse.json({ success: true, data: checklist }, { status: 200 });
  } catch (error) {
    console.error('[API] GET /api/theater-tech/surgical-cases/[caseId]/checklist - Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === 'development'
            ? `Internal server error: ${message}`
            : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
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
        { success: false, error: 'Access denied: Theater Technician or Admin role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = checklistDraftSchema.safeParse(body);
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
    const { phase, items } = validation.data;

    const theaterTechService = getTheaterTechService();
    const result = await theaterTechService.saveChecklistDraft(
      caseId,
      phase,
      items,
      authResult.user.userId,
      authResult.user.role
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    console.error('[API] PUT /api/theater-tech/surgical-cases/[caseId]/checklist - Error:', error);

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
        error:
          process.env.NODE_ENV === 'development'
            ? `Internal server error: ${message}`
            : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
