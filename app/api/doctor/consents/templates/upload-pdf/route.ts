/**
 * API Route: POST /api/doctor/consents/templates/upload-pdf
 *
 * Upload a PDF consent template file to local storage.
 * Files are stored in the `storage/consent-templates/` directory.
 *
 * Security:
 * - Requires authentication
 * - Only DOCTOR role
 * - Validates file type and size
 * - Organizes files by user ID
 * - Rate limited (5 uploads per 10 mins per user)
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { rateLimit } from '@/lib/security/rateLimit';

// Storage directory for consent templates
const STORAGE_DIR = join(process.cwd(), 'storage', 'consent-templates');

// Ensure storage directory exists
async function ensureStorageDir(userId: string): Promise<string> {
    const userDir = join(STORAGE_DIR, userId);
    if (!existsSync(userDir)) {
        await mkdir(userDir, { recursive: true });
    }
    return userDir;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return handleApiError(new Error('Authentication required'));
        }
        const user = authResult.user;
        if (user.role !== 'DOCTOR') {
            return handleApiError(new Error('Forbidden: Doctors only'));
        }

        // 1.5 Rate Limiting
        const limit = rateLimit(user.userId, {
            windowMs: 10 * 60 * 1000, // 10 minutes
            max: 5,                   // 5 uploads per window
            keyPrefix: 'upload-template',
        });

        if (!limit.success) {
            return handleApiError(new Error('Too many uploads. Please try again later.'));
        }

        // 2. Get file from form data
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return handleApiError(new Error('No file provided'));
        }

        // 3. Validate PDF
        if (file.type !== 'application/pdf') {
            return handleApiError(new Error('Invalid file type. Only PDF files are allowed.'));
        }

        // 4. Validate file size (max 10MB for PDFs)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return handleApiError(new Error('File size exceeds 10MB limit'));
        }

        // 5. Convert to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 6. Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `${timestamp}-${randomString}.pdf`;

        // 7. Ensure storage directory exists
        const userDir = await ensureStorageDir(user.userId);
        const filePath = join(userDir, filename);

        // 8. Save file to local storage
        await writeFile(filePath, buffer);

        // 9. Generate URL path (relative to storage, will be served via API route)
        const urlPath = `/api/files/consent-templates/${user.userId}/${filename}`;

        return handleApiSuccess({
            url: urlPath,
            filename: filename,
            size: file.size,
            uploadedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('[API] POST /api/doctor/consents/templates/upload-pdf - Error:', error);
        return handleApiError(error);
    }
}
