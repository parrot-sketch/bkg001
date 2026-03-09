/**
 * API Route: GET /api/files/consent-templates/[userId]/[filename]
 *
 * Serves PDF files from local storage.
 * This endpoint provides secure access to uploaded consent template PDFs.
 *
 * Auth:
 * - Prefers the Authorization: Bearer <token> header (API clients)
 * - Falls back to the `accessToken` httpOnly cookie (browser fetch / PdfViewer)
 *   because browsers cannot set Authorization headers on same-origin fetches
 *   that include cookies through the default cookie mechanism.
 * - Validates file paths to prevent directory traversal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFileUrl, downloadResource } from '@/lib/cloudinary';
import * as jwt from 'jsonwebtoken';

/** Verify a raw JWT token string against the server secret. */
function verifyToken(token: string): boolean {
    try {
        const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
        jwt.verify(token, secret);
        return true;
    } catch {
        return false;
    }
}

/** Extract a verified token from the request (header first, then cookie). */
function extractAndVerifyToken(request: NextRequest): boolean {
    // 1. Authorization: Bearer <token>  (preferred for API clients)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        return verifyToken(token);
    }

    // 2. httpOnly cookie  (browser PdfViewer — credentials: 'include')
    const cookieToken = request.cookies.get('accessToken')?.value;
    if (cookieToken) {
        return verifyToken(cookieToken);
    }

    return false;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string; filename: string }> }
): Promise<NextResponse> {
    try {
        // 1. Auth check (header or cookie)
        if (!extractAndVerifyToken(request)) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { userId, filename } = await params;

        // Validate filename to prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return NextResponse.json(
                { success: false, error: 'Invalid filename' },
                { status: 400 }
            );
        }

        // Validate userId to prevent directory traversal
        if (userId.includes('..') || userId.includes('/') || userId.includes('\\')) {
            return NextResponse.json(
                { success: false, error: 'Invalid user ID' },
                { status: 400 }
            );
        }

        // Verify it's a PDF file
        if (!filename.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json(
                { success: false, error: 'Invalid file type' },
                { status: 400 }
            );
        }

        // Construct Cloudinary Public ID
        const cloudinaryPublicId = `consent-templates/${userId}/${filename}`;
        
        // Generate Cloudinary URL (raw resource, unsigned by default)
        const cloudinaryUrl = getFileUrl(cloudinaryPublicId, {
            resource_type: 'raw',
        });

        // Fetch from Cloudinary using authentication
        const response = await downloadResource(cloudinaryPublicId, 'raw');
        
        if (!response.ok) {
            console.error(`[API] Cloudinary fetch failed for template: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                { success: false, error: 'Template file not found on storage' },
                { status: 404 }
            );
        }

        const fileBuffer = Buffer.from(await response.arrayBuffer());

        // Return PDF with appropriate headers
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Length': fileBuffer.length.toString(),
                'Cache-Control': 'private, max-age=3600',
                'Content-Disposition': `inline; filename="${filename}"`,
            },
        });
    } catch (error: unknown) {
        console.error('[API] GET /api/files/consent-templates/[userId]/[filename] - Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { success: false, error: `Failed to serve file: ${errorMessage}` },
            { status: 500 }
        );
    }
}

