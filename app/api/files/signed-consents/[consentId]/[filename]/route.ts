/**
 * API Route: GET /api/files/signed-consents/[consentId]/[filename]
 * 
 * Serves signed consent PDFs from local storage.
 * Security:
 * - Requires authentication
 * - Validates file paths to prevent directory traversal
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { JwtMiddleware } from '@/lib/auth/middleware';

const STORAGE_DIR = join(process.cwd(), 'storage', 'signed-consents');

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ consentId: string; filename: string }> }
): Promise<NextResponse> {
    try {
        // 1. Auth required
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const { consentId, filename } = await params;

        // Validate to prevent traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return NextResponse.json({ success: false, error: 'Invalid filename' }, { status: 400 });
        }
        if (consentId.includes('..') || consentId.includes('/') || consentId.includes('\\')) {
            return NextResponse.json({ success: false, error: 'Invalid consent ID' }, { status: 400 });
        }

        const filePath = join(STORAGE_DIR, consentId, filename);

        if (!existsSync(filePath)) {
            return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
        }

        if (!filename.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json({ success: false, error: 'Invalid file type' }, { status: 400 });
        }

        const fileBuffer = await readFile(filePath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Length': fileBuffer.length.toString(),
                'Cache-Control': 'private, max-age=3600',
                'Content-Disposition': `inline; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error('[API] GET /api/files/signed-consents/[consentId]/[filename] - Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to serve file' }, { status: 500 });
    }
}
