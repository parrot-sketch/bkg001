/**
 * POST /api/images/medical/upload
 *
 * Secure medical image upload endpoint.
 *
 * Unlike /api/upload (used for public doctor profile images), this route:
 *  - Requires authentication (DOCTOR role)
 *  - Uploads to the private 'medical/' folder in Cloudinary with type: "authenticated"
 *  - Returns the public_id (NOT the raw URL) — URLs are generated on-demand via signed-url route
 *  - Enforces 15 MB limit for high-resolution clinical photography
 *
 * Security model:
 *  - Images are stored with Cloudinary "authenticated" delivery type
 *  - Only the server (with api_secret) can generate valid access URLs
 *  - Signed URLs expire after 15 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/tiff'];
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB for high-res clinical photos

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate — only doctors (and admin) may upload clinical images
        const auth = await JwtMiddleware.authenticate(request);
        if (!auth.success || !auth.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (auth.user.role !== Role.DOCTOR && auth.user.role !== Role.ADMIN) {
            return NextResponse.json({ success: false, error: 'Only doctors can upload medical images' }, { status: 403 });
        }

        // 2. Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        // 3. Validate
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Invalid file type. Accepted: JPEG, PNG, WebP, TIFF' },
                { status: 400 }
            );
        }
        if (file.size > MAX_SIZE_BYTES) {
            return NextResponse.json({ success: false, error: 'File exceeds 15 MB limit' }, { status: 400 });
        }

        // 4. Convert to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 5. Upload to Cloudinary under 'medical/' with authenticated delivery type
        //    This means the image is NOT publicly accessible via its URL.
        //    Access requires a signed URL generated server-side.
        const result = await new Promise<any>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: 'medical',
                    type: 'authenticated',         // ← private, requires signed URL to view
                    resource_type: 'image',
                    // Preserve quality for clinical use — avoid lossy transformations at upload time
                    quality: 'auto:best',
                    fetch_format: 'auto',
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(buffer);
        });

        // 6. Return public_id only — never the raw URL
        return NextResponse.json({
            success: true,
            data: {
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes,
            },
        });

    } catch (error: any) {
        console.error('[Medical Upload] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}
