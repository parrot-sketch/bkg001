/**
 * Integration Tests: Consent Template Approval Workflow
 * 
 * Contract tests for:
 * - POST /api/doctor/consents/templates/[templateId]/submit-approval
 * - POST /api/doctor/consents/templates/[templateId]/approve
 * - POST /api/doctor/consents/templates/[templateId]/reject
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as SUBMIT_POST } from '@/app/api/doctor/consents/templates/[templateId]/submit-approval/route';
import { POST as APPROVE_POST } from '@/app/api/doctor/consents/templates/[templateId]/approve/route';
import { POST as REJECT_POST } from '@/app/api/doctor/consents/templates/[templateId]/reject/route';
import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import {
    assertSuccess200,
    assertStatusCode,
} from '../../helpers/apiResponseAssertions';

// Define singleton mock
const mockService = {
    submitForApproval: vi.fn(),
    approveTemplate: vi.fn(),
    rejectTemplate: vi.fn(),
};

// Mock dependencies
vi.mock('@/lib/auth/middleware', () => ({
    JwtMiddleware: {
        authenticate: vi.fn(),
    },
}));

vi.mock('@/lib/factories/consentTemplateFactory', () => ({
    getConsentTemplateService: vi.fn(() => mockService),
}));

import { JwtMiddleware } from '@/lib/auth/middleware';

describe('Consent Template Approval Workflow API', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /submit-approval', () => {
        it('should return 200 for valid submission by owner', async () => {
            (JwtMiddleware.authenticate as any).mockResolvedValue({
                success: true,
                user: { userId: 'doctor-1', role: Role.DOCTOR },
            });

            mockService.submitForApproval.mockResolvedValue({ id: 'tmpl-1', approval_status: 'PENDING_APPROVAL' });

            const request = new NextRequest('http://localhost/api/doctor/consents/templates/tmpl-1/submit-approval', {
                method: 'POST',
                body: JSON.stringify({ notes: 'Please review' }),
            });

            const response = await SUBMIT_POST(request, { params: Promise.resolve({ templateId: 'tmpl-1' }) });
            const json = await response.json();

            assertSuccess200(response, json);
            expect(mockService.submitForApproval).toHaveBeenCalledWith('tmpl-1', expect.anything(), 'Please review');
        });

        it('should return 500 (standard error handler) for unauthorized role', async () => {
            (JwtMiddleware.authenticate as any).mockResolvedValue({
                success: true,
                user: { userId: 'nurse-1', role: Role.NURSE },
            });

            const request = new NextRequest('http://localhost/api/doctor/consents/templates/tmpl-1/submit-approval', { method: 'POST' });
            const response = await SUBMIT_POST(request, { params: Promise.resolve({ templateId: 'tmpl-1' }) });

            // Should be 403 now since I updated the route to use ForbiddenError
            assertStatusCode(response, 403);
        });
    });

    describe('POST /approve', () => {
        it('should return 200 for valid approval by ADMIN', async () => {
            (JwtMiddleware.authenticate as any).mockResolvedValue({
                success: true,
                user: { userId: 'admin-1', role: Role.ADMIN },
            });

            mockService.approveTemplate.mockResolvedValue({ id: 'tmpl-1', status: 'APPROVED' });

            const request = new NextRequest('http://localhost/api/doctor/consents/templates/tmpl-1/approve', {
                method: 'POST',
                body: JSON.stringify({ releaseNotes: 'Go live' }),
            });

            const response = await APPROVE_POST(request, { params: Promise.resolve({ templateId: 'tmpl-1' }) });
            const json = await response.json();

            assertSuccess200(response, json);
            expect(mockService.approveTemplate).toHaveBeenCalled();
        });

        it('should return 403 for non-admin', async () => {
            (JwtMiddleware.authenticate as any).mockResolvedValue({
                success: true,
                user: { userId: 'doctor-1', role: Role.DOCTOR },
            });

            const request = new NextRequest('http://localhost/api/doctor/consents/templates/tmpl-1/approve', { method: 'POST' });
            const response = await APPROVE_POST(request, { params: Promise.resolve({ templateId: 'tmpl-1' }) });

            assertStatusCode(response, 403);
        });
    });
});
