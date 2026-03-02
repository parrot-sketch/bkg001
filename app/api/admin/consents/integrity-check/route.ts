/**
 * API Route: GET /api/admin/consents/integrity-check
 * 
 * Global integrity check for all consent documents.
 * Admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { getConsentFormDocumentService } from '@/lib/factories/consentFormDocumentFactory';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { Role } from '@prisma/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return handleApiError(new Error('Authentication required'));
        }

        if (authResult.user.role !== Role.ADMIN) {
            return handleApiError(new ForbiddenError('Administrators only'));
        }

        const service = getConsentFormDocumentService();
        const results = await service.verifyAllDocuments();

        return handleApiSuccess({
            timestamp: new Date().toISOString(),
            totalChecked: results.length,
            results,
        });
    } catch (error: any) {
        console.error('[API] GET /api/admin/consents/integrity-check - Error:', error);
        return handleApiError(error);
    }
}
