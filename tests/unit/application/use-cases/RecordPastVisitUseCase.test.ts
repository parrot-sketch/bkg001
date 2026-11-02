import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { Patient } from '../../../../domain/entities/Patient';
import { Gender } from '../../../../domain/enums/Gender';
import { Role } from '../../../../domain/enums/Role';
import { DomainException } from '../../../../domain/exceptions/DomainException';
import { ForbiddenError } from '../../../../application/errors/ForbiddenError';
import { ConflictError } from '../../../../application/errors/ConflictError';
import { PAST_VISIT_MAX_DAYS } from '../../../../application/dtos/RecordPastVisitRequest';

vi.mock('@/lib/use-case-factory', () => ({
  UseCaseFactory: {
    validatePrismaClient: vi.fn(),
    getPrismaClient: vi.fn(),
  },
}));

import { RecordPastVisitUseCase } from '../../../../application/use-cases/RecordPastVisitUseCase';

describe('RecordPastVisitUseCase', () => {
  let mockPatientRepository: { findById: Mock };
  let mockAuditService: { recordEvent: Mock };
  let mockTimeService: { now: Mock; today: Mock };
  let mockPrisma: {
    doctor: { findUnique: Mock };
    appointment: { findFirst: Mock; create: Mock };
  };
  let useCase: RecordPastVisitUseCase;

  const patientId = '11111111-1111-1111-1111-111111111111';
  const doctorId = '22222222-2222-2222-2222-222222222222';
  const userId = '33333333-3333-3333-3333-333333333333';

  const mockPatient = Patient.create({
    id: patientId,
    fileNumber: 'NS001',
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-01'),
    gender: Gender.FEMALE,
    email: 'jane@example.com',
    phone: '0700000000',
    address: 'Nairobi',
    maritalStatus: 'Single',
    emergencyContactName: 'John',
    emergencyContactNumber: '0700000001',
    relation: 'Spouse',
    privacyConsent: true,
    serviceConsent: true,
    medicalConsent: true,
  });

  const baseDto = {
    patientId,
    doctorId,
    appointmentDate: new Date('2026-10-31'), // Saturday before Monday Nov 2
    time: '10:00',
    type: 'Initial Consultation',
    lateEntryNote: 'Saturday clinic notes entered Monday',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPatientRepository = {
      findById: vi.fn().mockResolvedValue(mockPatient),
    };
    mockAuditService = {
      recordEvent: vi.fn().mockResolvedValue(undefined),
    };
    mockTimeService = {
      now: vi.fn().mockReturnValue(new Date('2026-11-02T12:00:00')),
      today: vi.fn().mockReturnValue(new Date('2026-11-02')),
    };
    mockPrisma = {
      doctor: {
        findUnique: vi.fn().mockResolvedValue({
          id: doctorId,
          name: 'Dr Smith',
          specialization: 'Plastic Surgery',
        }),
      },
      appointment: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 42,
          patient_id: patientId,
          doctor_id: doctorId,
          appointment_date: new Date('2026-10-31'),
          time: '10:00',
          status: 'COMPLETED',
          type: 'Initial Consultation',
          note: '[Late entry] Saturday clinic notes entered Monday',
          reason: 'Saturday clinic notes entered Monday',
          created_at: new Date('2026-11-02T12:00:00'),
          updated_at: new Date('2026-11-02T12:00:00'),
          checked_in_at: new Date('2026-10-31T10:00:00'),
          checked_in_by: userId,
          consultation_started_at: new Date('2026-10-31T10:00:00'),
          consultation_ended_at: new Date('2026-10-31T10:30:00'),
          consultation_duration: 30,
          patient: {
            id: patientId,
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'jane@example.com',
            phone: '0700000000',
            file_number: 'NS001',
          },
          doctor: {
            id: doctorId,
            name: 'Dr Smith',
            specialization: 'Plastic Surgery',
          },
        }),
      },
    };

    useCase = new RecordPastVisitUseCase(
      mockPatientRepository as any,
      mockAuditService as any,
      mockTimeService as any,
      mockPrisma as any,
    );
  });

  it('creates a COMPLETED late-entry appointment within the window', async () => {
    const result = await useCase.execute(baseDto, userId, Role.FRONTDESK);

    expect(result.id).toBe(42);
    expect(result.status).toBe('COMPLETED');
    expect(mockPrisma.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          source: 'FRONTDESK_SCHEDULED',
          type: 'Initial Consultation',
          note: '[Late entry] Saturday clinic notes entered Monday',
        }),
      }),
    );
    expect(mockAuditService.recordEvent).toHaveBeenCalled();
  });

  it('rejects roles other than FRONTDESK/ADMIN', async () => {
    await expect(useCase.execute(baseDto, userId, Role.DOCTOR)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('rejects today or future dates', async () => {
    await expect(
      useCase.execute(
        { ...baseDto, appointmentDate: new Date('2026-11-02') },
        userId,
        Role.FRONTDESK,
      ),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it(`rejects dates older than ${PAST_VISIT_MAX_DAYS} days`, async () => {
    await expect(
      useCase.execute(
        { ...baseDto, appointmentDate: new Date('2026-10-20') },
        userId,
        Role.FRONTDESK,
      ),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('rejects when patient already has an appointment that day', async () => {
    mockPrisma.appointment.findFirst.mockResolvedValueOnce({
      id: 9,
      status: 'SCHEDULED',
      time: '09:00',
    });

    await expect(useCase.execute(baseDto, userId, Role.FRONTDESK)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
  });
});
