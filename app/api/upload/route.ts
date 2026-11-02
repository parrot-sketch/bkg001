/**
 * API Route: POST /api/upload
 * 
 * General file upload endpoint using Cloudinary.
 * 
 * IMPORTANT: This route is used for:
 * - Doctor profile images (uploaded to 'doctors' folder)
 * - Other image uploads
 * 
 * NOTE: Consent template PDFs now use a separate route:
 * - POST /api/doctor/consents/templates/upload-pdf (uses local storage)
 */

import { uploadStream } from '@/lib/cloudinary';
import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

export async function POST(request: NextRequest) {
    try {
        const auth = await JwtMiddleware.authenticate(request);
        if (!auth.success || !auth.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (auth.user.role !== Role.DOCTOR && auth.user.role !== Role.ADMIN) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type);
        const isPDF = file.type === 'application/pdf';
        
        if (!isImage && !isPDF) {
            return NextResponse.json(
                { success: false, error: 'Invalid file type. Only images (JPEG, PNG, WebP) and PDFs are allowed.' },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB for PDFs, 5MB for images)
        const maxSize = isPDF ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, error: `File size exceeds ${isPDF ? '10MB' : '5MB'} limit` },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary using the utility
        const result = await uploadStream(buffer, {
            folder: isPDF ? 'consent-templates' : 'doctors',
            resource_type: isPDF ? 'raw' : 'image',
            ...(isPDF ? { format: 'pdf' } : {
                transformation: [
                    { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                    { quality: 'auto', fetch_format: 'auto' }
                ]
            })
        });

        return NextResponse.json({
            success: true,
            data: {
                url: result.secure_url,
                publicId: result.publicId,
            },
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}
