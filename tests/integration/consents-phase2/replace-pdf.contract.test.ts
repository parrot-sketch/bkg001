/**
 * Integration Tests: Consent Template PDF Replacement
 * 
 * Contract tests for:
 * - POST /api/doctor/consents/templates/[templateId]/replace-pdf
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as REPLACE_PDF_POST } from '@/app/api/doctor/consents/templates/[templateId]/replace-pdf/route';
import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import {
    assertSuccess200,
    assertStatusCode,
} from '../../helpers/apiResponseAssertions';

// Define singleton mock
const mockService = {
    replacePdf: vi.fn(),
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

vi.mock('fs/promises', () => ({
    writeFile: vi.fn(),
    mkdir: vi.fn(),
}));

vi.mock('fs', () => ({
    existsSync: vi.fn(),
}));

vi.mock('@/lib/security/rateLimit', () => ({
    rateLimit: vi.fn(() => ({ success: true })),
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import { writeFile } from 'fs/promises';

describe('Consent Template PDF Replacement API', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return 200 for valid PDF replacement', async () => {
        (JwtMiddleware.authenticate as any).mockResolvedValue({
            success: true,
            user: { userId: 'doctor-1', role: Role.DOCTOR },
        });

        mockService.replacePdf.mockResolvedValue({ id: 'tmpl-1', version: 2 });

        const formData = new FormData();
        const fakeFile = new Blob(['fake pdf'], { type: 'application/pdf' });
        formData.append('file', fakeFile, 'new.pdf');
        formData.append('versionNotes', 'Updated terms');

        const request = new NextRequest('http://localhost/api/doctor/consents/templates/tmpl-1/replace-pdf', {
            method: 'POST',
            body: formData,
        });

        const response = await REPLACE_PDF_POST(request, { params: Promise.resolve({ templateId: 'tmpl-1' }) });
        const json = await response.json();

        assertSuccess200(response, json);
        expect(writeFile).toHaveBeenCalled();
        expect(mockService.replacePdf).toHaveBeenCalledWith(
            'tmpl-1',
            expect.objectContaining({ filename: expect.any(String) }),
            'Updated terms',
            expect.objectContaining({ actorUserId: 'doctor-1' })
        );
    });

    it('should return 403 for unauthorized role (NURSE)', async () => {
        (JwtMiddleware.authenticate as any).mockResolvedValue({
            success: true,
            user: { userId: 'nurse-1', role: Role.NURSE },
        });

        const request = new NextRequest('http://localhost/api/doctor/consents/templates/tmpl-1/replace-pdf', { method: 'POST' });
        const response = await REPLACE_PDF_POST(request, { params: Promise.resolve({ templateId: 'tmpl-1' }) });

        assertStatusCode(response, 403);
    });
});
