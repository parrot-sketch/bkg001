/**
 * API Route: GET /api/doctor/consents/templates/[templateId]
 * PATCH /api/doctor/consents/templates/[templateId]
 * DELETE /api/doctor/consents/templates/[templateId]
 *
 * Individual Template Operations
 *
 * Security:
 * - Requires authentication
 * - Only DOCTOR role
 * - Doctors can only manage their own templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { TemplateFormat } from '@prisma/client';
import { z } from 'zod';
import { ConsentTemplateService } from '@/application/services/ConsentTemplateService';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError, NotFoundError, ValidationError } from '@/application/errors';

const updateTemplateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().optional(),
    pdf_url: z.string().url().optional().nullable(),
    template_format: z.nativeEnum(TemplateFormat).optional(),
    extracted_content: z.string().optional().nullable(),
    description: z.string().max(500).optional(),
    is_active: z.boolean().optional(),
    version_notes: z.string().max(500).optional(),
});

// ─── GET: Get template by ID ──────────────────────────────────────────────

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ templateId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (authResult.user.role !== 'DOCTOR') {
            return NextResponse.json({ success: false, error: 'Forbidden: Doctors only' }, { status: 403 });
        }

        const { templateId } = await context.params;

        const template = await db.consentTemplate.findUnique({
            where: { id: templateId },
            select: {
                id: true,
                title: true,
                type: true,
                content: true,
                pdf_url: true,
                template_format: true,
                extracted_content: true,
                version: true,
                is_active: true,
                status: true,
                description: true,
                usage_count: true,
                last_used_at: true,
                created_by: true,
                created_at: true,
                updated_at: true,
            },
        });

        if (!template) {
            return handleApiError(new NotFoundError('Template not found'));
        }

        // Verify ownership
        if (template.created_by !== authResult.user.userId) {
            return handleApiError(new ForbiddenError('Forbidden: Not your template'));
        }

        // Log view audit (non-blocking)
        const service = new ConsentTemplateService(db);
        service.logAuditEvent(
            templateId,
            'VIEWED' as any,
            {
                actorUserId: authResult.user.userId,
                actorRole: authResult.user.role as any,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
            },
            null
        ).catch(console.error);

        return handleApiSuccess(template);
    } catch (error) {
        console.error('[API] GET /api/doctor/consents/templates/[templateId] - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// ─── PATCH: Update template (creates new version) ──────────────────────────

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ templateId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (authResult.user.role !== 'DOCTOR') {
            return NextResponse.json({ success: false, error: 'Forbidden: Doctors only' }, { status: 403 });
        }

        const { templateId } = await context.params;
        const body = await request.json();
        const validation = updateTemplateSchema.safeParse(body);

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

        // Use ConsentTemplateService for document control
        const service = new ConsentTemplateService(db);

        // Auto-determine template format if not explicitly set
        let templateFormat = validation.data.template_format;
        if (!templateFormat) {
            const currentTemplate = await db.consentTemplate.findUnique({
                where: { id: templateId },
                select: { pdf_url: true, content: true },
            });
            const hasPdf = validation.data.pdf_url !== undefined ? validation.data.pdf_url : currentTemplate?.pdf_url;
            const hasContent = validation.data.content !== undefined
                ? validation.data.content?.trim()
                : currentTemplate?.content?.trim();

            if (hasPdf && hasContent) {
                templateFormat = TemplateFormat.HYBRID;
            } else if (hasPdf) {
                templateFormat = TemplateFormat.PDF;
            } else if (hasContent) {
                templateFormat = TemplateFormat.HTML;
            }
        }

        const updated = await service.updateTemplate(
            templateId,
            {
                ...validation.data,
                template_format: templateFormat,
            },
            {
                actorUserId: authResult.user.userId,
                actorRole: authResult.user.role as any,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
            }
        );

        return handleApiSuccess({
            id: updated.id,
            title: updated.title,
            type: updated.type,
            content: updated.content,
            pdf_url: updated.pdf_url,
            template_format: updated.template_format,
            extracted_content: updated.extracted_content,
            version: updated.version,
            is_active: updated.is_active,
            status: updated.status,
            description: updated.description,
            usage_count: updated.usage_count,
            created_at: updated.created_at,
            updated_at: updated.updated_at,
        }, 200);
    } catch (error) {
        console.error('[API] PATCH /api/doctor/consents/templates/[templateId] - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// ─── DELETE: Deactivate template (soft delete) ────────────────────────────

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ templateId: string }> },
): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        if (authResult.user.role !== 'DOCTOR') {
            return NextResponse.json({ success: false, error: 'Forbidden: Doctors only' }, { status: 403 });
        }

        const { templateId } = await context.params;

        // Verify ownership
        const existing = await db.consentTemplate.findUnique({
            where: { id: templateId },
            select: { created_by: true, title: true },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
        }

        if (existing.created_by !== authResult.user.userId) {
            return NextResponse.json({ success: false, error: 'Forbidden: Not your template' }, { status: 403 });
        }

        // Use ConsentTemplateService for document control
        const service = new ConsentTemplateService(db);

        // Soft delete: set is_active to false and archive
        const template = await db.consentTemplate.findUnique({
            where: { id: templateId },
        });

        if (!template) {
            return handleApiError(new NotFoundError('Template not found'));
        }

        const updated = await db.consentTemplate.update({
            where: { id: templateId },
            data: {
                is_active: false,
                status: 'ARCHIVED' as any,
            },
            select: {
                id: true,
                title: true,
                is_active: true,
                status: true,
            },
        });

        // Log audit event (non-blocking)
        service.logAuditEvent(
            templateId,
            'DELETED' as any,
            {
                actorUserId: authResult.user.userId,
                actorRole: authResult.user.role as any,
                ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
            },
            { title: template.title }
        ).catch(console.error);

        return handleApiSuccess(updated);
    } catch (error) {
        console.error('[API] DELETE /api/doctor/consents/templates/[templateId] - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
