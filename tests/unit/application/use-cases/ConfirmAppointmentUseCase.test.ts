import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfirmAppointmentUseCase } from '../../../../application/use-cases/ConfirmAppointmentUseCase';
import type { IAppointmentRepository } from '../../../../domain/interfaces/repositories/IAppointmentRepository';
import type { IPatientRepository } from '../../../../domain/interfaces/repositories/IPatientRepository';
import type { INotificationService } from '../../../../domain/interfaces/services/INotificationService';
import type { IAuditService } from '../../../../domain/interfaces/services/IAuditService';
import type { ITimeService } from '../../../../domain/interfaces/services/ITimeService';
import { Appointment } from '../../../../domain/entities/Appointment';
import { Patient } from '../../../../domain/entities/Patient';
import { AppointmentStatus } from '../../../../domain/enums/AppointmentStatus';
import { Gender } from '../../../../domain/enums/Gender';
import { DomainException } from '../../../../domain/exceptions/DomainException';

describe('ConfirmAppointmentUseCase', () => {
  const pendingRequest = Appointment.create({
    id: 7,
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    appointmentDate: new Date('2027-06-15'),
    time: '10:00',
    status: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
    type: 'Consultation',
    createdAt: new Date(),
  });

  const patient = Patient.create({
    id: 'patient-1',
    fileNumber: 'NS001',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-01'),
    gender: Gender.MALE,
    email: 'john.doe@example.com',
    phone: '1234567890',
    address: '123 Main St',
    maritalStatus: 'Single',
    emergencyContactName: 'Jane Doe',
    emergencyContactNumber: '0987654321',
    relation: 'Spouse',
    privacyConsent: true,
    serviceConsent: true,
    medicalConsent: true,
  });

  let appointmentRepository: { findById: ReturnType<typeof vi.fn>; hasConflict: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let useCase: ConfirmAppointmentUseCase;

  beforeEach(() => {
    appointmentRepository = {
      findById: vi.fn().mockResolvedValue(pendingRequest),
      hasConflict: vi.fn().mockResolvedValue(false),
      update: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new ConfirmAppointmentUseCase(
      appointmentRepository as unknown as IAppointmentRepository,
      { findById: vi.fn().mockResolvedValue(patient) } as unknown as IPatientRepository,
      { sendEmail: vi.fn(), sendSMS: vi.fn(), sendInApp: vi.fn() } as unknown as INotificationService,
      { recordEvent: vi.fn() } as unknown as IAuditService,
      { now: vi.fn().mockReturnValue(new Date('2027-06-01')), today: vi.fn() } as unknown as ITimeService,
    );
  });

  it('refuses to confirm a request when the doctor already holds that time', async () => {
    appointmentRepository.hasConflict.mockResolvedValue(true);

    await expect(
      useCase.execute({ appointmentId: 7, action: 'confirm' }, 'doctor-user-1'),
    ).rejects.toThrow(DomainException);

    expect(appointmentRepository.hasConflict).toHaveBeenCalledWith('doctor-1', pendingRequest.getAppointmentDate(), '10:00');
    expect(appointmentRepository.update).not.toHaveBeenCalled();
  });

  it('does not check the doctor time when rejecting a request', async () => {
    appointmentRepository.hasConflict.mockResolvedValue(true);

    await useCase.execute(
      { appointmentId: 7, action: 'reject', rejectionReason: 'Out of office' },
      'doctor-user-1',
    );

    expect(appointmentRepository.hasConflict).not.toHaveBeenCalled();
    expect(appointmentRepository.update).toHaveBeenCalledOnce();
  });
});
