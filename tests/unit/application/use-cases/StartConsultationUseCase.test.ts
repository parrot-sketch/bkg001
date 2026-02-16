import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { StartConsultationUseCase } from '../../../../application/use-cases/StartConsultationUseCase';
import { StartConsultationDto } from '../../../../application/dtos/StartConsultationDto';
import type { IAppointmentRepository } from '../../../../domain/interfaces/repositories/IAppointmentRepository';
import type { IConsultationRepository } from '../../../../domain/interfaces/repositories/IConsultationRepository';
import type { IAuditService } from '../../../../domain/interfaces/services/IAuditService';
import { Appointment } from '../../../../domain/entities/Appointment';
import { Consultation } from '../../../../domain/entities/Consultation';
import { AppointmentStatus } from '../../../../domain/enums/AppointmentStatus';
import { DomainException } from '../../../../domain/exceptions/DomainException';

// Mock the direct db import used by the use case for concurrency guard
vi.mock('@/lib/db', () => ({
  default: {
    appointment: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe('StartConsultationUseCase', () => {
  let mockAppointmentRepository: {
    findById: Mock;
    findByPatient: Mock;
    save: Mock;
    update: Mock;
  };
  let mockConsultationRepository: {
    findById: Mock;
    findByAppointmentId: Mock;
    findByDoctorId: Mock;
    save: Mock;
    update: Mock;
    delete: Mock;
  };
  let mockAuditService: {
    recordEvent: Mock;
  };
  let useCase: StartConsultationUseCase;

  const validDto: StartConsultationDto = {
    appointmentId: 1,
    doctorId: 'doctor-1',
    userId: 'user-1',
    doctorNotes: 'Patient presents with headache',
  };

  beforeEach(() => {
    mockAppointmentRepository = {
      findById: vi.fn(),
      findByPatient: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    };

    // When findByAppointmentId returns null, the use case creates a new consultation
    // and calls save() which must return a Consultation entity with generated ID
    const defaultConsultation = Consultation.create({
      id: 1,
      appointmentId: 1,
      doctorId: 'doctor-1',
    });

    mockConsultationRepository = {
      findById: vi.fn(),
      findByAppointmentId: vi.fn().mockResolvedValue(null),
      findByDoctorId: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(defaultConsultation),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockAuditService = {
      recordEvent: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new StartConsultationUseCase(
      mockAppointmentRepository as unknown as IAppointmentRepository,
      mockConsultationRepository as unknown as IConsultationRepository,
      mockAuditService as unknown as IAuditService,
    );
  });

  describe('execute', () => {
    it('should start consultation successfully', async () => {
      // Arrange - Patient must be CHECKED_IN before consultation can start
      const checkedInAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00',
        status: AppointmentStatus.CHECKED_IN,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(checkedInAppointment);
      mockAppointmentRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(validDto);

      // Assert - Use case transitions to IN_CONSULTATION
      expect(result).toBeDefined();
      expect(result.status).toBe(AppointmentStatus.IN_CONSULTATION);
      expect(result.note).toContain('Consultation Started');
      expect(result.note).toContain('Patient presents with headache');
      expect(mockAppointmentRepository.update).toHaveBeenCalledOnce();
      expect(mockAuditService.recordEvent).toHaveBeenCalledOnce();
    });

    it('should start consultation from READY_FOR_CONSULTATION status', async () => {
      // Arrange - READY_FOR_CONSULTATION is also a valid starting status
      const readyAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00',
        status: AppointmentStatus.READY_FOR_CONSULTATION,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(readyAppointment);
      mockAppointmentRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(validDto);

      // Assert
      expect(result.status).toBe(AppointmentStatus.IN_CONSULTATION);
    });

    it('should throw DomainException if appointment not found', async () => {
      mockAppointmentRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(validDto)).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto)).rejects.toThrow('not found');
    });

    it('should throw DomainException if doctor ID does not match', async () => {
      const appointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-2', // Different doctor
        appointmentDate: new Date('2025-12-31'),
        time: '10:00',
        status: AppointmentStatus.CHECKED_IN,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(appointment);

      await expect(useCase.execute(validDto)).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto)).rejects.toThrow('not assigned');
    });

    it('should throw DomainException if appointment is cancelled', async () => {
      const cancelledAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00',
        status: AppointmentStatus.CANCELLED,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(cancelledAppointment);

      await expect(useCase.execute(validDto)).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto)).rejects.toThrow('cancelled');
    });

    it('should throw DomainException if patient has not arrived (SCHEDULED status)', async () => {
      // SCHEDULED patients haven't checked in yet
      const scheduledAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00',
        status: AppointmentStatus.SCHEDULED,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(scheduledAppointment);

      await expect(useCase.execute(validDto)).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto)).rejects.toThrow("Patient hasn't arrived yet");
    });

    it('should append notes to existing appointment notes', async () => {
      const appointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00',
        status: AppointmentStatus.CHECKED_IN,
        type: 'Consultation',
        note: 'Initial complaint: Headache',
      });

      mockAppointmentRepository.findById.mockResolvedValue(appointment);
      mockAppointmentRepository.update.mockResolvedValue(undefined);

      const result = await useCase.execute(validDto);

      expect(result.note).toContain('Initial complaint: Headache');
      expect(result.note).toContain('Consultation Started');
      expect(result.note).toContain('Patient presents with headache');
    });
  });
});
