import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { JwtMiddleware } from '@/lib/auth/middleware';

const STORAGE_DIR = join(process.cwd(), 'storage', 'consents');

const MIME_TYPES: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.tiff': 'image/tiff',
};

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ caseId: string; filename: string }> }
): Promise<NextResponse> {
    try {
        // 1. Auth required
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const { caseId, filename } = await context.params;

        // Prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return NextResponse.json({ success: false, error: 'Invalid filename' }, { status: 400 });
        }
        if (caseId.includes('..') || caseId.includes('/') || caseId.includes('\\')) {
            return NextResponse.json({ success: false, error: 'Invalid case ID' }, { status: 400 });
        }

        const filePath = join(STORAGE_DIR, caseId, filename);

        if (!existsSync(filePath)) {
            return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
        }

        const ext = Object.keys(MIME_TYPES).find((ext) => filename.toLowerCase().endsWith(ext));
        if (!ext) {
            return NextResponse.json({ success: false, error: 'Invalid file type' }, { status: 400 });
        }

        const fileBuffer = await readFile(filePath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': MIME_TYPES[ext],
                'Content-Length': fileBuffer.length.toString(),
                'Cache-Control': 'private, max-age=3600',
                'Content-Disposition': `inline; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error('[API] GET /api/files/consents/[caseId]/[filename] - Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to serve file' }, { status: 500 });
    }
}
