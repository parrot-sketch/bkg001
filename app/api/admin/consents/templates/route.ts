/**
 * API Route: GET /api/admin/consents/templates
 *
 * Admin endpoint to list consent templates across ALL doctors,
 * optionally filtered by status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { TemplateStatus } from '@prisma/client';

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (authResult.user.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as TemplateStatus | null;

        const where: any = {};
        if (status && Object.values(TemplateStatus).includes(status)) {
            where.status = status;
        }

        const templates = await db.consentTemplate.findMany({
            where,
            orderBy: { updated_at: 'desc' },
            select: {
                id: true,
                title: true,
                type: true,
                pdf_url: true,
                template_format: true,
                version: true,
                is_active: true,
                status: true,
                description: true,
                usage_count: true,
                last_used_at: true,
                created_at: true,
                updated_at: true,
                created_by: true,
            },
        });

        // Enrich with doctor names (batch lookup)
        const creatorIds = [...new Set(templates.map((t) => t.created_by).filter(Boolean))] as string[];
        const creators = creatorIds.length > 0
            ? await db.user.findMany({
                where: { id: { in: creatorIds } },
                select: { id: true, first_name: true, last_name: true },
            })
            : [];
        const creatorMap = Object.fromEntries(creators.map((u) => [u.id, u]));

        const enriched = templates.map((t) => {
            const creator = t.created_by ? creatorMap[t.created_by] : null;
            return {
                ...t,
                doctor_name: creator ? `${creator.first_name} ${creator.last_name}` : undefined,
            };
        });

        return NextResponse.json({ success: true, data: enriched });
    } catch (error) {
        console.error('[API] GET /api/admin/consents/templates - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
