/**
 * API Route: POST /api/doctor/consents/templates/upload-pdf
 *
 * Upload a PDF consent template file to Cloudinary.
 * This is a dedicated endpoint for PDF uploads with consent-specific validation.
 *
 * Security:
 * - Requires authentication
 * - Only DOCTOR role
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        // 1. Auth
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        const user = authResult.user;
        if (user.role !== 'DOCTOR') {
            return NextResponse.json({ success: false, error: 'Forbidden: Doctors only' }, { status: 403 });
        }

        // 2. Get file from form data
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        // 3. Validate PDF
        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { success: false, error: 'Invalid file type. Only PDF files are allowed.' },
                { status: 400 },
            );
        }

        // 4. Validate file size (max 10MB for PDFs)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, error: 'File size exceeds 10MB limit' },
                { status: 400 },
            );
        }

        // 5. Convert to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 6. Upload to Cloudinary
        const result = await new Promise<any>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: `consent-templates/${user.userId}`,
                    resource_type: 'raw',
                    format: 'pdf',
                    // Store original filename in metadata
                    context: {
                        uploaded_by: user.userId,
                        uploaded_at: new Date().toISOString(),
                    },
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                },
            ).end(buffer);
        });

        return NextResponse.json({
            success: true,
            data: {
                url: result.secure_url,
                publicId: result.public_id,
                format: 'pdf',
                size: file.size,
            },
            message: 'PDF uploaded successfully',
        });
    } catch (error: any) {
        console.error('[API] POST /api/doctor/consents/templates/upload-pdf - Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Upload failed' },
            { status: 500 },
        );
    }
}
