import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const hoisted = vi.hoisted(() => {
  const mockAuthenticate = vi.fn();

  const tx = {
    clinicalFormResponse: {
      update: vi.fn(),
    },
    surgicalProcedureRecord: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    clinicalAuditEvent: {
      create: vi.fn(),
    },
  };

  const mockDb = {
    clinicalFormResponse: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  };

  return { mockAuthenticate, tx, mockDb };
});

const { mockAuthenticate, tx, mockDb } = hoisted;

vi.mock('@/lib/auth/middleware', () => ({
  JwtMiddleware: {
    authenticate: (...args: any[]) => hoisted.mockAuthenticate(...args),
  },
}));

vi.mock('@/lib/db', () => ({
  default: hoisted.mockDb,
}));

vi.mock('@/lib/crypto/makeServerSignatureSvgDataUrl', () => ({
  makeServerSignatureSvgDataUrl: vi.fn((name: string) => `data:image/svg+xml;utf8,${encodeURIComponent(name)}`),
}));

vi.mock('@/lib/crypto/signatureProof', () => ({
  computeSignatureProof: vi.fn(() => ({
    version: 1,
    algorithm: 'sha256',
    hash: 'a'.repeat(64),
    signedByUserId: 'nurse-user-1',
    signedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    userAgent: 'unit-test',
    ip: '127.0.0.1',
  })),
}));

vi.mock('@/application/services/SurgicalCaseStatusTransitionService', () => ({
  SurgicalCaseStatusTransitionService: class {
    async transitionToRecovery() {
      return;
    }
    constructor() {}
  },
}));

import { POST } from '@/app/api/nurse/surgical-cases/[caseId]/forms/intraop/finalize/route';
import { INTRAOP_TEMPLATE_KEY, INTRAOP_TEMPLATE_VERSION } from '@/domain/clinical-forms/NurseIntraOpRecord';

function makeReq(): NextRequest {
  return new NextRequest('http://localhost:3000/api/nurse/surgical-cases/case-1/forms/intraop/finalize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'unit-test',
      'x-forwarded-for': '127.0.0.1',
    },
  });
}

describe('POST /api/nurse/surgical-cases/[caseId]/forms/intraop/finalize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.clinicalFormResponse.update.mockResolvedValue({ id: 'form-1' });
    tx.surgicalProcedureRecord.findUnique.mockResolvedValue(null);
    tx.clinicalAuditEvent.create.mockResolvedValue({ id: 'audit-1' });
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuthenticate.mockResolvedValueOnce({ success: false, user: null });

    const res = await POST(makeReq(), { params: Promise.resolve({ caseId: 'case-1' }) });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it('returns 403 when not a nurse', async () => {
    mockAuthenticate.mockResolvedValueOnce({ success: true, user: { userId: 'u1', role: 'DOCTOR' } });

    const res = await POST(makeReq(), { params: Promise.resolve({ caseId: 'case-1' }) });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
  });

  it('returns 404 when record not found', async () => {
    mockAuthenticate.mockResolvedValueOnce({ success: true, user: { userId: 'u1', role: 'NURSE' } });
    mockDb.clinicalFormResponse.findUnique.mockResolvedValueOnce(null);

    const res = await POST(makeReq(), { params: Promise.resolve({ caseId: 'case-1' }) });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });

  it('returns 422 with missingItems when required fields missing', async () => {
    mockAuthenticate.mockResolvedValueOnce({ success: true, user: { userId: 'u1', role: 'NURSE' } });
    mockDb.clinicalFormResponse.findUnique.mockResolvedValueOnce({
      id: 'form-1',
      status: 'DRAFT',
      data_json: JSON.stringify({}),
    });

    const res = await POST(makeReq(), { params: Promise.resolve({ caseId: 'case-1' }) });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.success).toBe(false);
    expect(Array.isArray(json.missingItems)).toBe(true);
    expect(String(json.error)).toContain('required');
  });

  it('returns 422 for clinical gate failure (WHO/Count must be Y)', async () => {
    mockAuthenticate.mockResolvedValueOnce({ success: true, user: { userId: 'u1', role: 'NURSE' } });

    const minimalButGateFail = {
      patientFileNo: 'FN-1',
      patientName: 'Jane Doe',
      date: '2026-01-01',
      doctor: 'Dr X',
      patientIdVerified: 'Y',
      informedConsentSigned: 'Y',
      preOpChecklistCompleted: 'Y',
      whoChecklistCompleted: 'N', // fails gate
      arrivedWithIVInfusing: 'Y',
      countCorrect: 'Y',
      scrubNurse: 'Scrub Name',
      circulatingNurse: 'Circ Name',
    };

    mockDb.clinicalFormResponse.findUnique.mockResolvedValueOnce({
      id: 'form-1',
      status: 'DRAFT',
      data_json: JSON.stringify(minimalButGateFail),
    });

    const res = await POST(makeReq(), { params: Promise.resolve({ caseId: 'case-1' }) });
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.success).toBe(false);
    expect(json.error).toContain('Clinical gate failure');
    expect(Array.isArray(json.missingItems)).toBe(true);
  });

  it('finalizes successfully and persists signed data', async () => {
    mockAuthenticate.mockResolvedValueOnce({ success: true, user: { userId: 'nurse-user-1', role: 'NURSE' } });

    const valid = {
      patientFileNo: 'FN-1',
      patientName: 'Jane Doe',
      date: '2026-01-01',
      doctor: 'Dr X',
      patientIdVerified: 'Y',
      informedConsentSigned: 'Y',
      preOpChecklistCompleted: 'Y',
      whoChecklistCompleted: 'Y',
      arrivedWithIVInfusing: 'Y',
      countCorrect: 'Y',
      scrubNurse: 'Scrub Name',
      circulatingNurse: 'Circ Name',
    };

    mockDb.clinicalFormResponse.findUnique.mockResolvedValueOnce({
      id: 'form-1',
      status: 'DRAFT',
      data_json: JSON.stringify(valid),
    });

    const res = await POST(makeReq(), { params: Promise.resolve({ caseId: 'case-1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    expect(mockDb.clinicalFormResponse.findUnique).toHaveBeenCalledWith({
      where: {
        template_key_template_version_surgical_case_id: {
          template_key: INTRAOP_TEMPLATE_KEY,
          template_version: INTRAOP_TEMPLATE_VERSION,
          surgical_case_id: 'case-1',
        },
      },
    });

    expect(tx.clinicalFormResponse.update).toHaveBeenCalledTimes(1);
    const updateArg = tx.clinicalFormResponse.update.mock.calls[0]![0];
    const persisted = JSON.parse(updateArg.data.data_json);
    expect(persisted.scrubNurseSignature).toMatch(/^data:image\//);
    expect(persisted.circulatingNurseSignature).toMatch(/^data:image\//);
    expect(persisted.signatureProof?.algorithm).toBe('sha256');
  });
});
