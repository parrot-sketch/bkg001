/**
 * GET /api/images/signed-url?publicId=medical/...
 *
 * Generates a short-lived Cloudinary signed URL for a private medical image.
 *
 * Security:
 *  - Requires authentication (any logged-in staff)
 *  - Only generates URLs for images in the 'medical/' folder
 *  - Signed URLs expire after 15 minutes
 *  - The api_secret never leaves the server
 *
 * Usage:
 *   GET /api/images/signed-url?publicId=medical%2Fpatient-abc%2Fpre-op-front
 *   → { success: true, data: { url: "https://res.cloudinary.com/...?signature=..." } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { JwtMiddleware } from '@/lib/auth/middleware';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SIGNED_URL_TTL_SECONDS = 60 * 15; // 15 minutes

export async function GET(request: NextRequest) {
    try {
        // 1. Authenticate — any logged-in staff can fetch signed URLs
        const auth = await JwtMiddleware.authenticate(request);
        if (!auth.success || !auth.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        // 2. Extract publicId from query string
        const { searchParams } = new URL(request.url);
        const publicId = searchParams.get('publicId');

        if (!publicId) {
            return NextResponse.json({ success: false, error: 'publicId is required' }, { status: 400 });
        }

        // 3. Guard: only allow medical/ folder — prevent signed URLs for public assets
        if (!publicId.startsWith('medical/')) {
            return NextResponse.json(
                { success: false, error: 'Only medical images can be accessed via this endpoint' },
                { status: 403 }
            );
        }

        // 4. Generate signed URL (server-side, uses api_secret)
        const expiresAt = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;

        const signedUrl = cloudinary.url(publicId, {
            type: 'authenticated',
            sign_url: true,
            expires_at: expiresAt,
            secure: true,
        });

        return NextResponse.json({
            success: true,
            data: {
                url: signedUrl,
                expiresAt: new Date(expiresAt * 1000).toISOString(),
            },
        });

    } catch (error: any) {
        console.error('[Signed URL] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to generate signed URL' },
            { status: 500 }
        );
    }
}
