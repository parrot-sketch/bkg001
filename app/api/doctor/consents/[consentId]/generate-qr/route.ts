import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ConsentSigningService } from '@/application/services/ConsentSigningService';
import { handleApiSuccess, handleApiError } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { z } from 'zod';

const consentSigningService = new ConsentSigningService(db);

const ALLOWED_ROLES = new Set([Role.DOCTOR, Role.ADMIN]);

/**
 * POST /api/doctor/consents/[consentId]/generate-qr
 * 
 * Protected endpoint (doctor/admin only) to generate QR code for consent signing.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ consentId: string }> }
): Promise<NextResponse> {
  try {
    // Authenticate
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    // Authorize
    if (!ALLOWED_ROLES.has(authResult.user.role as Role)) {
      return handleApiError(new ForbiddenError('Access denied: Doctor or Admin role required'));
    }

    const { consentId } = await params;
    const body = await request.json().catch(() => ({}));

    // Validate optional body
    const schema = z.object({
      requiresStaffVerify: z.boolean().optional().default(false),
      expiresInHours: z.number().int().min(1).max(168).optional().default(48), // Max 7 days
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return handleApiError(validation.error);
    }

    const { requiresStaffVerify, expiresInHours } = validation.data;

    const result = await consentSigningService.createSigningSession(
      consentId,
      requiresStaffVerify,
      expiresInHours
    );

    return handleApiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/doctor/consents/[consentId]/signing-status
 * 
 * Get signing session status for a consent form.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ consentId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    if (!ALLOWED_ROLES.has(authResult.user.role as Role)) {
      return handleApiError(new ForbiddenError('Access denied'));
    }

    const { consentId } = await params;

    const session = await db.consentSigningSession.findUnique({
      where: { consent_form_id: consentId },
      include: {
        verified_by_staff: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    if (!session) {
      return handleApiSuccess(null);
    }

    return handleApiSuccess({
      qrCode: session.qr_code,
      status: session.status,
      expiresAt: session.expires_at.toISOString(),
      requiresStaffVerify: session.requires_staff_verify,
      verifiedByStaff: !!session.verified_by_staff_id,
      verifiedByStaffName: session.verified_by_staff
        ? `${session.verified_by_staff.first_name} ${session.verified_by_staff.last_name}`
        : null,
      signedAt: session.signed_at?.toISOString() || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
