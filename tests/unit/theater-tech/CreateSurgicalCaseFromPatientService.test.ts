import { describe, expect, it, vi } from 'vitest';
import { InviteStatus, SurgicalCaseStatus, SurgicalRole } from '@prisma/client';
import {
  createSurgicalCaseFromPatient,
} from '@/application/services/theater-tech/CreateSurgicalCaseFromPatientService';

type MockDb = {
  surgicalCase: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  patient: { findUnique: ReturnType<typeof vi.fn> };
  doctor: { findUnique: ReturnType<typeof vi.fn> };
  staffInvite: { upsert: ReturnType<typeof vi.fn> };
  notification: { create: ReturnType<typeof vi.fn> };
};

function makeDb(): MockDb {
  return {
    surgicalCase: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    patient: { findUnique: vi.fn() },
    doctor: { findUnique: vi.fn() },
    staffInvite: { upsert: vi.fn() },
    notification: { create: vi.fn() },
  };
}

describe('createSurgicalCaseFromPatient', () => {
  it('returns existing case when appointmentId already linked', async () => {
    const db = makeDb();
    db.surgicalCase.findUnique.mockResolvedValue({ id: 'case_1' });

    const res = await createSurgicalCaseFromPatient(db as any, {
      patientId: 'p1',
      createdByUserId: 'u1',
      appointmentId: 123,
    });

    expect(res).toEqual({ surgicalCaseId: 'case_1', alreadyExisted: true });
    expect(db.surgicalCase.create).not.toHaveBeenCalled();
  });

  it('throws when patient not found', async () => {
    const db = makeDb();
    db.surgicalCase.findUnique.mockResolvedValue(null);
    db.patient.findUnique.mockResolvedValue(null);

    await expect(
      createSurgicalCaseFromPatient(db as any, {
        patientId: 'missing',
        createdByUserId: 'u1',
      }),
    ).rejects.toThrow('Patient not found');
  });

  it('creates case and bootstraps invite + notification when surgeon has linked user', async () => {
    const db = makeDb();
    db.surgicalCase.findUnique.mockResolvedValue(null);
    db.patient.findUnique.mockResolvedValue({ id: 'p1', first_name: 'Jane', last_name: 'Doe' });
    db.surgicalCase.create.mockResolvedValue({ id: 'case_1', patient_id: 'p1', primary_surgeon_id: 'd1' });
    db.doctor.findUnique.mockResolvedValue({ user_id: 'doc_user_1' });
    db.staffInvite.upsert.mockResolvedValue({ id: 'invite_1' });
    db.notification.create.mockResolvedValue({ id: 1 });

    const res = await createSurgicalCaseFromPatient(db as any, {
      patientId: 'p1',
      createdByUserId: 'u1',
      primarySurgeonDoctorId: 'd1',
      procedureDate: new Date('2026-04-26T00:00:00.000Z'),
      status: SurgicalCaseStatus.DRAFT,
    });

    expect(res).toEqual({ surgicalCaseId: 'case_1', alreadyExisted: false });
    expect(db.staffInvite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          surgical_case_id_invited_user_id_invited_role: {
            surgical_case_id: 'case_1',
            invited_user_id: 'doc_user_1',
            invited_role: SurgicalRole.SURGEON,
          },
        },
        create: expect.objectContaining({
          status: InviteStatus.ACCEPTED,
        }),
        update: expect.objectContaining({
          status: InviteStatus.ACCEPTED,
        }),
      }),
    );
    expect(db.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user_id: 'doc_user_1',
          subject: 'New Surgical Case',
        }),
      }),
    );
  });

  it('creates case without invite when surgeon has no user account', async () => {
    const db = makeDb();
    db.surgicalCase.findUnique.mockResolvedValue(null);
    db.patient.findUnique.mockResolvedValue({ id: 'p1', first_name: 'Jane', last_name: 'Doe' });
    db.surgicalCase.create.mockResolvedValue({ id: 'case_1', patient_id: 'p1', primary_surgeon_id: 'd1' });
    db.doctor.findUnique.mockResolvedValue({ user_id: null });

    await createSurgicalCaseFromPatient(db as any, {
      patientId: 'p1',
      createdByUserId: 'u1',
      primarySurgeonDoctorId: 'd1',
    });

    expect(db.staffInvite.upsert).not.toHaveBeenCalled();
    expect(db.notification.create).not.toHaveBeenCalled();
  });
});
