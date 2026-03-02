import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestDatabase, resetTestDatabase } from '../../../setup/test-database';
import { ConsentTemplateService, AuditContext } from '@/application/services/ConsentTemplateService';
import { ApprovalStatus, Role, AuditAction, ConsentType } from '@prisma/client';

describe('ConsentTemplateService - Phase 2', () => {
    const db = getTestDatabase();
    const service = new ConsentTemplateService(db);

    const doctorContext: AuditContext = {
        actorUserId: 'doctor-1',
        actorRole: Role.DOCTOR,
    };

    const adminContext: AuditContext = {
        actorUserId: 'admin-1',
        actorRole: Role.ADMIN,
    };

    beforeEach(async () => {
        await resetTestDatabase();

        // Create required users for FK constraints
        await db.user.createMany({
            data: [
                { id: 'doctor-1', email: 'doctor1@example.com', password_hash: 'hash', role: Role.DOCTOR },
                { id: 'admin-1', email: 'admin1@example.com', password_hash: 'hash', role: Role.ADMIN },
            ],
        });
    });

    afterAll(async () => {
        await db.$disconnect();
    });

    describe('Approval Workflow', () => {
        it('should allow submitting a template for approval', async () => {
            const template = await db.consentTemplate.create({
                data: {
                    title: 'Test Template',
                    type: ConsentType.GENERAL_PROCEDURE,
                    content: '<p>Test</p>',
                    pdf_url: '/api/files/test.pdf',
                    created_by: 'doctor-1',
                    approval_status: ApprovalStatus.DRAFT,
                },
            });

            const result = await service.submitForApproval(template.id, doctorContext, 'Submission notes');
            expect(result.approval_status).toBe(ApprovalStatus.PENDING_APPROVAL);

            const audit = await (db as any).consentTemplateAudit.findFirst({
                where: { template_id: template.id, action: 'SUBMITTED_FOR_APPROVAL' },
            });
            expect(audit).toBeDefined();
        });

        it('should allow an admin to approve a template', async () => {
            const template = await db.consentTemplate.create({
                data: {
                    title: 'Test Template',
                    type: ConsentType.GENERAL_PROCEDURE,
                    content: '<p>Test</p>',
                    pdf_url: '/api/files/test.pdf',
                    created_by: 'doctor-1',
                    approval_status: ApprovalStatus.PENDING_APPROVAL,
                },
            });

            const result = await service.approveTemplate(template.id, adminContext, 'Final approval');
            expect(result.approval_status).toBe(ApprovalStatus.APPROVED);

            const release = await (db as any).consentTemplateRelease.findFirst({
                where: { template_id: template.id },
            });
            expect(release).toBeDefined();
            expect(release.release_notes).toBe('Final approval');
        });

        it('should allow an admin to reject a template', async () => {
            const template = await db.consentTemplate.create({
                data: {
                    title: 'Test Template',
                    type: ConsentType.GENERAL_PROCEDURE,
                    content: '<p>Test</p>',
                    pdf_url: '/api/files/test.pdf',
                    created_by: 'doctor-1',
                    approval_status: ApprovalStatus.PENDING_APPROVAL,
                },
            });

            const result = await service.rejectTemplate(template.id, adminContext, 'Missing clauses');
            expect(result.approval_status).toBe(ApprovalStatus.REJECTED);
        });
    });

    describe('PDF Replacement', () => {
        it('should allow replacing a PDF and creating a new version', async () => {
            const template = await db.consentTemplate.create({
                data: {
                    title: 'Test Template',
                    type: ConsentType.GENERAL_PROCEDURE,
                    content: '<p>Test</p>',
                    pdf_url: '/api/files/v1.pdf',
                    created_by: 'doctor-1',
                    approval_status: ApprovalStatus.APPROVED,
                },
            });

            const fileInfo = {
                url: '/api/files/v2.pdf',
                filename: 'v2.pdf',
                size: 1024,
                buffer: Buffer.from('new pdf content'),
            };

            const result = await service.replacePdf(template.id, fileInfo, 'v2 update', doctorContext);

            expect(result.pdf_url).toBe('/api/files/v2.pdf');
            expect(result.approval_status).toBe(ApprovalStatus.DRAFT);
            expect(result.version).toBe(2);

            const audit = await (db as any).consentTemplateAudit.findFirst({
                where: { template_id: template.id, action: 'PDF_REPLACED' },
            });
            expect(audit).toBeDefined();
        });
    });
});
