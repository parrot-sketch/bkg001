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
import { DomainException } from '@/domain/exceptions/DomainException';
import { checklistItemSchema } from '@/domain/clinical-forms/WhoSurgicalChecklist';
import { getTheaterTechService } from '@/lib/factories/theaterTechFactory';
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
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!ALLOWED_ROLES.has(authResult.user.role as Role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied: Theater Technician or Admin role required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = bodySchema.safeParse(body);
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
    const { items } = validation.data;

    const theaterTechService = getTheaterTechService();
    const result = await theaterTechService.finalizeChecklistPhase(
      caseId,
      'SIGN_IN',
      items,
      authResult.user.userId,
      authResult.user.role
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    console.error('[API] POST .../checklist/sign-in/finalize - Error:', error);

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
