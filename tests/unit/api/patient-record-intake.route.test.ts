import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const hoisted = vi.hoisted(() => ({
  authenticate: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('@/lib/auth/jwt-helper', () => ({
  authenticateRequest: (...args: unknown[]) => hoisted.authenticate(...args),
}));
vi.mock('@/lib/db', () => ({ default: {} }));
vi.mock('@/infrastructure/database/repositories/PrismaPatientRepository', () => ({
  PrismaPatientRepository: class {},
}));
vi.mock('@/infrastructure/services/ConsoleAuditService', () => ({
  ConsoleAuditService: class {},
}));
vi.mock('@/application/use-cases/CreatePatientUseCase', () => ({
  CreatePatientUseCase: class {
    execute(...args: unknown[]) {
      return hoisted.execute(...args);
    }
  },
}));

import { POST } from '@/app/api/patients/route';

const intakeRecord = {
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: '1990-01-01',
  gender: 'FEMALE',
  email: 'jane@example.com',
  phone: '0712345678',
  address: '1 Clinic Road',
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/patients', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/patients staff intake', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.execute.mockResolvedValue({ id: 'generated-patient-id', firstName: 'Jane', lastName: 'Doe' });
  });

  it('rejects anonymous registration', async () => {
    hoisted.authenticate.mockResolvedValue({ success: false, error: 'Authorization required', user: null });

    const response = await POST(makeRequest(intakeRecord));

    expect(response.status).toBe(401);
    expect(hoisted.execute).not.toHaveBeenCalled();
  });

  it('rejects patient self-registration', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'patient-user', role: 'PATIENT' } });

    const response = await POST(makeRequest(intakeRecord));

    expect(response.status).toBe(403);
    expect(hoisted.execute).not.toHaveBeenCalled();
  });

  it('allows clinic staff to create a Patient record with a server-generated ID', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'frontdesk-user', role: 'FRONTDESK' } });

    const response = await POST(makeRequest({ ...intakeRecord, id: 'client-chosen-id' }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(hoisted.execute).toHaveBeenCalledOnce();
    const [dto, createdBy] = hoisted.execute.mock.calls[0];
    expect(dto.id).not.toBe('client-chosen-id');
    expect(createdBy).toBe('frontdesk-user');
  });
});