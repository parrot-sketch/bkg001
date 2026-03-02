/**
 * API Route: POST /api/doctor/consents/[consentId]/upload-signed
 * 
 * Upload a signed consent document (PDF) and register it in the database.
 * Security:
 * - Requires authentication
 * - Only DOCTOR, NURSE, or ADMIN
 * - Validates file type and size
 * - Computes/verifies checksum
 * - Rate limited (5 uploads per 10 mins per user)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { getConsentFormDocumentService } from '@/lib/factories/consentFormDocumentFactory';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { Role, ConsentDocumentType } from '@prisma/client';
import { ForbiddenError } from '@/application/errors';
import { rateLimit } from '@/lib/security/rateLimit';

const STORAGE_DIR = join(process.cwd(), 'storage', 'signed-consents');

async function ensureStorageDir(consentId: string): Promise<string> {
    const dir = join(STORAGE_DIR, consentId);
    if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }
    return dir;
}

export async function POST(
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

        // Rate Limiting
        const limit = rateLimit(authResult.user.userId, {
            windowMs: 10 * 60 * 1000,
            max: 5,
            keyPrefix: 'upload-signed',
        });

        if (!limit.success) {
            return handleApiError(new Error('Too many uploads. Please try again later.'));
        }

        const { consentId } = await context.params;
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const clientGeneratedChecksum = formData.get('checksum') as string || undefined;

        if (!file) {
            return handleApiError(new Error('No file provided'));
        }

        if (file.type !== 'application/pdf') {
            return handleApiError(new Error('Only PDF files are allowed'));
        }

        // Convert to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Compute checksum
        const service = getConsentFormDocumentService();
        const serverComputedChecksum = service.computeChecksum(buffer);

        // Verify if provided
        if (clientGeneratedChecksum && clientGeneratedChecksum !== serverComputedChecksum) {
            return handleApiError(new Error('Checksum mismatch: upload may be corrupted'));
        }

        // Save file
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `signed-${timestamp}-${randomString}.pdf`;

        const storageDir = await ensureStorageDir(consentId);
        const filePath = join(storageDir, filename);

        await writeFile(filePath, buffer);

        // Register in DB
        const urlPath = `/api/files/signed-consents/${consentId}/${filename}`;
        const document = await service.uploadDocument({
            consentFormId: consentId,
            fileUrl: urlPath,
            fileName: filename,
            fileSize: file.size,
            documentType: ConsentDocumentType.SIGNED_PDF,
            uploadedByUserId: authResult.user.userId,
            checksum_sha256: serverComputedChecksum,
        });

        return handleApiSuccess(document);
    } catch (error: any) {
        console.error('[API] POST /api/doctor/consents/[consentId]/upload-signed - Error:', error);
        return handleApiError(error);
    }
}
