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
import { downloadResource } from '@/lib/cloudinary';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string; filename: string }> }
): Promise<NextResponse> {
    try {
        const auth = await JwtMiddleware.authenticate(request);
        if (!auth.success || !auth.user) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        const allowedRoles = [Role.DOCTOR, Role.NURSE, Role.ADMIN];
        if (!allowedRoles.includes(auth.user.role as Role)) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
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

        const fileUrl = `/api/files/consent-templates/${userId}/${filename}`;
        const template = await db.consentTemplate.findFirst({
            where: { pdf_url: fileUrl },
            select: { created_by: true, is_active: true, status: true },
        });

        const isOwner = userId === auth.user.userId && auth.user.role === Role.DOCTOR;
        const isPublishedTemplate = template?.is_active === true && template.status === 'ACTIVE';
        const mayReadPublishedTemplate =
            isPublishedTemplate && allowedRoles.includes(auth.user.role as Role);

        // A doctor may preview their own upload before attaching it to a template.
        // Other users may read only files referenced by an active template.
        if (!(isOwner || mayReadPublishedTemplate) || (template && template.created_by === null && !isPublishedTemplate)) {
            return NextResponse.json(
                { success: false, error: 'Template file not found' },
                { status: 404 }
            );
        }

        // Construct the Cloudinary public ID only after identity and resource checks.
        const cloudinaryPublicId = `consent-templates/${userId}/${filename}`;

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

