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
import { uploadStream } from '@/lib/cloudinary';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { rateLimit } from '@/lib/security/rateLimit';

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

        // 7. Upload to Cloudinary instead of local storage
        const uploadResult = await uploadStream(buffer, {
            folder: `consent-templates/${user.userId}`,
            public_id: filename,
            resource_type: 'raw',
            format: 'pdf',
        });

        // 9. Generate URL path (relative to storage, will be served via API route)
        // We keep the same URL structure so the frontend doesn't need to change,
        // but the GET route will now proxy from Cloudinary.
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
