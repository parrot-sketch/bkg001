import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ScheduleAppointmentUseCase } from '../../../../application/use-cases/ScheduleAppointmentUseCase';
import { ScheduleAppointmentDto } from '../../../../application/dtos/ScheduleAppointmentDto';
import type { IAppointmentRepository } from '../../../../domain/interfaces/repositories/IAppointmentRepository';
import type { IPatientRepository } from '../../../../domain/interfaces/repositories/IPatientRepository';
import type { INotificationService } from '../../../../domain/interfaces/services/INotificationService';
import type { IAuditService } from '../../../../domain/interfaces/services/IAuditService';
import type { ITimeService } from '../../../../domain/interfaces/services/ITimeService';
import { Patient } from '../../../../domain/entities/Patient';
import { Appointment } from '../../../../domain/entities/Appointment';
import { AppointmentStatus } from '../../../../domain/enums/AppointmentStatus';
import { Gender } from '../../../../domain/enums/Gender';
import { DomainException } from '../../../../domain/exceptions/DomainException';

describe('ScheduleAppointmentUseCase', () => {
  let mockAppointmentRepository: {
    findById: Mock;
    findByPatient: Mock;
    findByDoctor: Mock;
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
  let mockTimeService: {
    now: Mock;
    today: Mock;
  };
  let useCase: ScheduleAppointmentUseCase;

  const validDto: ScheduleAppointmentDto = {
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    appointmentDate: new Date('2025-12-31'),
    time: '10:00 AM',
    type: 'Consultation',
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
      findByDoctor: vi.fn().mockResolvedValue([]),
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

    mockTimeService = {
      now: vi.fn().mockReturnValue(new Date('2025-01-01')),
      today: vi.fn().mockReturnValue(new Date('2025-01-01')),
    };

    useCase = new ScheduleAppointmentUseCase(
      mockAppointmentRepository as unknown as IAppointmentRepository,
      mockPatientRepository as unknown as IPatientRepository,
      mockNotificationService as unknown as INotificationService,
      mockAuditService as unknown as IAuditService,
      mockTimeService as unknown as ITimeService,
    );
  });

  describe('execute', () => {
    it('should schedule appointment successfully', async () => {
      // Arrange
      const savedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.PENDING,
        type: 'Consultation',
        createdAt: new Date(),
      });

      mockAppointmentRepository.findByPatient.mockResolvedValueOnce([]); // No conflicts
      mockAppointmentRepository.findByDoctor.mockResolvedValueOnce([]); // No conflicts
      mockAppointmentRepository.save.mockResolvedValue(undefined);
      mockAppointmentRepository.findByPatient.mockResolvedValueOnce([savedAppointment]); // After save

      // Act
      const result = await useCase.execute(validDto, 'user-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.patientId).toBe('patient-1');
      expect(result.doctorId).toBe('doctor-1');
      expect(result.status).toBe(AppointmentStatus.PENDING);

      // Verify repository calls
      expect(mockPatientRepository.findById).toHaveBeenCalledWith('patient-1');
      expect(mockAppointmentRepository.save).toHaveBeenCalledOnce();
      expect(mockNotificationService.sendEmail).toHaveBeenCalledOnce();
      expect(mockAuditService.recordEvent).toHaveBeenCalledOnce();
    });

    it('should throw DomainException if patient does not exist', async () => {
      // Arrange
      mockPatientRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow('not found');

      // Verify appointment was not saved
      expect(mockAppointmentRepository.save).not.toHaveBeenCalled();
    });

    it('should throw DomainException if appointment date is in the past', async () => {
      // Arrange
      const pastDto: ScheduleAppointmentDto = {
        ...validDto,
        appointmentDate: new Date('2024-01-01'), // Past date
      };

      // Act & Assert
      await expect(useCase.execute(pastDto, 'user-1')).rejects.toThrow(DomainException);
      await expect(useCase.execute(pastDto, 'user-1')).rejects.toThrow('past');

      // Verify appointment was not saved
      expect(mockAppointmentRepository.save).not.toHaveBeenCalled();
    });

    it('should throw DomainException if patient double booking detected', async () => {
      // Arrange
      const conflictingAppointment = Appointment.create({
        id: 2,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.SCHEDULED,
        type: 'Follow-up',
      });

      mockAppointmentRepository.findByPatient.mockResolvedValue([conflictingAppointment]);
      mockAppointmentRepository.findByDoctor.mockResolvedValue([]);

      // Act & Assert
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow('conflict');
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow('Patient already has');

      // Verify appointment was not saved
      expect(mockAppointmentRepository.save).not.toHaveBeenCalled();
    });

    it('should throw DomainException if doctor double booking detected', async () => {
      // Arrange
      const conflictingAppointment = Appointment.create({
        id: 2,
        patientId: 'patient-2', // Different patient
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.SCHEDULED,
        type: 'Follow-up',
      });

      mockAppointmentRepository.findByPatient.mockResolvedValue([]); // No patient conflict
      mockAppointmentRepository.findByDoctor.mockResolvedValue([conflictingAppointment]); // Doctor conflict

      // Act & Assert
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow('conflict');
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow('Doctor');

      // Verify appointment was not saved
      expect(mockAppointmentRepository.save).not.toHaveBeenCalled();
    });

    it('should not consider cancelled appointments as conflicts', async () => {
      // Arrange
      const cancelledAppointment = Appointment.create({
        id: 2,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.CANCELLED,
        type: 'Follow-up',
      });

      const savedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.PENDING,
        type: 'Consultation',
        createdAt: new Date(),
      });

      mockAppointmentRepository.findByPatient.mockResolvedValueOnce([cancelledAppointment]); // Before save
      mockAppointmentRepository.findByDoctor.mockResolvedValueOnce([]); // No conflicts
      mockAppointmentRepository.save.mockResolvedValue(undefined);
      mockAppointmentRepository.findByPatient.mockResolvedValueOnce([savedAppointment]); // After save

      // Act
      const result = await useCase.execute(validDto, 'user-1');

      // Assert - Should succeed because cancelled appointments don't conflict
      expect(result).toBeDefined();
      expect(mockAppointmentRepository.save).toHaveBeenCalledOnce();
    });

    it('should handle notification failure gracefully', async () => {
      // Arrange
      const savedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.PENDING,
        type: 'Consultation',
        createdAt: new Date(),
      });

      mockAppointmentRepository.findByPatient.mockResolvedValueOnce([]);
      mockAppointmentRepository.findByDoctor.mockResolvedValueOnce([]);
      mockAppointmentRepository.save.mockResolvedValue(undefined);
      mockAppointmentRepository.findByPatient.mockResolvedValueOnce([savedAppointment]);
      mockNotificationService.sendEmail.mockRejectedValue(new Error('Email service down'));

      // Act - Should not throw
      const result = await useCase.execute(validDto, 'user-1');

      // Assert - Should still complete successfully
      expect(result).toBeDefined();
      expect(mockAppointmentRepository.save).toHaveBeenCalledOnce();
      // Audit should still be recorded
      expect(mockAuditService.recordEvent).toHaveBeenCalledOnce();
    });
  });

  describe('constructor', () => {
    it('should throw error if any dependency is missing', () => {
      expect(() => {
        new ScheduleAppointmentUseCase(
          null as unknown as IAppointmentRepository,
          mockPatientRepository as unknown as IPatientRepository,
          mockNotificationService as unknown as INotificationService,
          mockAuditService as unknown as IAuditService,
          mockTimeService as unknown as ITimeService,
        );
      }).toThrow('AppointmentRepository is required');
    });
  });
});
