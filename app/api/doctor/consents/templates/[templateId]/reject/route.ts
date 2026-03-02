/**
 * API Route: POST /api/doctor/consents/templates/[templateId]/reject
 * 
 * Reject a template (PENDING_APPROVAL → REJECTED)
 * Admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { getConsentTemplateService } from '@/lib/factories/consentTemplateFactory';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { parseRejectTemplate } from '@/lib/parsers/consentPhase2Parsers';
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

        // Only administrators can reject
        if (authResult.user.role !== Role.ADMIN) {
            return handleApiError(new ForbiddenError('Only administrators can reject templates'));
        }

        const { templateId } = await context.params;
        const body = await request.json().catch(() => ({}));
        const parsed = parseRejectTemplate({ ...body, templateId });

        const service = getConsentTemplateService();

        const updated = await service.rejectTemplate(templateId, {
            actorUserId: authResult.user.userId,
            actorRole: authResult.user.role as any,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
        }, parsed.reason);

        return handleApiSuccess(updated);
    } catch (error: any) {
        console.error('[API] POST /api/doctor/consents/templates/[templateId]/reject - Error:', error);
        return handleApiError(error);
    }
}
