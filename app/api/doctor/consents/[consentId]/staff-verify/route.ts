import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { ConsentSigningService } from '@/application/services/ConsentSigningService';
import { handleApiSuccess, handleApiError } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { z } from 'zod';

const consentSigningService = new ConsentSigningService(db);

const ALLOWED_ROLES = new Set([Role.DOCTOR, Role.NURSE, Role.ADMIN]);

/**
 * POST /api/doctor/consents/[consentId]/staff-verify
 * 
 * Protected endpoint for staff to verify patient identity (for surgical consents).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ consentId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    if (!ALLOWED_ROLES.has(authResult.user.role as Role)) {
      return handleApiError(new ForbiddenError('Access denied: Staff role required'));
    }

    const { consentId } = await params;
    const body = await request.json();

    const schema = z.object({
      qrCode: z.string().min(1, 'QR code is required'),
      note: z.string().optional(),
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
      return handleApiError(validation.error);
    }

    const { qrCode, note } = validation.data;

    await consentSigningService.staffVerifyIdentity(qrCode, authResult.user.userId, note);

    return handleApiSuccess({ message: 'Patient identity verified by staff' });
  } catch (error) {
    return handleApiError(error);
  }
}
