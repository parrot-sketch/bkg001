import { NextRequest, NextResponse } from 'next/server';
import { downloadResource } from '@/lib/cloudinary';
import { JwtMiddleware } from '@/lib/auth/middleware';


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

        const ext = Object.keys(MIME_TYPES).find((ext) => filename.toLowerCase().endsWith(ext));
        if (!ext) {
            return NextResponse.json({ success: false, error: 'Invalid file type' }, { status: 400 });
        }

        // Generate Cloudinary URL (Unsigned by default now)
        const cloudinaryPublicId = `consents/${caseId}/${filename}`;
        // Fetch from Cloudinary using authentication
        const resourceType = filename.toLowerCase().endsWith('.pdf') ? 'raw' : 'image';
        const response = await downloadResource(cloudinaryPublicId, resourceType);
        
        if (!response.ok) {
            console.error(`[API] Cloudinary fetch failed: ${response.status} ${response.statusText}`);
            return NextResponse.json({ success: false, error: 'File not found on storage' }, { status: 404 });
        }

        const fileBuffer = Buffer.from(await response.arrayBuffer());

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
