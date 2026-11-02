import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth/server-auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  default: {
    doctor: { findUnique: vi.fn() },
    appointment: { findUnique: vi.fn(), update: vi.fn() },
    consultation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    patientQueue: { update: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock('@/actions/frontdesk/get-dashboard-data', () => ({
  revalidateFrontdeskDashboard: vi.fn(),
}));

vi.mock('@/infrastructure/factories/ConsultationSessionFactory', () => ({
  createConsultationSession: vi.fn(),
  startConsultationSession: vi.fn(),
  resumeConsultationSession: vi.fn(),
  completeConsultationSession: vi.fn(),
  refreshPatientSession: vi.fn(),
  switchPatientSession: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth/server-auth';
import db from '@/lib/db';
import { saveCompletedNotes, saveDraft } from '@/actions/doctor/consultation-session';

const user = vi.mocked(getCurrentUser);
const doctorFind = vi.mocked(db.doctor.findUnique);
const appointmentFind = vi.mocked(db.appointment.findUnique);
const appointmentUpdate = vi.mocked(db.appointment.update);
const consultationFind = vi.mocked(db.consultation.findUnique);
const consultationUpdateMany = vi.mocked(db.consultation.updateMany);
const consultationCreate = vi.mocked(db.consultation.create);
const consultationUpdate = vi.mocked(db.consultation.update);
const queueUpdateMany = vi.mocked(db.patientQueue.updateMany);

const notes = {
  chiefComplaint: 'Headache',
  examination: 'Normal exam',
  assessment: 'Migraine',
  plan: 'Review',
};

function asDoctor() {
  user.mockResolvedValue({ userId: 'user-1', email: 'doctor@example.com', role: 'DOCTOR' } as any);
  doctorFind.mockResolvedValue({ id: 'doctor-1' } as any);
}

function openPair() {
  appointmentFind.mockResolvedValue({ id: 8, doctor_id: 'doctor-1' } as any);
  consultationFind.mockResolvedValue({
    id: 80,
    appointment_id: 8,
    doctor_id: 'doctor-1',
    completed_at: null,
  } as any);
}

describe('saveDraft authorization and target', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consultationUpdateMany.mockResolvedValue({ count: 1 } as any);
  });

  it('writes only the consultation paired with the appointment', async () => {
    asDoctor();
    openPair();

    const result = await saveDraft(8, 80, notes, 'CONSULTATION_ONLY', 'PENDING');

    expect(result.success).toBe(true);
    expect(consultationUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 80, appointment_id: 8, completed_at: null },
      data: expect.objectContaining({
        chief_complaint: 'Headache',
        examination: 'Normal exam',
        assessment: 'Migraine',
        plan: 'Review',
        doctor_notes: 'Headache\n\nNormal exam\n\nMigraine\n\nReview',
      }),
    }));
    expect(consultationCreate).not.toHaveBeenCalled();
    expect(consultationUpdate).not.toHaveBeenCalled();
    expect(appointmentUpdate).not.toHaveBeenCalled();
    expect(queueUpdateMany).not.toHaveBeenCalled();
    expect(consultationFind).toHaveBeenCalledWith(expect.objectContaining({
      where: { appointment_id: 8 },
    }));
  });

  it('writes nothing when the consultation id belongs to another appointment', async () => {
    asDoctor();
    appointmentFind.mockResolvedValue({ id: 8, doctor_id: 'doctor-1' } as any);
    consultationFind.mockResolvedValue({
      id: 80,
      appointment_id: 8,
      doctor_id: 'doctor-1',
      completed_at: null,
    } as any);

    const result = await saveDraft(8, 11, notes);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
    expect(consultationUpdateMany).not.toHaveBeenCalled();
    expect(consultationCreate).not.toHaveBeenCalled();
    expect(appointmentUpdate).not.toHaveBeenCalled();
    expect(queueUpdateMany).not.toHaveBeenCalled();
  });

  it('writes nothing when the appointment does not exist', async () => {
    asDoctor();
    appointmentFind.mockResolvedValue(null);

    const result = await saveDraft(8, 80, notes);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('APPOINTMENT_NOT_FOUND');
    expect(consultationUpdateMany).not.toHaveBeenCalled();
    expect(consultationCreate).not.toHaveBeenCalled();
    expect(appointmentUpdate).not.toHaveBeenCalled();
    expect(queueUpdateMany).not.toHaveBeenCalled();
  });

  it('writes nothing and creates nothing when the appointment has no consultation', async () => {
    asDoctor();
    appointmentFind.mockResolvedValue({ id: 8, doctor_id: 'doctor-1' } as any);
    consultationFind.mockResolvedValue(null);

    const result = await saveDraft(8, 80, notes);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('SESSION_NOT_FOUND');
    expect(consultationCreate).not.toHaveBeenCalled();
    expect(consultationUpdateMany).not.toHaveBeenCalled();
    expect(appointmentUpdate).not.toHaveBeenCalled();
    expect(queueUpdateMany).not.toHaveBeenCalled();
  });

  it('does not update a completed consultation', async () => {
    asDoctor();
    appointmentFind.mockResolvedValue({ id: 8, doctor_id: 'doctor-1' } as any);
    consultationFind.mockResolvedValue({
      id: 80,
      appointment_id: 8,
      doctor_id: 'doctor-1',
      completed_at: new Date('2026-01-02T00:00:00.000Z'),
    } as any);

    const result = await saveDraft(8, 80, notes);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('CONSULTATION_COMPLETED');
    expect(consultationUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects the save when the conditional update matches no open consultation', async () => {
    asDoctor();
    openPair();
    consultationUpdateMany.mockResolvedValue({ count: 0 } as any);

    const result = await saveDraft(8, 80, notes);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('CONSULTATION_COMPLETED');
    expect(consultationCreate).not.toHaveBeenCalled();
    expect(appointmentUpdate).not.toHaveBeenCalled();
  });

  it('rejects an authenticated doctor who does not own the appointment', async () => {
    user.mockResolvedValue({ userId: 'user-2', email: 'other@example.com', role: 'DOCTOR' } as any);
    doctorFind.mockResolvedValue({ id: 'doctor-2' } as any);
    openPair();

    const result = await saveDraft(8, 80, notes);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED');
    expect(consultationUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects a user with no doctor profile', async () => {
    user.mockResolvedValue({ userId: 'user-9', email: 'desk@example.com', role: 'FRONTDESK' } as any);
    doctorFind.mockResolvedValue(null);
    openPair();

    const result = await saveDraft(8, 80, notes);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED');
    expect(consultationUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects a signed-out caller', async () => {
    user.mockResolvedValue(null);

    const result = await saveDraft(8, 80, notes);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED');
    expect(appointmentFind).not.toHaveBeenCalled();
    expect(consultationUpdateMany).not.toHaveBeenCalled();
  });

  it('allows an administrator from the authenticated role to save', async () => {
    user.mockResolvedValue({ userId: 'admin-1', email: 'admin@example.com', role: 'ADMIN' } as any);
    doctorFind.mockResolvedValue(null);
    openPair();

    const result = await saveDraft(8, 80, notes);

    expect(result.success).toBe(true);
    expect(consultationUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('updates a completed consultation through saveCompletedNotes for the assigned doctor', async () => {
    asDoctor();
    appointmentFind.mockResolvedValue({ id: 8, doctor_id: 'doctor-1' } as any);
    consultationFind.mockResolvedValue({
      id: 80,
      appointment_id: 8,
      doctor_id: 'doctor-1',
      completed_at: new Date('2026-01-02T00:00:00.000Z'),
    } as any);
    consultationUpdateMany.mockResolvedValue({ count: 1 } as any);

    const result = await saveCompletedNotes(8, 80, notes);

    expect(result.success).toBe(true);
    expect(consultationUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 80, appointment_id: 8, completed_at: { not: null } },
      data: expect.objectContaining({
        chief_complaint: 'Headache',
        examination: 'Normal exam',
        assessment: 'Migraine',
        plan: 'Review',
      }),
    }));
  });
});
