/**
 * API Route: GET /api/doctor/consents/templates/[templateId]/pdf
 * 
 * Secure access to a template's PDF.
 * Redirects to the underlying file access route OR streams the file.
 * Only accessible to authorized users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { handleApiError } from '@/app/api/_utils/handleApiError';
import { ForbiddenError, NotFoundError } from '@/application/errors';
import { Role } from '@prisma/client';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ templateId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return handleApiError(new Error('Authentication required'));
        }

        // Only DOCTOR, NURSE, or ADMIN can access
        const allowedRoles: Role[] = [Role.DOCTOR, Role.NURSE, Role.ADMIN];
        if (!allowedRoles.includes(authResult.user.role as Role)) {
            return handleApiError(new ForbiddenError('Insufficient permissions'));
        }

        const { templateId } = await context.params;
        const template = await db.consentTemplate.findUnique({
            where: { id: templateId },
            select: { pdf_url: true, created_by: true },
        });

        if (!template) {
            return handleApiError(new NotFoundError('Consent template not found'));
        }

        if (!template.pdf_url) {
            return handleApiError(new Error('Template PDF not found'));
        }

        // Security: Can be extended to check specific template access if multi-tenant
        // For now, any authenticated user (doctor/admin/nurse) can view active templates.

        // Return a JSON with the URL or redirect? 
        // Plan says GET .../pdf (Secure access). Usually this means it acts as the gateway.

        // We'll redirect to the actual file serving route which itself has auth.
        // This keeps the file serving logic centralized.

        return NextResponse.redirect(new URL(template.pdf_url, request.url));
    } catch (error: any) {
        console.error('[API] GET /api/doctor/consents/templates/[templateId]/pdf - Error:', error);
        return handleApiError(error);
    }
}
