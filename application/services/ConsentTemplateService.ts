/**
 * Service: ConsentTemplateService
 * 
 * Document Control System for Consent Templates
 * 
 * Responsibilities:
 * - Template CRUD operations with version control
 * - Status management (DRAFT, ACTIVE, ARCHIVED)
 * - Version history tracking
 * - Audit logging
 * - Usage tracking
 */

import { PrismaClient, ConsentTemplate, ConsentTemplateVersion, ConsentTemplateAudit, TemplateStatus, AuditAction, Role, ApprovalStatus } from '@prisma/client';
import { NotFoundError } from '../errors/NotFoundError';
import { ValidationError } from '../errors/ValidationError';
import { createHash } from 'crypto';

export interface CreateTemplateData {
  title: string;
  type: string;
  content?: string;
  pdf_url?: string | null;
  template_format?: string;
  extracted_content?: string | null;
  description?: string;
}

export interface UpdateTemplateData {
  title?: string;
  content?: string;
  pdf_url?: string | null;
  template_format?: string;
  extracted_content?: string | null;
  description?: string;
  version_notes?: string; // Why this version was created
}

export interface AuditContext {
  actorUserId: string;
  actorRole: Role;
  ipAddress?: string;
  userAgent?: string;
}

export class ConsentTemplateService {
  constructor(private readonly prisma: PrismaClient) { }

  /**
   * Create a new template (starts as DRAFT)
   */
  async createTemplate(data: CreateTemplateData, context: AuditContext): Promise<ConsentTemplate> {
    const template = await this.prisma.consentTemplate.create({
      data: {
        title: data.title,
        type: data.type as any,
        content: data.content || '',
        pdf_url: data.pdf_url || null,
        template_format: (data.template_format as any) || 'HTML',
        extracted_content: data.extracted_content || null,
        description: data.description || null,
        status: TemplateStatus.DRAFT,
        version: 1,
        is_active: true,
        created_by: context.actorUserId,
      },
    });

    // Create initial version snapshot
    await this.createVersionSnapshot(template.id, template.version, context);

    // Log audit event (non-blocking)
    this.logAuditEvent(template.id, AuditAction.CREATED, context, null).catch(console.error);

    return template;
  }

  /**
   * Update template (creates new version)
   */
  async updateTemplate(
    templateId: string,
    data: UpdateTemplateData,
    context: AuditContext
  ): Promise<ConsentTemplate> {
    // Get existing template
    const existing = await this.prisma.consentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      throw new NotFoundError('Template not found', 'ConsentTemplate', templateId);
    }

    // Verify ownership
    if (existing.created_by !== context.actorUserId) {
      throw new ValidationError('You can only update your own templates');
    }

    // Determine if we need to create a new version
    const needsNewVersion = !!(
      data.title !== undefined && data.title !== existing.title ||
      data.content !== undefined && data.content !== existing.content ||
      data.pdf_url !== undefined && data.pdf_url !== existing.pdf_url ||
      data.template_format !== undefined && data.template_format !== existing.template_format
    );

    const newVersion = needsNewVersion ? existing.version + 1 : existing.version;

    // Create version snapshot before update (if new version)
    if (needsNewVersion) {
      await this.createVersionSnapshot(templateId, existing.version, context, data.version_notes);
    }

    // Update template
    const updated = await this.prisma.consentTemplate.update({
      where: { id: templateId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.pdf_url !== undefined && { pdf_url: data.pdf_url }),
        ...(data.template_format !== undefined && { template_format: data.template_format as any }),
        ...(data.extracted_content !== undefined && { extracted_content: data.extracted_content }),
        ...(data.description !== undefined && { description: data.description }),
        ...(needsNewVersion && { version: newVersion }),
      },
    });

    // Log audit event (non-blocking)
    const changes = this.computeChanges(existing, updated);
    this.logAuditEvent(templateId, AuditAction.UPDATED, context, changes).catch(console.error);

    return updated;
  }

  /**
   * Activate template (DRAFT → ACTIVE)
   */
  async activateTemplate(templateId: string, context: AuditContext): Promise<ConsentTemplate> {
    const template = await this.prisma.consentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundError('Template not found', 'ConsentTemplate', templateId);
    }

    if (template.created_by !== context.actorUserId) {
      throw new ValidationError('You can only activate your own templates');
    }

    if (template.status === TemplateStatus.ACTIVE) {
      return template; // Already active
    }

    const updated = await this.prisma.consentTemplate.update({
      where: { id: templateId },
      data: { status: TemplateStatus.ACTIVE },
    });

    // Log audit event (non-blocking)
    this.logAuditEvent(templateId, AuditAction.ACTIVATED, context, null).catch(console.error);

    return updated;
  }

  /**
   * Archive template (ACTIVE → ARCHIVED)
   */
  async archiveTemplate(templateId: string, context: AuditContext): Promise<ConsentTemplate> {
    const template = await this.prisma.consentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundError('Template not found', 'ConsentTemplate', templateId);
    }

    if (template.created_by !== context.actorUserId) {
      throw new ValidationError('You can only archive your own templates');
    }

    if (template.status === TemplateStatus.ARCHIVED) {
      return template; // Already archived
    }

    const updated = await this.prisma.consentTemplate.update({
      where: { id: templateId },
      data: { status: TemplateStatus.ARCHIVED },
    });

    // Log audit event (non-blocking)
    this.logAuditEvent(templateId, AuditAction.ARCHIVED, context, null).catch(console.error);

    return updated;
  }

  /**
   * Duplicate template (creates new template with version 1)
   */
  async duplicateTemplate(templateId: string, newTitle: string, context: AuditContext): Promise<ConsentTemplate> {
    const source = await this.prisma.consentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!source) {
      throw new NotFoundError('Template not found', 'ConsentTemplate', templateId);
    }

    // Create duplicate
    const duplicate = await this.prisma.consentTemplate.create({
      data: {
        title: newTitle,
        type: source.type,
        content: source.content,
        pdf_url: source.pdf_url,
        template_format: source.template_format,
        extracted_content: source.extracted_content,
        description: source.description ? `Copy of: ${source.description}` : null,
        status: TemplateStatus.DRAFT,
        version: 1,
        is_active: true,
        created_by: context.actorUserId,
      },
    });

    // Create version snapshot
    await this.createVersionSnapshot(duplicate.id, 1, context, `Duplicated from template ${source.id}`);

    // Log audit events (non-blocking)
    this.logAuditEvent(duplicate.id, AuditAction.CREATED, context, null).catch(console.error);
    this.logAuditEvent(templateId, AuditAction.DUPLICATED, context, { duplicated_to: duplicate.id }).catch(console.error);

    return duplicate;
  }

  /**
   * Get version history for a template
   */
  async getVersionHistory(templateId: string): Promise<ConsentTemplateVersion[]> {
    const template = await this.prisma.consentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundError('Template not found', 'ConsentTemplate', templateId);
    }

    return this.prisma.consentTemplateVersion.findMany({
      where: { template_id: templateId },
      orderBy: { version_number: 'desc' },
    });
  }

  /**
   * Get audit log for a template
   */
  async getAuditLog(templateId: string, limit?: number): Promise<ConsentTemplateAudit[]> {
    const template = await this.prisma.consentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundError('Template not found', 'ConsentTemplate', templateId);
    }

    return this.prisma.consentTemplateAudit.findMany({
      where: { template_id: templateId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  /**
   * Track template usage (increment usage_count, update last_used_at)
   */
  async trackUsage(templateId: string): Promise<void> {
    await this.prisma.consentTemplate.update({
      where: { id: templateId },
      data: {
        usage_count: { increment: 1 },
        last_used_at: new Date(),
      },
    });
  }

  /**
   * Submit template for approval (DRAFT/REJECTED → PENDING_APPROVAL)
   * Phase 2: Approval workflow
   */
  async submitForApproval(templateId: string, context: AuditContext, notes?: string): Promise<ConsentTemplate> {
    const template = await this.prisma.consentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundError('Template not found', 'ConsentTemplate', templateId);
    }

    // Only creator can submit
    if (template.created_by !== context.actorUserId) {
      throw new ValidationError('You can only submit your own templates for approval');
    }

    // Must be DRAFT or REJECTED
    if (template.approval_status !== ApprovalStatus.DRAFT && template.approval_status !== ApprovalStatus.REJECTED) {
      throw new ValidationError(`Template cannot be submitted. Current status: ${template.approval_status}`);
    }

    const updated = await this.prisma.consentTemplate.update({
      where: { id: templateId },
      data: {
        approval_status: ApprovalStatus.PENDING_APPROVAL,
        status: TemplateStatus.PENDING_APPROVAL, // Keep status in sync for UI filtering
      },
    });

    // Log audit event
    this.logAuditEvent(templateId, AuditAction.SUBMITTED_FOR_APPROVAL, context, { notes: notes || null }).catch(console.error);

    return updated;
  }

  /**
   * Approve template (PENDING_APPROVAL → APPROVED, status → ACTIVE)
   * Phase 2: Approval workflow
   * Only ADMIN or SENIOR_DOCTOR can approve
   */
  async approveTemplate(templateId: string, context: AuditContext, releaseNotes?: string): Promise<ConsentTemplate> {
    // Check role - only ADMIN can approve (or SENIOR_DOCTOR if that role exists)
    if (context.actorRole !== 'ADMIN') {
      throw new ValidationError('Only administrators can approve templates');
    }

    const template = await this.prisma.consentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundError('Template not found', 'ConsentTemplate', templateId);
    }

    if (template.approval_status !== ApprovalStatus.PENDING_APPROVAL) {
      throw new ValidationError(`Template cannot be approved. Current status: ${template.approval_status}`);
    }

    // Update template: approve, activate, lock version
    const updated = await this.prisma.consentTemplate.update({
      where: { id: templateId },
      data: {
        approval_status: ApprovalStatus.APPROVED,
        status: TemplateStatus.ACTIVE,
        approved_by_user_id: context.actorUserId,
        approved_at: new Date(),
        locked_version_number: template.version,
      },
    });

    // Create release record
    await this.prisma.consentTemplateRelease.create({
      data: {
        template_id: templateId,
        version_number: template.version,
        released_by_user_id: context.actorUserId,
        release_notes: releaseNotes || null,
      },
    }).catch(console.error); // Non-blocking

    // Log audit event
    this.logAuditEvent(templateId, AuditAction.APPROVED, context, {
      version: template.version,
      releaseNotes: releaseNotes || null,
    }).catch(console.error);

    return updated;
  }

  /**
   * Reject template (PENDING_APPROVAL → REJECTED)
   * Phase 2: Approval workflow
   */
  async rejectTemplate(templateId: string, context: AuditContext, reason: string): Promise<ConsentTemplate> {
    // Only ADMIN can reject
    if (context.actorRole !== 'ADMIN') {
      throw new ValidationError('Only administrators can reject templates');
    }

    const template = await this.prisma.consentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundError('Template not found', 'ConsentTemplate', templateId);
    }

    if (template.approval_status !== ApprovalStatus.PENDING_APPROVAL) {
      throw new ValidationError(`Template cannot be rejected. Current status: ${template.approval_status}`);
    }

    const updated = await this.prisma.consentTemplate.update({
      where: { id: templateId },
      data: {
        approval_status: ApprovalStatus.REJECTED,
      },
    });

    // Log audit event with rejection reason
    this.logAuditEvent(templateId, AuditAction.REJECTED, context, { reason }).catch(console.error);

    return updated;
  }

  /**
   * Replace PDF (creates new version, resets approval to DRAFT)
   * Phase 2: Approval workflow
   */
  async replacePdf(
    templateId: string,
    fileInfo: { url: string; filename: string; size: number; buffer: Buffer },
    versionNotes: string,
    context: AuditContext
  ): Promise<ConsentTemplate> {
    const template = await this.prisma.consentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundError('Template not found', 'ConsentTemplate', templateId);
    }

    // Only creator can replace PDF
    if (template.created_by !== context.actorUserId) {
      throw new ValidationError('You can only replace PDFs for your own templates');
    }

    // Compute SHA-256 checksum
    const checksum = createHash('sha256').update(fileInfo.buffer).digest('hex');

    // Create version snapshot of current state
    await this.createVersionSnapshot(templateId, template.version, context, versionNotes);

    // Update template: new version, new PDF, reset approval
    const updated = await this.prisma.consentTemplate.update({
      where: { id: templateId },
      data: {
        version: template.version + 1,
        pdf_url: fileInfo.url,
        latest_pdf_filename: fileInfo.filename,
        checksum_sha256: checksum,
        approval_status: ApprovalStatus.DRAFT, // Reset to DRAFT after PDF replacement
      },
    });

    // Log audit event
    this.logAuditEvent(templateId, AuditAction.PDF_REPLACED, context, {
      oldVersion: template.version,
      newVersion: updated.version,
      filename: fileInfo.filename,
      checksum,
      versionNotes,
    }).catch(console.error);

    return updated;
  }

  /**
   * Compute SHA-256 checksum for a buffer
   */
  computeChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Create version snapshot
   */
  private async createVersionSnapshot(
    templateId: string,
    versionNumber: number,
    context: AuditContext,
    notes?: string | null
  ): Promise<void> {
    const template = await this.prisma.consentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) return;

    await this.prisma.consentTemplateVersion.create({
      data: {
        template_id: templateId,
        version_number: versionNumber,
        title: template.title,
        content: template.content,
        pdf_url: template.pdf_url,
        template_format: template.template_format,
        created_by: context.actorUserId,
        version_notes: notes || null,
      },
    });
  }

  /**
   * Log audit event (non-blocking)
   * Public for use in API routes
   */
  async logAuditEvent(
    templateId: string,
    action: AuditAction,
    context: AuditContext,
    changes: any
  ): Promise<void> {
    try {
      await this.prisma.consentTemplateAudit.create({
        data: {
          template_id: templateId,
          action,
          actor_user_id: context.actorUserId,
          actor_role: context.actorRole,
          changes_json: changes ? JSON.stringify(changes) : null,
          ip_address: context.ipAddress || null,
          user_agent: context.userAgent || null,
        },
      });
    } catch (error) {
      // Non-blocking: log error but don't throw
      console.error('[ConsentTemplateService] Failed to log audit event:', error);
    }
  }

  /**
   * Compute changes between old and new template
   */
  private computeChanges(oldTemplate: ConsentTemplate, newTemplate: ConsentTemplate): any {
    const changes: any = {};

    if (oldTemplate.title !== newTemplate.title) {
      changes.title = { from: oldTemplate.title, to: newTemplate.title };
    }
    if (oldTemplate.content !== newTemplate.content) {
      changes.content = { changed: true };
    }
    if (oldTemplate.pdf_url !== newTemplate.pdf_url) {
      changes.pdf_url = { from: oldTemplate.pdf_url, to: newTemplate.pdf_url };
    }
    if (oldTemplate.template_format !== newTemplate.template_format) {
      changes.template_format = { from: oldTemplate.template_format, to: newTemplate.template_format };
    }
    if (oldTemplate.description !== newTemplate.description) {
      changes.description = { from: oldTemplate.description, to: newTemplate.description };
    }
    if (oldTemplate.version !== newTemplate.version) {
      changes.version = { from: oldTemplate.version, to: newTemplate.version };
    }
    if (oldTemplate.status !== newTemplate.status) {
      changes.status = { from: oldTemplate.status, to: newTemplate.status };
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }
}
