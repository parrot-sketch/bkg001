/**
 * API Route: GET /api/doctor/consents/[consentId]/documents
 * 
 * List all documents (signed or snapshots) for a specific consent form.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { getConsentFormDocumentService } from '@/lib/factories/consentFormDocumentFactory';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { Role } from '@prisma/client';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ consentId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return handleApiError(new Error('Authentication required'));
        }

        const allowedRoles: Role[] = [Role.DOCTOR, Role.NURSE, Role.ADMIN];
        if (!allowedRoles.includes(authResult.user.role as Role)) {
            return handleApiError(new ForbiddenError('Insufficient permissions'));
        }

        const { consentId } = await context.params;
        const service = getConsentFormDocumentService();
        const documents = await service.listDocuments(consentId);

        return handleApiSuccess(documents);
    } catch (error: any) {
        console.error('[API] GET /api/doctor/consents/[consentId]/documents - Error:', error);
        return handleApiError(error);
    }
}
