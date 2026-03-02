/**
 * API Route: POST /api/doctor/consents/templates/[templateId]/duplicate
 *
 * Duplicate a template (creates new template with version 1)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { ConsentTemplateService } from '@/application/services/ConsentTemplateService';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError, NotFoundError, ValidationError } from '@/application/errors';
import { z } from 'zod';

const duplicateTemplateSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
});

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
        const body = await request.json();
        const validation = duplicateTemplateSchema.safeParse(body);

        if (!validation.success) {
            return handleApiError(new ValidationError('Validation failed'));
        }

        const service = new ConsentTemplateService(db);
        const duplicate = await service.duplicateTemplate(
            templateId,
            validation.data.title,
            {
                actorUserId: authResult.user.userId,
                actorRole: authResult.user.role as any,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
            }
        );

        return handleApiSuccess(duplicate);
    } catch (error: any) {
        console.error('[API] POST /api/doctor/consents/templates/[templateId]/duplicate - Error:', error);
        return handleApiError(error);
    }
}
