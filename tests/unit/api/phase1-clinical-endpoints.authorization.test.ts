import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const hoisted = vi.hoisted(() => ({
  authenticate: vi.fn(),
  consultationFindUnique: vi.fn(),
  consultationFindFirst: vi.fn(),
  nurseAssignmentFindFirst: vi.fn(),
  doctorFindUnique: vi.fn(),
  patientFindFirst: vi.fn(),
  surgicalCaseFindUnique: vi.fn(),
  resolveCaseAccess: vi.fn(),
  inventoryItemFindMany: vi.fn(),
  transcribe: vi.fn(),
  refine: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  JwtMiddleware: { authenticate: (...args: unknown[]) => hoisted.authenticate(...args) },
}));

vi.mock('@/lib/db', () => ({
  default: {
    consultation: {
      findUnique: (...args: unknown[]) => hoisted.consultationFindUnique(...args),
      findFirst: (...args: unknown[]) => hoisted.consultationFindFirst(...args),
    },
    nurseAssignment: { findFirst: (...args: unknown[]) => hoisted.nurseAssignmentFindFirst(...args) },
    doctor: { findUnique: (...args: unknown[]) => hoisted.doctorFindUnique(...args) },
    patient: { findFirst: (...args: unknown[]) => hoisted.patientFindFirst(...args) },
    surgicalCase: { findUnique: (...args: unknown[]) => hoisted.surgicalCaseFindUnique(...args) },
    inventoryItem: { findMany: (...args: unknown[]) => hoisted.inventoryItemFindMany(...args) },
  },
}));

vi.mock('@/lib/doctor/surgicalCaseDocumentAccess', () => ({
  resolveDoctorCaseAccess: (...args: unknown[]) => hoisted.resolveCaseAccess(...args),
}));

vi.mock('openai', () => ({
  default: class OpenAIMock {
    audio = { transcriptions: { create: (...args: unknown[]) => hoisted.transcribe(...args) } };
    chat = { completions: { create: (...args: unknown[]) => hoisted.refine(...args) } };
  },
}));

import { GET as getInventoryStatus } from '@/app/api/nurse/surgical-cases/[caseId]/inventory-status/route';
import { GET as getDictationStatus, POST as postDictation } from '@/app/api/clinical/dictation/route';

function makeRequest(url: string, method = 'GET', body?: BodyInit): NextRequest {
  return new NextRequest(url, { method, body });
}

function makeDictationRequest(method = 'GET', body?: BodyInit, context = 'contextType=appointment&contextId=1'): NextRequest {
  const contextParams = new URLSearchParams(context);
  const headers = new Headers();
  const contextType = contextParams.get('contextType');
  const contextId = contextParams.get('contextId');
  if (contextType) headers.set('x-clinical-context-type', contextType);
  if (contextId) headers.set('x-clinical-context-id', contextId);
  return new NextRequest('http://localhost/api/clinical/dictation', { method, body, headers });
}

describe('phase 1 nurse inventory authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects anonymous requests before reading the surgical case', async () => {
    hoisted.authenticate.mockResolvedValue({ success: false, user: null });

    const response = await getInventoryStatus(makeRequest('http://localhost/api/nurse/surgical-cases/case-1/inventory-status'), {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    expect(response.status).toBe(401);
    expect(hoisted.surgicalCaseFindUnique).not.toHaveBeenCalled();
  });

  it('rejects roles outside the nurse inventory workflow', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-1', role: 'DOCTOR' } });

    const response = await getInventoryStatus(makeRequest('http://localhost/api/nurse/surgical-cases/case-1/inventory-status'), {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    expect(response.status).toBe(403);
    expect(hoisted.surgicalCaseFindUnique).not.toHaveBeenCalled();
  });

  it('preserves the authorized nurse workflow', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'nurse-1', role: 'NURSE' } });
    hoisted.surgicalCaseFindUnique.mockResolvedValue({ case_plan: null });

    const response = await getInventoryStatus(makeRequest('http://localhost/api/nurse/surgical-cases/case-1/inventory-status'), {
      params: Promise.resolve({ caseId: 'case-1' }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'NOT_REQUIRED' });
  });
});

describe('phase 1 clinical dictation authorization', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('OPENAI_API_KEY', 'unit-test-key');
    hoisted.consultationFindFirst.mockResolvedValue({
      id: 11,
      appointment_id: 1,
      doctor: { user_id: 'doctor-1' },
    });
    hoisted.nurseAssignmentFindFirst.mockResolvedValue({ id: 1 });
    hoisted.transcribe.mockResolvedValue({ text: 'raw transcript' });
    hoisted.refine.mockResolvedValue({ choices: [{ message: { content: 'refined transcript' } }] });
  });

  it('rejects anonymous availability and transcription requests', async () => {
    hoisted.authenticate.mockResolvedValue({ success: false, user: null });

    const statusResponse = await getDictationStatus(makeDictationRequest());
    const postBody = new FormData();
    postBody.append('audio', new Blob(['audio']), 'record.webm');
    const transcriptionResponse = await postDictation(makeDictationRequest('POST', postBody));

    expect(statusResponse.status).toBe(401);
    expect(transcriptionResponse.status).toBe(401);
    expect(hoisted.transcribe).not.toHaveBeenCalled();
    expect(hoisted.refine).not.toHaveBeenCalled();
  });

  it('rejects non-clinical roles before reading audio or invoking providers', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'frontdesk-1', role: 'FRONTDESK' } });
    const body = new FormData();
    body.append('audio', new Blob(['audio']), 'record.webm');

    const response = await postDictation(makeDictationRequest('POST', body));

    expect(response.status).toBe(403);
    expect(hoisted.transcribe).not.toHaveBeenCalled();
    expect(hoisted.refine).not.toHaveBeenCalled();
  });

  it('allows clinical dictation and preserves transcription/refinement', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-1', role: 'DOCTOR' } });
    const body = new FormData();
    body.append('audio', new Blob(['audio']), 'record.webm');
    body.append('context', 'Examination');

    const response = await postDictation(makeDictationRequest('POST', body));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.text).toBe('refined transcript');
    expect(hoisted.transcribe).toHaveBeenCalledOnce();
    expect(hoisted.refine).toHaveBeenCalledOnce();
  });

  it('rejects missing context before reading or processing audio', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-1', role: 'DOCTOR' } });
    const body = new FormData();
    body.append('audio', new Blob(['audio']), 'record.webm');

    const response = await postDictation(makeRequest('http://localhost/api/clinical/dictation', 'POST', body));

    expect(response.status).toBe(400);
    expect(hoisted.transcribe).not.toHaveBeenCalled();
  });

  it('rejects a doctor who does not own the active appointment', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-2', role: 'DOCTOR' } });
    const body = new FormData();
    body.append('audio', new Blob(['audio']), 'record.webm');

    const response = await postDictation(makeDictationRequest('POST', body));

    expect(response.status).toBe(404);
    expect(hoisted.transcribe).not.toHaveBeenCalled();
  });

  it('rejects a completed consultation', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-1', role: 'DOCTOR' } });
    hoisted.consultationFindFirst.mockResolvedValue(null);
    const body = new FormData();
    body.append('audio', new Blob(['audio']), 'record.webm');

    const response = await postDictation(makeDictationRequest('POST', body));

    expect(response.status).toBe(404);
    expect(hoisted.transcribe).not.toHaveBeenCalled();
  });

  it('rejects a completed consultation ID directly', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-1', role: 'DOCTOR' } });
    hoisted.consultationFindUnique.mockResolvedValue({
      id: 11,
      completed_at: new Date(),
      appointment_id: 1,
      doctor: { user_id: 'doctor-1' },
      appointment: { status: 'IN_CONSULTATION' },
    });
    const body = new FormData();
    body.append('audio', new Blob(['audio']), 'record.webm');

    const response = await postDictation(makeDictationRequest('POST', body, 'contextType=consultation&contextId=11'));

    expect(response.status).toBe(404);
    expect(hoisted.transcribe).not.toHaveBeenCalled();
  });

  it('allows an assigned nurse in an active appointment context', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'nurse-1', role: 'NURSE' } });
    const body = new FormData();
    body.append('audio', new Blob(['audio']), 'record.webm');

    const response = await postDictation(makeDictationRequest('POST', body));

    expect(response.status).toBe(200);
    expect(hoisted.nurseAssignmentFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { appointment_id: 1, nurse_user_id: 'nurse-1' },
    }));
  });

  it('allows a doctor to dictate in an editable surgical case they belong to', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-1', role: 'DOCTOR' } });
    hoisted.resolveCaseAccess.mockResolvedValue({ canEdit: true });
    hoisted.surgicalCaseFindUnique.mockResolvedValue({ status: 'PLANNING' });
    const body = new FormData();
    body.append('audio', new Blob(['audio']), 'record.webm');

    const response = await postDictation(makeDictationRequest('POST', body, 'contextType=case&contextId=case-1'));

    expect(response.status).toBe(200);
    expect(hoisted.resolveCaseAccess).toHaveBeenCalledWith('doctor-1', 'case-1');
  });

  it('rejects a surgical case that is completed or cancelled', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-1', role: 'DOCTOR' } });
    hoisted.resolveCaseAccess.mockResolvedValue({ canEdit: true });
    hoisted.surgicalCaseFindUnique.mockResolvedValue({ status: 'COMPLETED' });
    const body = new FormData();
    body.append('audio', new Blob(['audio']), 'record.webm');

    const response = await postDictation(makeDictationRequest('POST', body, 'contextType=case&contextId=case-1'));

    expect(response.status).toBe(404);
    expect(hoisted.transcribe).not.toHaveBeenCalled();
  });

  it('requires a doctor-patient assignment or appointment for patient-note dictation', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-1', role: 'DOCTOR' } });
    hoisted.doctorFindUnique.mockResolvedValue({ id: 'doctor-profile-1' });
    hoisted.patientFindFirst.mockResolvedValue(null);
    const body = new FormData();
    body.append('audio', new Blob(['audio']), 'record.webm');

    const response = await postDictation(makeDictationRequest('POST', body, 'contextType=patient&contextId=patient-1'));

    expect(response.status).toBe(404);
    expect(hoisted.transcribe).not.toHaveBeenCalled();
  });

  it('allows patient-note dictation only for an active doctor-patient assignment', async () => {
    hoisted.authenticate.mockResolvedValue({ success: true, user: { userId: 'doctor-1', role: 'DOCTOR' } });
    hoisted.doctorFindUnique.mockResolvedValue({ id: 'doctor-profile-1' });
    hoisted.patientFindFirst.mockResolvedValue({ id: 'patient-1' });
    const body = new FormData();
    body.append('audio', new Blob(['audio']), 'record.webm');

    const response = await postDictation(makeDictationRequest('POST', body, 'contextType=patient&contextId=patient-1'));

    expect(response.status).toBe(200);
    expect(hoisted.patientFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'patient-1',
        patient_assignments: { some: { doctor_id: 'doctor-profile-1', status: 'ACTIVE' } },
      },
      select: { id: true },
    });
  });
});