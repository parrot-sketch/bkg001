import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ScheduleAppointmentDto } from '../../../../application/dtos/ScheduleAppointmentDto';
import type { IAppointmentRepository } from '../../../../domain/interfaces/repositories/IAppointmentRepository';
import type { IPatientRepository } from '../../../../domain/interfaces/repositories/IPatientRepository';
import type { IAvailabilityRepository } from '../../../../domain/interfaces/repositories/IAvailabilityRepository';
import type { INotificationService } from '../../../../domain/interfaces/services/INotificationService';
import type { IAuditService } from '../../../../domain/interfaces/services/IAuditService';
import type { ITimeService } from '../../../../domain/interfaces/services/ITimeService';
import { PrismaClient } from '@prisma/client';
import { Patient } from '../../../../domain/entities/Patient';
import { Appointment } from '../../../../domain/entities/Appointment';
import { AppointmentStatus } from '../../../../domain/enums/AppointmentStatus';
import { Gender } from '../../../../domain/enums/Gender';
import { DomainException } from '../../../../domain/exceptions/DomainException';

// Mock ValidateAppointmentAvailabilityUseCase to avoid deep nested dependency issues
// (getBlocks, sessions, AvailabilityService etc.)
const mockValidateExecute = vi.fn().mockResolvedValue({ isAvailable: true });
vi.mock('../../../../application/use-cases/ValidateAppointmentAvailabilityUseCase', () => ({
  ValidateAppointmentAvailabilityUseCase: vi.fn().mockImplementation(function (this: any) {
    this.execute = mockValidateExecute;
  }),
}));

// Mock UseCaseFactory to prevent importing @/lib/db (which creates a real PrismaClient)
vi.mock('@/lib/use-case-factory', () => ({
  UseCaseFactory: {
    validatePrismaClient: vi.fn(),
    getPrismaClient: vi.fn(),
  },
}));

// Import after mocks are set up
import { ScheduleAppointmentUseCase } from '../../../../application/use-cases/ScheduleAppointmentUseCase';

describe('ScheduleAppointmentUseCase', () => {
  let mockAppointmentRepository: {
    findById: Mock;
    findByPatient: Mock;
    findByDoctor: Mock;
    save: Mock;
    update: Mock;
    hasConflict: Mock;
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
    sendInApp: Mock;
  };
  let mockAuditService: {
    recordEvent: Mock;
  };
  let mockTimeService: {
    now: Mock;
    today: Mock;
  };
  let mockAvailabilityRepository: {
    getDoctorAvailability: Mock;
    getWorkingDays: Mock;
    saveWorkingDays: Mock;
    getOverrides: Mock;
    createOverride: Mock;
    deleteOverride: Mock;
    getBreaks: Mock;
    createBreak: Mock;
    deleteBreak: Mock;
    getSlotConfiguration: Mock;
    saveSlotConfiguration: Mock;
    getBlocks: Mock;
    createBlock: Mock;
    deleteBlock: Mock;
  };
  let mockPrisma: PrismaClient;
  let useCase: ScheduleAppointmentUseCase;

  const validDto: ScheduleAppointmentDto = {
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    appointmentDate: new Date('2027-06-15'),
    time: '10:00',
    type: 'Consultation',
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
    vi.clearAllMocks();

    // Reset the validate mock to default (available)
    mockValidateExecute.mockResolvedValue({ isAvailable: true });

    mockAppointmentRepository = {
      findById: vi.fn(),
      findByPatient: vi.fn().mockResolvedValue([]),
      findByDoctor: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(1),
      update: vi.fn(),
      hasConflict: vi.fn().mockResolvedValue(false),
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
      sendInApp: vi.fn().mockResolvedValue(undefined),
    };

    mockAuditService = {
      recordEvent: vi.fn().mockResolvedValue(undefined),
    };

    mockTimeService = {
      now: vi.fn().mockReturnValue(new Date('2026-01-01')),
      today: vi.fn().mockReturnValue(new Date('2026-01-01')),
    };

    mockAvailabilityRepository = {
      getDoctorAvailability: vi.fn().mockResolvedValue(null),
      getWorkingDays: vi.fn().mockResolvedValue([]),
      saveWorkingDays: vi.fn().mockResolvedValue(undefined),
      getOverrides: vi.fn().mockResolvedValue([]),
      createOverride: vi.fn(),
      deleteOverride: vi.fn().mockResolvedValue(undefined),
      getBreaks: vi.fn().mockResolvedValue([]),
      createBreak: vi.fn(),
      deleteBreak: vi.fn().mockResolvedValue(undefined),
      getSlotConfiguration: vi.fn().mockResolvedValue({
        id: 'slot-1',
        doctorId: 'doctor-1',
        defaultDuration: 30,
        bufferTime: 0,
        slotInterval: 15,
      }),
      saveSlotConfiguration: vi.fn(),
      getBlocks: vi.fn().mockResolvedValue([]),
      createBlock: vi.fn(),
      deleteBlock: vi.fn(),
    };

    // Mock PrismaClient with $transaction that invokes the callback
    // and doctor.findUnique for notification lookup
    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>, _opts?: any) => {
        const tx = {
          appointment: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return cb(tx);
      }),
      doctor: {
        findUnique: vi.fn().mockResolvedValue({ user_id: 'user-doctor-1' }),
      },
    } as unknown as PrismaClient;

    useCase = new ScheduleAppointmentUseCase(
      mockAppointmentRepository as unknown as IAppointmentRepository,
      mockPatientRepository as unknown as IPatientRepository,
      mockAvailabilityRepository as unknown as IAvailabilityRepository,
      mockNotificationService as unknown as INotificationService,
      mockAuditService as unknown as IAuditService,
      mockTimeService as unknown as ITimeService,
      mockPrisma,
    );
  });

  describe('execute', () => {
    it('should schedule appointment successfully', async () => {
      // Arrange
      // The default status for PATIENT_REQUESTED source is PENDING_DOCTOR_CONFIRMATION
      const savedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2027-06-15'),
        time: '10:00',
        status: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
        type: 'Consultation',
        createdAt: new Date(),
      });

      mockAppointmentRepository.findByPatient.mockResolvedValue([]); // No patient conflicts inside transaction
      mockAppointmentRepository.save.mockResolvedValue(1); // Return saved ID
      mockAppointmentRepository.findById.mockResolvedValue(savedAppointment); // After transaction retrieval

      // Act
      const result = await useCase.execute(validDto, 'user-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.patientId).toBe('patient-1');
      expect(result.doctorId).toBe('doctor-1');
      expect(result.status).toBe(AppointmentStatus.PENDING_DOCTOR_CONFIRMATION);

      // Verify repository calls
      expect(mockPatientRepository.findById).toHaveBeenCalledWith('patient-1');
      expect(mockAppointmentRepository.save).toHaveBeenCalledOnce();
      expect(mockNotificationService.sendEmail).toHaveBeenCalledOnce();
      expect(mockAuditService.recordEvent).toHaveBeenCalledOnce();
    });

    it('should set status to PENDING_DOCTOR_CONFIRMATION for FRONTDESK_SCHEDULED source', async () => {
      // Arrange
      const frontdeskDto: ScheduleAppointmentDto = {
        ...validDto,
        source: 'FRONTDESK_SCHEDULED' as any,
      };

      const savedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2027-06-15'),
        time: '10:00',
        status: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
        type: 'Consultation',
        createdAt: new Date(),
      });

      mockAppointmentRepository.findByPatient.mockResolvedValue([]);
      mockAppointmentRepository.save.mockResolvedValue(1);
      mockAppointmentRepository.findById.mockResolvedValue(savedAppointment);

      // Act
      const result = await useCase.execute(frontdeskDto, 'user-frontdesk-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(AppointmentStatus.PENDING_DOCTOR_CONFIRMATION);
      expect(mockAppointmentRepository.save).toHaveBeenCalledOnce();
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
      // Arrange: inside the transaction, findByPatient returns a conflicting appointment
      const conflictingAppointment = Appointment.create({
        id: 2,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2027-06-15'),
        time: '10:00',
        status: AppointmentStatus.SCHEDULED,
        type: 'Follow-up',
      });

      // findByPatient is called inside the transaction for patient conflict check
      mockAppointmentRepository.findByPatient.mockResolvedValue([conflictingAppointment]);

      // Act & Assert
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow('conflict');
      await expect(useCase.execute(validDto, 'user-1')).rejects.toThrow('Patient already has');

      // Verify appointment was not saved
      expect(mockAppointmentRepository.save).not.toHaveBeenCalled();
    });

    it('should throw DomainException if doctor double booking detected', async () => {
      // Arrange: hasConflict returns true for doctor conflict (inside transaction)
      mockAppointmentRepository.hasConflict.mockResolvedValue(true);
      mockAppointmentRepository.findByPatient.mockResolvedValue([]); // No patient conflict

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
        appointmentDate: new Date('2027-06-15'),
        time: '10:00',
        status: AppointmentStatus.CANCELLED,
        type: 'Follow-up',
      });

      const savedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2027-06-15'),
        time: '10:00',
        status: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
        type: 'Consultation',
        createdAt: new Date(),
      });

      // Inside transaction: findByPatient returns cancelled appointment (should not conflict)
      mockAppointmentRepository.findByPatient.mockResolvedValue([cancelledAppointment]);
      mockAppointmentRepository.save.mockResolvedValue(1);
      mockAppointmentRepository.findById.mockResolvedValue(savedAppointment);

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
        appointmentDate: new Date('2027-06-15'),
        time: '10:00',
        status: AppointmentStatus.PENDING_DOCTOR_CONFIRMATION,
        type: 'Consultation',
        createdAt: new Date(),
      });

      mockAppointmentRepository.findByPatient.mockResolvedValue([]);
      mockAppointmentRepository.save.mockResolvedValue(1);
      mockAppointmentRepository.findById.mockResolvedValue(savedAppointment);
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
          mockAvailabilityRepository as unknown as IAvailabilityRepository,
          mockNotificationService as unknown as INotificationService,
          mockAuditService as unknown as IAuditService,
          mockTimeService as unknown as ITimeService,
          mockPrisma,
        );
      }).toThrow('AppointmentRepository is required');
    });
  });
});
