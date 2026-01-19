import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CompleteConsultationUseCase } from '../../../../application/use-cases/CompleteConsultationUseCase';
import { CompleteConsultationDto } from '../../../../application/dtos/CompleteConsultationDto';
import type { IAppointmentRepository } from '../../../../domain/interfaces/repositories/IAppointmentRepository';
import type { IPatientRepository } from '../../../../domain/interfaces/repositories/IPatientRepository';
import type { INotificationService } from '../../../../domain/interfaces/services/INotificationService';
import type { IAuditService } from '../../../../domain/interfaces/services/IAuditService';
import { Appointment } from '../../../../domain/entities/Appointment';
import { Patient } from '../../../../domain/entities/Patient';
import { AppointmentStatus } from '../../../../domain/enums/AppointmentStatus';
import { Gender } from '../../../../domain/enums/Gender';
import { DomainException } from '../../../../domain/exceptions/DomainException';

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
  };

  const mockPatient = Patient.create({
    id: 'patient-1',
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
      const scheduledAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.SCHEDULED,
        type: 'Consultation',
      });

      const followUpAppointment = Appointment.create({
        id: 2,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2026-01-15'),
        time: '2:00 PM',
        status: AppointmentStatus.PENDING,
        type: 'Follow-up',
        note: `Follow-up appointment for appointment 1`,
        createdAt: new Date(),
      });

      const dtoWithFollowUp: CompleteConsultationDto = {
        ...validDto,
        followUpDate: new Date('2026-01-15'),
        followUpTime: '2:00 PM',
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
});
