/**
 * API Route: POST /api/doctor/consents/templates/[templateId]/replace-pdf
 * 
 * Replace a template's PDF file and create a new version.
 * Handles both file upload and database update.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { getConsentTemplateService } from '@/lib/factories/consentTemplateFactory';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { Role } from '@prisma/client';
import { rateLimit } from '@/lib/security/rateLimit';

const STORAGE_DIR = join(process.cwd(), 'storage', 'consent-templates');

async function ensureStorageDir(userId: string): Promise<string> {
    const userDir = join(STORAGE_DIR, userId);
    if (!existsSync(userDir)) {
        await mkdir(userDir, { recursive: true });
    }
    return userDir;
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ templateId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return handleApiError(new Error('Authentication required'));
        }

        // Only DOCTOR or ADMIN can replace PDF
        const allowedRoles: Role[] = [Role.DOCTOR, Role.ADMIN];
        if (!allowedRoles.includes(authResult.user.role as Role)) {
            return handleApiError(new ForbiddenError('Insufficient permissions'));
        }

        // Rate Limiting
        const limit = rateLimit(authResult.user.userId, {
            windowMs: 10 * 60 * 1000,
            max: 5,
            keyPrefix: 'replace-pdf',
        });

        if (!limit.success) {
            return handleApiError(new Error('Too many attempts. Please try again later.'));
        }

        const { templateId } = await context.params;
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const versionNotes = formData.get('versionNotes') as string || undefined;

        if (!file) {
            return handleApiError(new Error('No file provided'));
        }

        if (file.type !== 'application/pdf') {
            return handleApiError(new Error('Only PDF files are allowed'));
        }

        // Convert to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Save file
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `${timestamp}-${randomString}.pdf`;

        const userDir = await ensureStorageDir(authResult.user.userId);
        const filePath = join(userDir, filename);

        await writeFile(filePath, buffer);

        // Update database via service
        const service = getConsentTemplateService();
        const urlPath = `/api/files/consent-templates/${authResult.user.userId}/${filename}`;

        const updated = await service.replacePdf(
            templateId,
            {
                filename,
                url: urlPath,
                size: file.size,
                buffer,
            },
            versionNotes || 'PDF replaced',
            {
                actorUserId: authResult.user.userId,
                actorRole: authResult.user.role as any,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
            }
        );

        return handleApiSuccess(updated);
    } catch (error: any) {
        console.error('[API] POST /api/doctor/consents/templates/[templateId]/replace-pdf - Error:', error);
        return handleApiError(error);
    }
}
