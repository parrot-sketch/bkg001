/**
 * Integration Tests: Admin Consent Tools
 * 
 * Contract tests for:
 * - GET /api/admin/consents/integrity-check
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as INTEGRITY_CHECK_GET } from '@/app/api/admin/consents/integrity-check/route';
import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import {
    assertSuccess200,
    assertStatusCode,
} from '../../helpers/apiResponseAssertions';

// Define singleton mock
const mockService = {
    verifyAllDocuments: vi.fn(),
};

// Mock dependencies
vi.mock('@/lib/auth/middleware', () => ({
    JwtMiddleware: {
        authenticate: vi.fn(),
    },
}));

vi.mock('@/lib/factories/consentFormDocumentFactory', () => ({
    getConsentFormDocumentService: vi.fn(() => mockService),
}));

import { JwtMiddleware } from '@/lib/auth/middleware';

describe('Admin Consent Tools API', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/admin/consents/integrity-check', () => {
        it('should return 200 and integrity report for ADMIN', async () => {
            (JwtMiddleware.authenticate as any).mockResolvedValue({
                success: true,
                user: { userId: 'admin-1', role: Role.ADMIN },
            });

            mockService.verifyAllDocuments.mockResolvedValue([
                { id: 'doc-1', fileName: 'test.pdf', status: 'VALID' }
            ]);

            const request = new NextRequest('http://localhost/api/admin/consents/integrity-check');
            const response = await INTEGRITY_CHECK_GET(request);
            const json = await response.json() as { success: boolean; data: { totalChecked: number; results: any[] } };

            assertSuccess200(response, json);
            expect(json.data.totalChecked).toBe(1);
            expect(mockService.verifyAllDocuments).toHaveBeenCalled();
        });

        it('should return 403 for non-ADMIN (DOCTOR)', async () => {
            (JwtMiddleware.authenticate as any).mockResolvedValue({
                success: true,
                user: { userId: 'doctor-1', role: Role.DOCTOR },
            });

            const request = new NextRequest('http://localhost/api/admin/consents/integrity-check');
            const response = await INTEGRITY_CHECK_GET(request);

            assertStatusCode(response, 403);
        });
    });
});
