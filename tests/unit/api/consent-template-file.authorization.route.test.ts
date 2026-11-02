import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const hoisted = vi.hoisted(() => ({
  authenticate: vi.fn(),
  consentTemplateFindFirst: vi.fn(),
  downloadResource: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  JwtMiddleware: { authenticate: (...args: unknown[]) => hoisted.authenticate(...args) },
}));

vi.mock('@/lib/db', () => ({
  default: { consentTemplate: { findFirst: (...args: unknown[]) => hoisted.consentTemplateFindFirst(...args) } },
}));

vi.mock('@/lib/cloudinary', () => ({
  downloadResource: (...args: unknown[]) => hoisted.downloadResource(...args),
}));

import { GET } from '@/app/api/files/consent-templates/[userId]/[filename]/route';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/files/consent-templates/doctor-1/template.pdf');
}

function makeParams(userId = 'doctor-1', filename = 'template.pdf') {
  return { params: Promise.resolve({ userId, filename }) };
}

describe('GET consent-template file authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.downloadResource.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('pdf').buffer,
    });
  });

  it('rejects anonymous access before resolving a resource', async () => {
    hoisted.authenticate.mockResolvedValue({ success: false, user: null });

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(401);
    expect(hoisted.consentTemplateFindFirst).not.toHaveBeenCalled();
    expect(hoisted.downloadResource).not.toHaveBeenCalled();
  });

  it('rejects roles outside the clinical template workflow', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'patient-1', role: 'PATIENT' } });

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(403);
    expect(hoisted.consentTemplateFindFirst).not.toHaveBeenCalled();
  });

  it('rejects another doctor’s draft file', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-2', role: 'DOCTOR' } });
    hoisted.consentTemplateFindFirst.mockResolvedValue({
      created_by: 'doctor-1',
      is_active: false,
      status: 'DRAFT',
    });

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(404);
    expect(hoisted.downloadResource).not.toHaveBeenCalled();
  });

  it('allows the owning doctor to preview their own draft upload', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-1', role: 'DOCTOR' } });
    hoisted.consentTemplateFindFirst.mockResolvedValue({
      created_by: 'doctor-1',
      is_active: false,
      status: 'DRAFT',
    });

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(200);
    expect(hoisted.downloadResource).toHaveBeenCalledWith('consent-templates/doctor-1/template.pdf', 'raw');
  });

  it('allows a nurse to retrieve a file referenced by an active template', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'nurse-1', role: 'NURSE' } });
    hoisted.consentTemplateFindFirst.mockResolvedValue({
      created_by: 'doctor-1',
      is_active: true,
      status: 'ACTIVE',
    });

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(200);
  });

  it('returns 404 when the underlying file is missing', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-1', role: 'DOCTOR' } });
    hoisted.consentTemplateFindFirst.mockResolvedValue(null);
    hoisted.downloadResource.mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' });

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(404);
  });
});