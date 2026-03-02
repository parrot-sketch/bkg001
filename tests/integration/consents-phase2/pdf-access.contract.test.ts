/**
 * Integration Tests: Secure PDF Access
 * 
 * Contract tests for:
 * - GET /api/doctor/consents/templates/[templateId]/pdf
 * - GET /api/files/consent-templates/[userId]/[filename]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as TEMPLATE_PDF_GATE_GET } from '@/app/api/doctor/consents/templates/[templateId]/pdf/route';
import { GET as TEMPLATE_FILE_GET } from '@/app/api/files/consent-templates/[userId]/[filename]/route';
import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { assertStatusCode } from '../../helpers/apiResponseAssertions';

// Mock dependencies
vi.mock('@/lib/auth/middleware', () => ({
    JwtMiddleware: {
        authenticate: vi.fn(),
    },
}));

vi.mock('@/lib/db', () => ({
    default: {
        consentTemplate: {
            findUnique: vi.fn(),
        },
    },
}));

vi.mock('fs/promises', () => ({
    readFile: vi.fn(),
}));

vi.mock('fs', () => ({
    existsSync: vi.fn(),
}));

import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

describe('Secure PDF Access API', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/doctor/consents/templates/[templateId]/pdf', () => {
        it('should redirect to the file serving route for authorized user', async () => {
            (JwtMiddleware.authenticate as any).mockResolvedValue({
                success: true,
                user: { userId: 'doctor-1', role: Role.DOCTOR },
            });

            (db.consentTemplate.findUnique as any).mockResolvedValue({
                pdf_url: '/api/files/consent-templates/doctor-1/tmpl-1.pdf',
                created_by: 'doctor-1',
            });

            const request = new NextRequest('http://localhost/api/doctor/consents/templates/tmpl-1/pdf');
            const response = await TEMPLATE_PDF_GATE_GET(request, { params: Promise.resolve({ templateId: 'tmpl-1' }) });

            expect(response.status).toBe(307);
            expect(response.headers.get('location')).toContain('/api/files/consent-templates/doctor-1/tmpl-1.pdf');
        });

        it('should return 404 when template not found', async () => {
            (JwtMiddleware.authenticate as any).mockResolvedValue({
                success: true,
                user: { userId: 'doctor-1', role: Role.DOCTOR },
            });

            (db.consentTemplate.findUnique as any).mockResolvedValue(null);

            const request = new NextRequest('http://localhost/api/doctor/consents/templates/tmpl-1/pdf');
            const response = await TEMPLATE_PDF_GATE_GET(request, { params: Promise.resolve({ templateId: 'tmpl-1' }) });

            assertStatusCode(response, 404);
        });
    });

    describe('GET /api/files/consent-templates/[userId]/[filename]', () => {
        it('should return 200 and PDF content for authorized user', async () => {
            (JwtMiddleware.authenticate as any).mockResolvedValue({
                success: true,
                user: { userId: 'doctor-1', role: Role.DOCTOR },
            });

            (existsSync as any).mockReturnValue(true);
            (readFile as any).mockResolvedValue(Buffer.from('fake pdf content'));

            const request = new NextRequest('http://localhost/api/files/consent-templates/doctor-1/tmpl-1.pdf');
            const response = await TEMPLATE_FILE_GET(request, { params: Promise.resolve({ userId: 'doctor-1', filename: 'tmpl-1.pdf' }) });

            expect(response.status).toBe(200);
            expect(response.headers.get('content-type')).toBe('application/pdf');
            const body = await response.arrayBuffer();
            expect(Buffer.from(body).toString()).toBe('fake pdf content');
        });

        it('should return 401 for unauthenticated request', async () => {
            (JwtMiddleware.authenticate as any).mockResolvedValue({ success: false });

            const request = new NextRequest('http://localhost/api/files/consent-templates/doctor-1/tmpl-1.pdf');
            const response = await TEMPLATE_FILE_GET(request, { params: Promise.resolve({ userId: 'doctor-1', filename: 'tmpl-1.pdf' }) });

            // The route returns 401 directly for unauthenticated access to these files
            assertStatusCode(response, 401);
        });
    });
});
