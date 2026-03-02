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
import { ConsentTemplateService } from '@/application/services/ConsentTemplateService';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';

// ─── Validation Schemas ────────────────────────────────────────────────────

const createTemplateSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    type: z.nativeEnum(ConsentType),
    content: z.string().optional(),
    pdf_url: z.string().min(1).optional().nullable(),
    template_format: z.nativeEnum(TemplateFormat).optional(),
    extracted_content: z.string().optional().nullable(),
    description: z.string().max(500, 'Description too long').optional(),
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
        const status = searchParams.get('status') as string | null;
        const search = searchParams.get('search') as string | null;

        const where: any = {
            created_by: authResult.user.userId,
        };

        if (!includeInactive) {
            where.is_active = true;
        }

        if (type && Object.values(ConsentType).includes(type)) {
            where.type = type;
        }

        if (status && ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'ARCHIVED'].includes(status)) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }

        const templates = await db.consentTemplate.findMany({
            where,
            orderBy: [
                { status: 'asc' }, // DRAFT, ACTIVE, ARCHIVED
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
                status: true,
                description: true,
                usage_count: true,
                last_used_at: true,
                created_at: true,
                updated_at: true,
            },
        });

        return handleApiSuccess(templates);
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

        const { title, type, content, pdf_url, template_format, extracted_content, description } = validation.data;

        // Determine template format if not provided
        let format: TemplateFormat = TemplateFormat.HTML;
        if (template_format) {
            format = template_format;
        } else if (pdf_url && content?.trim()) {
            format = TemplateFormat.HYBRID;
        } else if (pdf_url) {
            format = TemplateFormat.PDF;
        }

        // Use ConsentTemplateService for document control
        const service = new ConsentTemplateService(db);
        const template = await service.createTemplate(
            {
                title,
                type,
                content,
                pdf_url: pdf_url || null,
                template_format: format,
                extracted_content: extracted_content || null,
                description: description || undefined,
            },
            {
                actorUserId: authResult.user.userId,
                actorRole: authResult.user.role as any,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
            }
        );

        return handleApiSuccess({
            id: template.id,
            title: template.title,
            type: template.type,
            version: template.version,
            is_active: template.is_active,
            status: template.status,
            description: template.description,
            usage_count: template.usage_count,
            created_at: template.created_at,
            updated_at: template.updated_at,
        }, 201);
    } catch (error) {
        console.error('[API] POST /api/doctor/consents/templates - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
