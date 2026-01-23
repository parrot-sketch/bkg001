import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { SubmitConsultationRequestUseCase } from '../../../../application/use-cases/SubmitConsultationRequestUseCase';
import { SubmitConsultationRequestDto } from '../../../../application/dtos/SubmitConsultationRequestDto';
import type { IAppointmentRepository } from '../../../../domain/interfaces/repositories/IAppointmentRepository';
import type { IPatientRepository } from '../../../../domain/interfaces/repositories/IPatientRepository';
import type { INotificationService } from '../../../../domain/interfaces/services/INotificationService';
import type { IAuditService } from '../../../../domain/interfaces/services/IAuditService';
import type { ITimeService } from '../../../../domain/interfaces/services/ITimeService';
import { Patient } from '../../../../domain/entities/Patient';
import { Appointment } from '../../../../domain/entities/Appointment';
import { AppointmentStatus } from '../../../../domain/enums/AppointmentStatus';
import { ConsultationRequestStatus } from '../../../../domain/enums/ConsultationRequestStatus';
import { Gender } from '../../../../domain/enums/Gender';
import { DomainException } from '../../../../domain/exceptions/DomainException';

describe('SubmitConsultationRequestUseCase', () => {
  let mockAppointmentRepository: {
    findById: Mock;
    findByPatient: Mock;
    findByDoctor: Mock;
    save: Mock;
    update: Mock;
    getConsultationRequestFields: Mock;
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
  let useCase: SubmitConsultationRequestUseCase;

  const validDto: SubmitConsultationRequestDto = {
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    serviceId: '1',
    concernDescription: 'I have a concern about my skin condition',
    preferredDate: new Date('2025-12-31'),
    timePreference: 'Morning',
    notes: 'Please call me before scheduling',
    isOver18: true,
    medicalInfo: {
      isOver18: true,
      hasSeriousConditions: 'no',
      isPregnant: 'no',
    },
    contactConsent: true,
    privacyConsent: true,
    acknowledgmentConsent: true,
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
      findByDoctor: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
      getConsultationRequestFields: vi.fn().mockResolvedValue({
        consultationRequestStatus: ConsultationRequestStatus.SUBMITTED,
      }),
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

    useCase = new SubmitConsultationRequestUseCase(
      mockAppointmentRepository as unknown as IAppointmentRepository,
      mockPatientRepository as unknown as IPatientRepository,
      mockNotificationService as unknown as INotificationService,
      mockAuditService as unknown as IAuditService,
      mockTimeService as unknown as ITimeService,
    );
  });

  describe('execute', () => {
    it('should submit consultation request successfully', async () => {
      // Arrange
      const userId = 'patient-1';
      
      // Mock findByPatient to return saved appointment after save
      // The use case creates appointment, saves it, then retrieves it
      const savedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: 'Morning',
        status: AppointmentStatus.PENDING,
        type: 'Consultation Request',
        note: expect.stringContaining('I have a concern about my skin condition'),
        createdAt: new Date(),
      });
      
      // First call: check for conflicts (empty array)
      mockAppointmentRepository.findByPatient.mockResolvedValueOnce([]);
      // Second call: retrieve saved appointment
      mockAppointmentRepository.findByPatient.mockResolvedValueOnce([savedAppointment]);

      // Act
      const response = await useCase.execute(validDto, userId);

      // Assert
      expect(response).toBeDefined();
      expect(response.id).toBe(1);
      expect(response.patientId).toBe('patient-1');
      expect(response.doctorId).toBe('doctor-1');
      expect(mockPatientRepository.findById).toHaveBeenCalledWith('patient-1');
      expect(mockAppointmentRepository.save).toHaveBeenCalled();
      expect(mockNotificationService.sendEmail).toHaveBeenCalled();
      expect(mockAuditService.recordEvent).toHaveBeenCalled();
    });

    it('should throw DomainException if patient does not exist', async () => {
      // Arrange
      const userId = 'patient-1';
      mockPatientRepository.findById.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(useCase.execute(validDto, userId)).rejects.toThrow(DomainException);
      expect(mockAppointmentRepository.save).not.toHaveBeenCalled();
    });

    it('should throw DomainException if concern description is missing', async () => {
      // Arrange
      const userId = 'patient-1';
      const invalidDto = { ...validDto, concernDescription: '' };

      // Act & Assert
      await expect(useCase.execute(invalidDto, userId)).rejects.toThrow(DomainException);
      expect(mockAppointmentRepository.save).not.toHaveBeenCalled();
    });

    it('should throw DomainException if patient is not submitting for themselves', async () => {
      // Arrange
      const userId = 'different-patient-id';
      const invalidDto = { ...validDto, patientId: 'patient-1' };

      // Act & Assert
      await expect(useCase.execute(invalidDto, userId)).rejects.toThrow(DomainException);
      expect(mockAppointmentRepository.save).not.toHaveBeenCalled();
    });

    it('should throw DomainException if preferred date is in the past', async () => {
      // Arrange
      const userId = 'patient-1';
      const pastDate = new Date('2020-01-01');
      const invalidDto = { ...validDto, preferredDate: pastDate };
      mockTimeService.now.mockReturnValueOnce(new Date('2025-01-01'));

      // Act & Assert
      await expect(useCase.execute(invalidDto, userId)).rejects.toThrow(DomainException);
      expect(mockAppointmentRepository.save).not.toHaveBeenCalled();
    });

    it('should create appointment with SUBMITTED consultation request status', async () => {
      // Arrange
      const userId = 'patient-1';
      const savedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.PENDING,
        type: 'Consultation',
        note: 'I have a concern about my skin condition',
      });
      mockAppointmentRepository.findByPatient.mockResolvedValueOnce([savedAppointment]);

      // Act
      await useCase.execute(validDto, userId);

      // Assert
      expect(mockAppointmentRepository.save).toHaveBeenCalled();
      const saveCall = mockAppointmentRepository.save.mock.calls[0];
      expect(saveCall[1]).toEqual({
        consultationRequestStatus: ConsultationRequestStatus.SUBMITTED,
      });
    });

    it('should send notification to patient after successful submission', async () => {
      // Arrange
      const userId = 'patient-1';
      const savedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.PENDING,
        type: 'Consultation',
        note: 'I have a concern about my skin condition',
      });
      mockAppointmentRepository.findByPatient.mockResolvedValueOnce([savedAppointment]);

      // Act
      await useCase.execute(validDto, userId);

      // Assert
      expect(mockNotificationService.sendEmail).toHaveBeenCalled();
      const emailCall = mockNotificationService.sendEmail.mock.calls[0];
      expect(emailCall[1]).toContain('Consultation Request Received');
    });

    it('should record audit event after successful submission', async () => {
      // Arrange
      const userId = 'patient-1';
      const savedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.PENDING,
        type: 'Consultation',
        note: 'I have a concern about my skin condition',
      });
      mockAppointmentRepository.findByPatient.mockResolvedValueOnce([savedAppointment]);

      // Act
      await useCase.execute(validDto, userId);

      // Assert
      expect(mockAuditService.recordEvent).toHaveBeenCalled();
      const auditCall = mockAuditService.recordEvent.mock.calls[0][0];
      expect(auditCall.userId).toBe(userId);
      expect(auditCall.action).toBe('CREATE');
      expect(auditCall.model).toBe('ConsultationRequest');
    });
  });
});
