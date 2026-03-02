/**
 * API Route: POST /api/doctor/consents/templates/[templateId]/activate
 *
 * Activate a template (DRAFT → ACTIVE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { ConsentTemplateService } from '@/application/services/ConsentTemplateService';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ templateId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return handleApiError(new ForbiddenError('Authentication required'));
        }
        if (authResult.user.role !== 'DOCTOR') {
            return handleApiError(new ForbiddenError('Forbidden: Doctors only'));
        }

        const { templateId } = await context.params;
        const service = new ConsentTemplateService(db);

        const updated = await service.activateTemplate(templateId, {
            actorUserId: authResult.user.userId,
            actorRole: authResult.user.role as any,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
        });

        return handleApiSuccess(updated);
    } catch (error: any) {
        console.error('[API] POST /api/doctor/consents/templates/[templateId]/activate - Error:', error);
        return handleApiError(error);
    }
}
