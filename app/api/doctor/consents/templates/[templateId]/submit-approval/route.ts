/**
 * API Route: POST /api/doctor/consents/templates/[templateId]/submit-approval
 * 
 * Submit a template for approval (DRAFT/REJECTED → PENDING_APPROVAL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { getConsentTemplateService } from '@/lib/factories/consentTemplateFactory';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError, NotFoundError } from '@/application/errors';
import { parseSubmitForApproval } from '@/lib/parsers/consentPhase2Parsers';
import { Role } from '@prisma/client';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ templateId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return handleApiError(new Error('Authentication required'));
        }

        // Only creators (DOCTOR or ADMIN) can submit
        const allowedRoles: Role[] = [Role.DOCTOR, Role.ADMIN];
        if (!allowedRoles.includes(authResult.user.role as Role)) {
            return handleApiError(new ForbiddenError('Insufficient permissions'));
        }

        const { templateId } = await context.params;
        const body = await request.json().catch(() => ({}));
        const parsed = parseSubmitForApproval({ ...body, templateId });

        const service = getConsentTemplateService();

        const updated = await service.submitForApproval(templateId, {
            actorUserId: authResult.user.userId,
            actorRole: authResult.user.role as any,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
        }, parsed.notes);

        return handleApiSuccess(updated);
    } catch (error: any) {
        console.error('[API] POST /api/doctor/consents/templates/[templateId]/submit-approval - Error:', error);
        return handleApiError(error);
    }
}
