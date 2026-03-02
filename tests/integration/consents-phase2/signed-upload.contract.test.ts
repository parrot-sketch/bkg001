/**
 * Integration Tests: Signed Consent Upload and Listing
 * 
 * Contract tests for:
 * - POST /api/doctor/consents/[consentId]/upload-signed
 * - GET /api/doctor/consents/[consentId]/documents
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as UPLOAD_SIGNED_POST } from '@/app/api/doctor/consents/[consentId]/upload-signed/route';
import { GET as LIST_DOCS_GET } from '@/app/api/doctor/consents/[consentId]/documents/route';
import { NextRequest } from 'next/server';
import { Role, ConsentDocumentType } from '@prisma/client';
import {
    assertSuccess200,
    assertStatusCode,
} from '../../helpers/apiResponseAssertions';

// Define singleton mock
const mockService = {
    uploadDocument: vi.fn(),
    listDocuments: vi.fn(),
    computeChecksum: vi.fn(() => 'fake-checksum'),
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

describe('Signed Consent Upload and Listing API', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /[consentId]/upload-signed', () => {
        it('should return 200 for valid signed upload by doctor', async () => {
            (JwtMiddleware.authenticate as any).mockResolvedValue({
                success: true,
                user: { userId: 'doctor-1', role: Role.DOCTOR },
            });

            mockService.uploadDocument.mockResolvedValue({ id: 'doc-1', file_url: '/api/files/signed.pdf' });

            const formData = new FormData();
            const fakeFile = new Blob(['fake signed pdf'], { type: 'application/pdf' });
            formData.append('file', fakeFile, 'signed.pdf');
            formData.append('checksum', 'fake-checksum');

            const request = new NextRequest('http://localhost/api/doctor/consents/consent-1/upload-signed', {
                method: 'POST',
                body: formData,
            });

            const response = await UPLOAD_SIGNED_POST(request, { params: Promise.resolve({ consentId: 'consent-1' }) });
            const json = await response.json();

            assertSuccess200(response, json);
            expect(mockService.uploadDocument).toHaveBeenCalledWith(expect.objectContaining({
                consentFormId: 'consent-1',
                uploadedByUserId: 'doctor-1',
                documentType: ConsentDocumentType.SIGNED_PDF,
            }));
        });

        it('should return 403 for unauthorized role (PATIENT)', async () => {
            (JwtMiddleware.authenticate as any).mockResolvedValue({
                success: true,
                user: { userId: 'patient-1', role: Role.PATIENT },
            });

            const request = new NextRequest('http://localhost/api/doctor/consents/consent-1/upload-signed', { method: 'POST' });
            const response = await UPLOAD_SIGNED_POST(request, { params: Promise.resolve({ consentId: 'consent-1' }) });

            assertStatusCode(response, 403);
        });
    });

    describe('GET /[consentId]/documents', () => {
        it('should return list of documents for authorized user', async () => {
            (JwtMiddleware.authenticate as any).mockResolvedValue({
                success: true,
                user: { userId: 'doctor-1', role: Role.DOCTOR },
            });

            mockService.listDocuments.mockResolvedValue([{ id: 'doc-1', version: 1 }]);

            const request = new NextRequest('http://localhost/api/doctor/consents/consent-1/documents');
            const response = await LIST_DOCS_GET(request, { params: Promise.resolve({ consentId: 'consent-1' }) });
            const json = await response.json();

            assertSuccess200(response, json);
            expect(mockService.listDocuments).toHaveBeenCalledWith('consent-1');
        });
    });
});
