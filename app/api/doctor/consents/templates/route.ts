/**
 * API Route: GET /api/doctor/consents/templates
 * POST /api/doctor/consents/templates
 *
 * Template Management for Doctors
 *
 * Security:
 * - Requires authentication
 * - Only DOCTOR role
 * - Doctors can only manage their own templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { ConsentType, TemplateFormat } from '@prisma/client';
import { z } from 'zod';

// ─── Validation Schemas ────────────────────────────────────────────────────

const createTemplateSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    type: z.nativeEnum(ConsentType),
    content: z.string().optional(),
    pdf_url: z.string().url().optional().nullable(),
    template_format: z.nativeEnum(TemplateFormat).optional(),
    extracted_content: z.string().optional().nullable(),
}).refine(
    (data) => {
        // Must have either content (HTML) or pdf_url (PDF)
        return !!(data.content?.trim() || data.pdf_url);
    },
    { message: 'Either content (HTML) or pdf_url (PDF) is required' }
);

const updateTemplateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    is_active: z.boolean().optional(),
});

// ─── GET: List all templates for the doctor ────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (authResult.user.role !== 'DOCTOR') {
            return NextResponse.json({ success: false, error: 'Forbidden: Doctors only' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get('includeInactive') === 'true';
        const type = searchParams.get('type') as ConsentType | null;

        const where: any = {
            created_by: authResult.user.userId,
        };

        if (!includeInactive) {
            where.is_active = true;
        }

        if (type && Object.values(ConsentType).includes(type)) {
            where.type = type;
        }

        const templates = await db.consentTemplate.findMany({
            where,
            orderBy: [
                { is_active: 'desc' },
                { updated_at: 'desc' },
            ],
            select: {
                id: true,
                title: true,
                type: true,
                pdf_url: true,
                template_format: true,
                version: true,
                is_active: true,
                created_at: true,
                updated_at: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: templates,
        });
    } catch (error) {
        console.error('[API] GET /api/doctor/consents/templates - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// ─── POST: Create a new template ───────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (authResult.user.role !== 'DOCTOR') {
            return NextResponse.json({ success: false, error: 'Forbidden: Doctors only' }, { status: 403 });
        }

        const body = await request.json();
        const validation = createTemplateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation failed',
                    details: validation.error.errors,
                },
                { status: 400 },
            );
        }

        const { title, type, content, pdf_url, template_format, extracted_content } = validation.data;

        // Determine template format if not provided
        let format: TemplateFormat = TemplateFormat.HTML;
        if (template_format) {
            format = template_format;
        } else if (pdf_url && content?.trim()) {
            format = TemplateFormat.HYBRID;
        } else if (pdf_url) {
            format = TemplateFormat.PDF;
        }

        // Create template
        const template = await db.consentTemplate.create({
            data: {
                title,
                type,
                content: content || '',
                pdf_url: pdf_url || null,
                template_format: format,
                extracted_content: extracted_content || null,
                version: 1,
                is_active: true,
                created_by: authResult.user.userId,
            },
            select: {
                id: true,
                title: true,
                type: true,
                version: true,
                is_active: true,
                created_at: true,
                updated_at: true,
            },
        });

        // Audit
        await db.auditLog.create({
            data: {
                user_id: authResult.user.userId,
                record_id: template.id,
                action: 'CREATE',
                model: 'ConsentTemplate',
                details: `Consent template "${title}" created`,
            },
        });

        return NextResponse.json({
            success: true,
            data: template,
            message: 'Template created successfully',
        });
    } catch (error) {
        console.error('[API] POST /api/doctor/consents/templates - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
