/**
 * API Route: PATCH /api/theater-tech/cases/:id/procedure-record/timestamps
 *
 * Set intra-operative timestamps on the procedure record.
 *
 * Body: { anesthesiaStart?, incisionTime?, closureTime?, wheelsOut? } (ISO datetimes)
 *
 * Idempotent: if a field is already set, it is NOT overwritten.
 * An audit trail is created for every update and every idempotent skip.
 *
 * Security:
 * - Requires authentication
 * - Only THEATER_TECHNICIAN and ADMIN roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { DomainException } from '@/domain/exceptions/DomainException';
import { ProcedureTimestampSchema } from '@/application/validation/theaterTechSchemas';
import { getTheaterTechService } from '@/lib/factories/theaterTechFactory';

const ALLOWED_ROLES = new Set([Role.THEATER_TECHNICIAN, Role.ADMIN]);

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
    const validation = ProcedureTimestampSchema.safeParse(body);
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

    // 4. Update timestamps
    const { id: caseId } = await params;
    const theaterTechService = getTheaterTechService();
    const result = await theaterTechService.updateProcedureTimestamps(
      caseId,
      validation.data,
      authResult.user.userId,
      authResult.user.role
    );

    return NextResponse.json(
      { success: true, data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/theater-tech/cases/[id]/procedure-record/timestamps - Error:', error);

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
