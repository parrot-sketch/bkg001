import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CompleteConsultationUseCase } from '../../../../application/use-cases/CompleteConsultationUseCase';
import { CompleteConsultationDto } from '../../../../application/dtos/CompleteConsultationDto';
import type { IAppointmentRepository } from '../../../../domain/interfaces/repositories/IAppointmentRepository';
import type { IPatientRepository } from '../../../../domain/interfaces/repositories/IPatientRepository';
import type { INotificationService } from '../../../../domain/interfaces/services/INotificationService';
import type { IAuditService } from '../../../../domain/interfaces/services/IAuditService';
import { Appointment } from '../../../../domain/entities/Appointment';
import { Consultation } from '../../../../domain/entities/Consultation';
import { Patient } from '../../../../domain/entities/Patient';
import { AppointmentStatus } from '../../../../domain/enums/AppointmentStatus';
import { Gender } from '../../../../domain/enums/Gender';
import { ConsultationOutcomeType } from '../../../../domain/enums/ConsultationOutcomeType';
import { PatientDecision } from '../../../../domain/enums/PatientDecision';
import { DomainException } from '../../../../domain/exceptions/DomainException';
import { ConsultationNotes } from '../../../../domain/value-objects/ConsultationNotes';
import { ConsultationMapper } from '../../../../infrastructure/mappers/ConsultationMapper';
import db from '@/lib/db';

// Mock the direct db import used by the use case for billing / doctor lookup
vi.mock('@/lib/db', () => ({
  default: {
    $transaction: vi.fn(async (callback: (tx: {
      appointment: {
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
    }) => Promise<unknown>) => callback({
      appointment: {
        findUnique: vi.fn().mockResolvedValue({ consultation_started_at: new Date('2026-01-01T09:00:00.000Z') }),
        update: vi.fn().mockResolvedValue({ id: 1 }),
      },
    })),
    appointment: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    patientBill: {
      deleteMany: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: 1 }),
    },
    payment: {
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({ id: 1 }),
    },
    doctor: {
      findUnique: vi.fn().mockResolvedValue({ consultation_fee: 5000 }),
    },
    service: {
      findFirst: vi.fn().mockResolvedValue({ id: 4 }),
      create: vi.fn(),
    },
    patientQueue: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

describe('CompleteConsultationUseCase', () => {
  let mockAppointmentRepository: {
    findById: Mock;
    findByPatient: Mock;
    save: Mock;
    update: Mock;
  };
  let mockPatientRepository: {
    findById: Mock;
    findByEmail: Mock;
    save: Mock;
    update: Mock;
  };
  let mockNotificationService: {
    sendEmail: Mock;
    sendSMS: Mock;
  };
  let mockAuditService: {
    recordEvent: Mock;
  };
  let useCase: CompleteConsultationUseCase;

  const validDto: CompleteConsultationDto = {
    appointmentId: 1,
    doctorId: 'doctor-1',
    outcome: 'Patient diagnosed with migraine. Prescribed medication.',
    outcomeType: ConsultationOutcomeType.CONSULTATION_ONLY,
  };

  const mockPatient = Patient.create({
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

  beforeEach(() => {
    mockAppointmentRepository = {
      findById: vi.fn(),
      findByPatient: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      update: vi.fn(),
    };

    mockPatientRepository = {
      findById: vi.fn().mockResolvedValue(mockPatient),
      findByEmail: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    };

    mockNotificationService = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
      sendSMS: vi.fn(),
    };

    mockAuditService = {
      recordEvent: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new CompleteConsultationUseCase(
      mockAppointmentRepository as unknown as IAppointmentRepository,
      mockPatientRepository as unknown as IPatientRepository,
      mockNotificationService as unknown as INotificationService,
      mockAuditService as unknown as IAuditService,
    );
  });

  describe('execute', () => {
    it('should complete consultation successfully', async () => {
      // Arrange
      const scheduledAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.SCHEDULED,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(scheduledAppointment);
      mockAppointmentRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(validDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(AppointmentStatus.COMPLETED);
      expect(result.note).toContain('Consultation Completed');
      expect(result.note).toContain(validDto.outcome);
      expect(mockAppointmentRepository.update).toHaveBeenCalledOnce();
      expect(mockNotificationService.sendEmail).toHaveBeenCalledOnce();
      expect(mockAuditService.recordEvent).toHaveBeenCalledOnce();
    });

    it('should schedule follow-up appointment if provided', async () => {
      // Arrange
      // Use a future date that won't expire
      const futureFollowUpDate = new Date();
      futureFollowUpDate.setMonth(futureFollowUpDate.getMonth() + 3);

      const scheduledAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00',
        status: AppointmentStatus.SCHEDULED,
        type: 'Consultation',
      });

      const followUpAppointment = Appointment.create({
        id: 2,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: futureFollowUpDate,
        time: '14:00',
        status: AppointmentStatus.PENDING,
        type: 'Follow-up',
        note: `Follow-up appointment for appointment 1`,
        createdAt: new Date(),
      });

      const dtoWithFollowUp: CompleteConsultationDto = {
        ...validDto,
        followUpDate: futureFollowUpDate,
        followUpTime: '14:00',
        followUpType: 'Follow-up',
      };

      mockAppointmentRepository.findById.mockResolvedValue(scheduledAppointment);
      mockAppointmentRepository.update.mockResolvedValue(undefined);
      mockAppointmentRepository.save.mockResolvedValue(undefined);
      mockAppointmentRepository.findByPatient.mockResolvedValue([followUpAppointment]);

      // Act
      const result = await useCase.execute(dtoWithFollowUp);

      // Assert
      expect(result.status).toBe(AppointmentStatus.COMPLETED);
      expect(mockAppointmentRepository.save).toHaveBeenCalledOnce(); // Follow-up created
      expect(mockNotificationService.sendEmail).toHaveBeenCalled();
    });

    it('should throw DomainException if follow-up date is in the past', async () => {
      const scheduledAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.SCHEDULED,
        type: 'Consultation',
      });

      const dtoWithPastFollowUp: CompleteConsultationDto = {
        ...validDto,
        followUpDate: new Date('2024-01-01'), // Past date
        followUpTime: '2:00 PM',
        followUpType: 'Follow-up',
      };

      mockAppointmentRepository.findById.mockResolvedValue(scheduledAppointment);

      await expect(useCase.execute(dtoWithPastFollowUp)).rejects.toThrow(DomainException);
      await expect(useCase.execute(dtoWithPastFollowUp)).rejects.toThrow('future');
    });

    it('should throw DomainException if appointment is already completed', async () => {
      const completedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.COMPLETED,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(completedAppointment);

      await expect(useCase.execute(validDto)).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto)).rejects.toThrow('already completed');
    });

    it('should handle notification failure gracefully', async () => {
      const scheduledAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.SCHEDULED,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(scheduledAppointment);
      mockAppointmentRepository.update.mockResolvedValue(undefined);
      mockNotificationService.sendEmail.mockRejectedValue(new Error('Email service down'));

      // Should not throw
      const result = await useCase.execute(validDto);

      expect(result.status).toBe(AppointmentStatus.COMPLETED);
      expect(mockAuditService.recordEvent).toHaveBeenCalledOnce();
    });

    it('should throw DomainException if doctor ID does not match', async () => {
      const appointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-2', // Different doctor
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.SCHEDULED,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(appointment);

      await expect(useCase.execute(validDto)).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto)).rejects.toThrow('not assigned');
    });
  });

  describe('structured notes survive completion', () => {
    function inProgressConsultation(notes: ConsultationNotes) {
      return Consultation.create({
        id: 42,
        appointmentId: 1,
        doctorId: 'doctor-1',
        userId: 'user-1',
      })
        .start('user-1', new Date('2026-01-01T09:00:00.000Z'))
        .updateDraft({
          notes,
          outcomeType: ConsultationOutcomeType.CONSULTATION_ONLY,
          patientDecision: PatientDecision.PENDING,
        });
    }

    function useCaseWithConsultation(consultation: Consultation) {
      let persisted: Consultation | null = null;
      const consultationRepository = {
        findByAppointmentId: vi.fn().mockResolvedValue(consultation),
        update: vi.fn(async (value: Consultation) => {
          persisted = value;
        }),
      };
      const completing = new CompleteConsultationUseCase(
        mockAppointmentRepository as unknown as IAppointmentRepository,
        mockPatientRepository as unknown as IPatientRepository,
        mockNotificationService as unknown as INotificationService,
        mockAuditService as unknown as IAuditService,
        undefined,
        undefined,
        undefined,
        undefined,
        consultationRepository as any,
      );
      return {
        completing,
        readPersisted: () => persisted,
      };
    }

    beforeEach(() => {
      const scheduledAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.SCHEDULED,
        type: 'Consultation',
      });
      mockAppointmentRepository.findById.mockResolvedValue(scheduledAppointment);
      mockAppointmentRepository.update.mockReset();
      mockAppointmentRepository.update.mockResolvedValue(undefined);
      vi.mocked(db.patientQueue.updateMany).mockClear();
      vi.mocked(db.appointment.update).mockClear();
      vi.mocked(db.$transaction).mockReset();
      vi.mocked(db.$transaction).mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback({
        appointment: {
          findUnique: vi.fn().mockResolvedValue({ consultation_started_at: new Date('2026-01-01T09:00:00.000Z') }),
          update: vi.fn().mockResolvedValue({ id: 1 }),
        },
      }));
    });

    it('keeps structured fields, outcome, and the queue completion when the request omits them', async () => {
      const structured = ConsultationNotes.createStructured({
        chiefComplaint: 'Headache',
        examination: 'Normal exam',
        assessment: 'Migraine',
        plan: 'Review in two weeks',
      });
      const { completing, readPersisted } = useCaseWithConsultation(inProgressConsultation(structured));

      const result = await completing.execute({
        appointmentId: 1,
        doctorId: 'doctor-1',
        outcome: '',
      });

      const written = ConsultationMapper.toPrismaUpdateInput(readPersisted()!);
      expect(written.chief_complaint).toBe('Headache');
      expect(written.examination).toBe('Normal exam');
      expect(written.assessment).toBe('Migraine');
      expect(written.plan).toBe('Review in two weeks');
      expect(written.doctor_notes).toBe(structured.toFullText());
      expect(written.completed_at).toBeInstanceOf(Date);
      expect(written.outcome_type).toBe(ConsultationOutcomeType.CONSULTATION_ONLY);
      expect(written.patient_decision).toBe(PatientDecision.PENDING);
      expect(result.status).toBe(AppointmentStatus.COMPLETED);
      expect(db.patientQueue.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          appointment_id: 1,
          status: { in: ['WAITING', 'IN_CONSULTATION'] },
        }),
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }));
    });

    it('applies an explicitly supplied outcome and patient decision', async () => {
      const structured = ConsultationNotes.createStructured({
        chiefComplaint: 'Headache',
        examination: 'Normal exam',
        assessment: 'Migraine',
        plan: 'Review in two weeks',
      });
      const { completing, readPersisted } = useCaseWithConsultation(inProgressConsultation(structured));

      await completing.execute({
        appointmentId: 1,
        doctorId: 'doctor-1',
        outcome: 'Reviewed',
        outcomeType: ConsultationOutcomeType.PROCEDURE_RECOMMENDED,
        patientDecision: PatientDecision.YES,
      });

      const written = ConsultationMapper.toPrismaUpdateInput(readPersisted()!);
      expect(written.chief_complaint).toBe('Headache');
      expect(written.outcome_type).toBe(ConsultationOutcomeType.PROCEDURE_RECOMMENDED);
      expect(written.patient_decision).toBe(PatientDecision.YES);
      expect(written.doctor_notes).toBe(structured.toFullText());
    });

    it('stops completion when the consultation record cannot be saved', async () => {
      const structured = ConsultationNotes.createStructured({
        chiefComplaint: 'Headache',
        examination: 'Normal exam',
        assessment: 'Migraine',
        plan: 'Review in two weeks',
      });
      const consultation = inProgressConsultation(structured);
      const consultationRepository = {
        findByAppointmentId: vi.fn().mockResolvedValue(consultation),
        update: vi.fn().mockRejectedValue(new Error('database unavailable')),
      };
      const completing = new CompleteConsultationUseCase(
        mockAppointmentRepository as unknown as IAppointmentRepository,
        mockPatientRepository as unknown as IPatientRepository,
        mockNotificationService as unknown as INotificationService,
        mockAuditService as unknown as IAuditService,
        undefined,
        undefined,
        undefined,
        undefined,
        consultationRepository as any,
      );

      const appointmentWritesBefore = vi.mocked(db.appointment.update).mock.calls.length;
      const queueWritesBefore = vi.mocked(db.patientQueue.updateMany).mock.calls.length;

      await expect(completing.execute({
        appointmentId: 1,
        doctorId: 'doctor-1',
        outcome: 'Reviewed',
      })).rejects.toThrow(/clinical note was not saved/);

      expect(consultationRepository.update).toHaveBeenCalledTimes(1);
      expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
      expect(vi.mocked(db.appointment.update).mock.calls.length).toBe(appointmentWritesBefore);
      expect(vi.mocked(db.patientQueue.updateMany).mock.calls.length).toBe(queueWritesBefore);
      expect(mockNotificationService.sendEmail).not.toHaveBeenCalled();
      expect(mockAuditService.recordEvent).not.toHaveBeenCalled();
      expect(consultation.getNotes()?.toFullText()).toBe(structured.toFullText());
    });

    it('retries completion after the consultation write starts succeeding', async () => {
      const structured = ConsultationNotes.createStructured({
        chiefComplaint: 'Headache',
        examination: 'Normal exam',
        assessment: 'Migraine',
        plan: 'Review in two weeks',
      });
      let fail = true;
      let persisted: Consultation | null = null;
      const consultationRepository = {
        findByAppointmentId: vi.fn().mockResolvedValue(inProgressConsultation(structured)),
        update: vi.fn(async (value: Consultation) => {
          if (fail) throw new Error('database unavailable');
          persisted = value;
        }),
      };
      const completing = new CompleteConsultationUseCase(
        mockAppointmentRepository as unknown as IAppointmentRepository,
        mockPatientRepository as unknown as IPatientRepository,
        mockNotificationService as unknown as INotificationService,
        mockAuditService as unknown as IAuditService,
        undefined,
        undefined,
        undefined,
        undefined,
        consultationRepository as any,
      );
      const dto = { appointmentId: 1, doctorId: 'doctor-1', outcome: 'Reviewed' };

      await expect(completing.execute(dto)).rejects.toThrow(/clinical note was not saved/);
      expect(mockAppointmentRepository.update).not.toHaveBeenCalled();

      fail = false;
      const result = await completing.execute(dto);

      expect(result.status).toBe(AppointmentStatus.COMPLETED);
      expect(consultationRepository.update).toHaveBeenCalledTimes(2);
      expect(mockAppointmentRepository.update).toHaveBeenCalledTimes(1);
      expect(db.patientQueue.updateMany).toHaveBeenCalledTimes(1);
      const written = ConsultationMapper.toPrismaUpdateInput(persisted!);
      expect(written.chief_complaint).toBe('Headache');
      expect(written.doctor_notes).toBe(structured.toFullText());
      expect(written.completed_at).toBeInstanceOf(Date);
    });

    it('does not rewrite a consultation that is already finalized', async () => {
      const structured = ConsultationNotes.createStructured({
        chiefComplaint: 'Headache',
        examination: 'Normal exam',
        assessment: 'Migraine',
        plan: 'Review in two weeks',
      });
      const finalized = inProgressConsultation(structured).complete({
        notes: structured,
        outcomeType: ConsultationOutcomeType.CONSULTATION_ONLY,
        patientDecision: PatientDecision.PENDING,
        completedAt: new Date('2026-01-01T10:00:00.000Z'),
      });
      const consultationRepository = {
        findByAppointmentId: vi.fn().mockResolvedValue(finalized),
        update: vi.fn(),
      };
      const completing = new CompleteConsultationUseCase(
        mockAppointmentRepository as unknown as IAppointmentRepository,
        mockPatientRepository as unknown as IPatientRepository,
        mockNotificationService as unknown as INotificationService,
        mockAuditService as unknown as IAuditService,
        undefined,
        undefined,
        undefined,
        undefined,
        consultationRepository as any,
      );

      const result = await completing.execute({
        appointmentId: 1,
        doctorId: 'doctor-1',
        outcome: 'Reviewed',
      });

      expect(consultationRepository.update).not.toHaveBeenCalled();
      expect(result.status).toBe(AppointmentStatus.COMPLETED);
      expect(mockAppointmentRepository.update).toHaveBeenCalledTimes(1);
      expect(finalized.getNotes()?.toFullText()).toBe(structured.toFullText());

      const completedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.COMPLETED,
        type: 'Consultation',
      });
      mockAppointmentRepository.findById.mockResolvedValue(completedAppointment);
      mockAppointmentRepository.update.mockClear();

      await expect(completing.execute({
        appointmentId: 1,
        doctorId: 'doctor-1',
        outcome: 'A different outcome',
      })).rejects.toThrow(/already completed/);

      expect(consultationRepository.update).not.toHaveBeenCalled();
      expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
    });

    it('commits the consultation, appointment status, and end time in one transaction', async () => {
      const structured = ConsultationNotes.createStructured({
        chiefComplaint: 'Headache',
        examination: 'Normal exam',
        assessment: 'Migraine',
        plan: 'Review in two weeks',
      });
      const committed = {
        consultation: null as Consultation | null,
        appointment: false,
        endTime: null as { consultation_ended_at?: Date; consultation_duration?: number | null } | null,
      };
      let insideTransaction = false;
      const paymentCreates: number[] = [];
      vi.mocked(db.$transaction).mockImplementation(async (callback: (tx: any) => Promise<unknown>) => {
        const pending = {
          consultation: null as Consultation | null,
          appointment: false,
          endTime: null as { consultation_ended_at?: Date; consultation_duration?: number | null } | null,
        };
        const tx = {
          appointment: {
            findUnique: vi.fn().mockResolvedValue({ consultation_started_at: new Date('2026-01-01T09:00:00.000Z') }),
            update: vi.fn(async ({ data }: { data: { consultation_ended_at: Date; consultation_duration: number | null } }) => {
              pending.endTime = data;
            }),
          },
          pending,
        };
        insideTransaction = true;
        try {
          const result = await callback(tx);
          committed.consultation = pending.consultation;
          committed.appointment = pending.appointment;
          committed.endTime = pending.endTime;
          return result;
        } finally {
          insideTransaction = false;
        }
      });
      const consultationRepository = {
        findByAppointmentId: vi.fn(async () => inProgressConsultation(structured)),
        update: vi.fn(async (value: Consultation, tx: { pending: { consultation: Consultation | null } }) => {
          tx.pending.consultation = value;
        }),
      };
      mockAppointmentRepository.update.mockImplementation(async (_appointment: Appointment, _fields: unknown, tx: { pending: { appointment: boolean } }) => {
        if (!tx?.pending) throw new Error('appointment update left the transaction');
        tx.pending.appointment = true;
      });
      const paymentRepository = {
        findByAppointmentId: vi.fn(async () => null),
        create: vi.fn(async () => {
          if (insideTransaction) throw new Error('billing ran inside the clinical transaction');
          paymentCreates.push(1);
          return { id: 9 };
        }),
        findById: vi.fn(),
      };
      const completing = new CompleteConsultationUseCase(
        mockAppointmentRepository as unknown as IAppointmentRepository,
        mockPatientRepository as unknown as IPatientRepository,
        mockNotificationService as unknown as INotificationService,
        mockAuditService as unknown as IAuditService,
        paymentRepository as any,
        undefined,
        undefined,
        undefined,
        consultationRepository as any,
      );

      const result = await completing.execute({
        appointmentId: 1,
        doctorId: 'doctor-1',
        outcome: 'Reviewed',
      });

      const written = ConsultationMapper.toPrismaUpdateInput(committed.consultation!);
      expect(written.chief_complaint).toBe('Headache');
      expect(written.doctor_notes).toBe(structured.toFullText());
      expect(written.completed_at).toBeInstanceOf(Date);
      expect(written.outcome_type).toBe(ConsultationOutcomeType.CONSULTATION_ONLY);
      expect(committed.appointment).toBe(true);
      expect(result.status).toBe(AppointmentStatus.COMPLETED);
      expect(result.note).toContain('[Consultation Completed] Reviewed');
      expect(committed.endTime?.consultation_ended_at).toBeInstanceOf(Date);
      expect(typeof committed.endTime?.consultation_duration).toBe('number');
      expect(paymentCreates).toEqual([1]);
      expect(mockNotificationService.sendEmail).toHaveBeenCalledTimes(1);
      expect(db.appointment.update).not.toHaveBeenCalled();

      mockAppointmentRepository.findById.mockResolvedValue(Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.COMPLETED,
        type: 'Consultation',
      }));
      await expect(completing.execute({
        appointmentId: 1,
        doctorId: 'doctor-1',
        outcome: 'Another pass',
      })).rejects.toThrow(/already completed/);
      expect(paymentCreates).toEqual([1]);
      expect(consultationRepository.update).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['appointment status', 'appointment'],
      ['end time', 'end-time'],
    ])('rolls back when the %s write fails', async (_label, failure) => {
      const structured = ConsultationNotes.createStructured({
        chiefComplaint: 'Headache',
        examination: 'Normal exam',
        assessment: 'Migraine',
        plan: 'Review in two weeks',
      });
      const committed = { consultation: false, appointment: false, endTime: false };
      vi.mocked(db.$transaction).mockImplementation(async (callback: (tx: any) => Promise<unknown>) => {
        const pending = { consultation: false, appointment: false, endTime: false };
        const tx = {
          pending,
          appointment: {
            findUnique: vi.fn().mockResolvedValue({ consultation_started_at: new Date('2026-01-01T09:00:00.000Z') }),
            update: vi.fn(async () => {
              if (failure === 'end-time') throw new Error('end time unavailable');
              pending.endTime = true;
            }),
          },
        };
        try {
          return await callback(tx);
        } catch (error) {
          throw error;
        } finally {
          if (pending.consultation && pending.appointment && pending.endTime) {
            committed.consultation = true;
            committed.appointment = true;
            committed.endTime = true;
          }
        }
      });
      const consultationRepository = {
        findByAppointmentId: vi.fn(async () => inProgressConsultation(structured)),
        update: vi.fn(async (_value: Consultation, tx: { pending: { consultation: boolean } }) => {
          tx.pending.consultation = true;
        }),
      };
      mockAppointmentRepository.update.mockImplementation(async (_appointment: Appointment, _fields: unknown, tx: { pending: { appointment: boolean } }) => {
        if (failure === 'appointment') throw new Error('appointment status unavailable');
        tx.pending.appointment = true;
      });
      const completing = new CompleteConsultationUseCase(
        mockAppointmentRepository as unknown as IAppointmentRepository,
        mockPatientRepository as unknown as IPatientRepository,
        mockNotificationService as unknown as INotificationService,
        mockAuditService as unknown as IAuditService,
        undefined,
        undefined,
        undefined,
        undefined,
        consultationRepository as any,
      );

      await expect(completing.execute({
        appointmentId: 1,
        doctorId: 'doctor-1',
        outcome: 'Reviewed',
      })).rejects.toThrow(/clinical note was not saved/);

      expect(committed).toEqual({ consultation: false, appointment: false, endTime: false });
      expect(db.patientQueue.updateMany).not.toHaveBeenCalled();
      expect(mockNotificationService.sendEmail).not.toHaveBeenCalled();
      expect(mockAuditService.recordEvent).not.toHaveBeenCalled();
      expect(db.appointment.update).not.toHaveBeenCalled();
    });

    it('keeps a legacy raw note on the raw path', async () => {
      const raw = ConsultationNotes.createRaw('Legacy clinical note');
      const { completing, readPersisted } = useCaseWithConsultation(inProgressConsultation(raw));

      await completing.execute({
        appointmentId: 1,
        doctorId: 'doctor-1',
        outcome: 'Reviewed',
      });

      const written = ConsultationMapper.toPrismaUpdateInput(readPersisted()!);
      expect(written.chief_complaint).toBeNull();
      expect(written.examination).toBeNull();
      expect(written.assessment).toBeNull();
      expect(written.plan).toBeNull();
      expect(written.doctor_notes).toContain('Legacy clinical note');
      expect(written.doctor_notes).toContain('Reviewed');
      expect(written.completed_at).toBeInstanceOf(Date);
    });
  });
});
