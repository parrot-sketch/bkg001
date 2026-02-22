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

const updateTemplateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().optional(),
    pdf_url: z.string().url().optional().nullable(),
    template_format: z.nativeEnum(TemplateFormat).optional(),
    extracted_content: z.string().optional().nullable(),
    is_active: z.boolean().optional(),
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
                created_by: true,
                created_at: true,
                updated_at: true,
            },
        });

        if (!template) {
            return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
        }

        // Verify ownership
        if (template.created_by !== authResult.user.userId) {
            return NextResponse.json({ success: false, error: 'Forbidden: Not your template' }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            data: template,
        });
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

        // Verify ownership
        const existing = await db.consentTemplate.findUnique({
            where: { id: templateId },
            select: { created_by: true, version: true },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
        }

        if (existing.created_by !== authResult.user.userId) {
            return NextResponse.json({ success: false, error: 'Forbidden: Not your template' }, { status: 403 });
        }

        // If content, title, pdf_url, or template_format changed, increment version
        const updateData: any = { ...validation.data };
        if (updateData.content || updateData.title || updateData.pdf_url !== undefined || updateData.template_format) {
            updateData.version = existing.version + 1;
        }

        // Auto-determine template format if not explicitly set
        if (!updateData.template_format) {
            if (updateData.pdf_url !== undefined || updateData.content !== undefined) {
                const currentTemplate = await db.consentTemplate.findUnique({
                    where: { id: templateId },
                    select: { pdf_url: true, content: true },
                });
                const hasPdf = updateData.pdf_url || currentTemplate?.pdf_url;
                const hasContent = (updateData.content?.trim() || currentTemplate?.content?.trim());
                
                if (hasPdf && hasContent) {
                    updateData.template_format = TemplateFormat.HYBRID;
                } else if (hasPdf) {
                    updateData.template_format = TemplateFormat.PDF;
                } else if (hasContent) {
                    updateData.template_format = TemplateFormat.HTML;
                }
            }
        }

        const updated = await db.consentTemplate.update({
            where: { id: templateId },
            data: updateData,
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
                created_at: true,
                updated_at: true,
            },
        });

        // Audit
        await db.auditLog.create({
            data: {
                user_id: authResult.user.userId,
                record_id: templateId,
                action: 'UPDATE',
                model: 'ConsentTemplate',
                details: `Template "${updated.title}" updated to version ${updated.version}`,
            },
        });

        return NextResponse.json({
            success: true,
            data: updated,
            message: 'Template updated successfully',
        });
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

        // Soft delete: set is_active to false
        const updated = await db.consentTemplate.update({
            where: { id: templateId },
            data: { is_active: false },
            select: {
                id: true,
                title: true,
                is_active: true,
            },
        });

        // Audit
        await db.auditLog.create({
            data: {
                user_id: authResult.user.userId,
                record_id: templateId,
                action: 'DELETE',
                model: 'ConsentTemplate',
                details: `Template "${updated.title}" deactivated`,
            },
        });

        return NextResponse.json({
            success: true,
            data: updated,
            message: 'Template deactivated successfully',
        });
    } catch (error) {
        console.error('[API] DELETE /api/doctor/consents/templates/[templateId] - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
