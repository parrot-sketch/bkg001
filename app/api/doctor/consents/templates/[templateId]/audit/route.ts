/**
 * API Route: GET /api/doctor/consents/templates/[templateId]/audit
 *
 * Get audit log for a template
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { ConsentTemplateService } from '@/application/services/ConsentTemplateService';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError, NotFoundError, ValidationError } from '@/application/errors';

export async function GET(
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
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

        // Verify ownership
        const template = await db.consentTemplate.findUnique({
            where: { id: templateId },
            select: { created_by: true },
        });

        if (!template) {
            return handleApiError(new NotFoundError('Template not found'));
        }

        if (template.created_by !== authResult.user.userId) {
            return handleApiError(new ForbiddenError('Forbidden: Not your template'));
        }

        const service = new ConsentTemplateService(db);
        const auditLog = await service.getAuditLog(templateId, limit);

        return handleApiSuccess(auditLog);
    } catch (error: any) {
        console.error('[API] GET /api/doctor/consents/templates/[templateId]/audit - Error:', error);
        return handleApiError(error);
    }
}
