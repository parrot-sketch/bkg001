import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { getConsentFormDocumentService } from '@/lib/factories/consentFormDocumentFactory';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { uploadStream } from '@/lib/cloudinary';
import { Role, ConsentDocumentType } from '@prisma/client';
import { ForbiddenError } from '@/application/errors';
import { rateLimit } from '@/lib/security/rateLimit';
import { db } from '@/lib/db';
import crypto from 'crypto';

export const maxDuration = 60;

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

        const { consentId } = await context.params;

        // Verify the consent form exists and get caseId for folder mapping
        const consentForm = await db.consentForm.findUnique({
            where: { id: consentId },
            include: { 
                case_plan: {
                    include: { 
                        surgical_case: true 
                    }
                }
            },
        });

        if (!consentForm) {
            return handleApiError(new Error('Consent form not found'));
        }

        const caseId = consentForm.case_plan?.surgical_case?.id || 'unknown';

        // Rate Limiting
        const limit = rateLimit(authResult.user.userId, {
            windowMs: 10 * 60 * 1000,
            max: 5,
            keyPrefix: 'upload-signed',
        });

        if (!limit.success) {
            return handleApiError(new Error('Too many uploads. Please try again later.'));
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const clientGeneratedChecksum = formData.get('checksum') as string || undefined;

        if (!file) {
            return handleApiError(new Error('No file provided'));
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/tiff', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            return handleApiError(new Error('Invalid file type. Must be PDF or Image.'));
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

        // Upload to Cloudinary
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${crypto.randomUUID()}-${safeName}`;

        await uploadStream(buffer, {
            folder: `consents/${caseId}`,
            public_id: filename,
            resource_type: file.type === 'application/pdf' ? 'raw' : 'image',
        });

        // Register in DB
        const urlPath = `/api/files/consents/${caseId}/${filename}`;
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
