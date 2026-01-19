import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { StartConsultationUseCase } from '../../../../application/use-cases/StartConsultationUseCase';
import { StartConsultationDto } from '../../../../application/dtos/StartConsultationDto';
import type { IAppointmentRepository } from '../../../../domain/interfaces/repositories/IAppointmentRepository';
import type { IAuditService } from '../../../../domain/interfaces/services/IAuditService';
import { Appointment } from '../../../../domain/entities/Appointment';
import { AppointmentStatus } from '../../../../domain/enums/AppointmentStatus';
import { DomainException } from '../../../../domain/exceptions/DomainException';

describe('StartConsultationUseCase', () => {
  let mockAppointmentRepository: {
    findById: Mock;
    findByPatient: Mock;
    save: Mock;
    update: Mock;
  };
  let mockAuditService: {
    recordEvent: Mock;
  };
  let useCase: StartConsultationUseCase;

  const validDto: StartConsultationDto = {
    appointmentId: 1,
    doctorId: 'doctor-1',
    doctorNotes: 'Patient presents with headache',
  };

  beforeEach(() => {
    mockAppointmentRepository = {
      findById: vi.fn(),
      findByPatient: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    };

    mockAuditService = {
      recordEvent: vi.fn().mockResolvedValue(undefined),
    };

    useCase = new StartConsultationUseCase(
      mockAppointmentRepository as unknown as IAppointmentRepository,
      mockAuditService as unknown as IAuditService,
    );
  });

  describe('execute', () => {
    it('should start consultation successfully', async () => {
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
      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
      expect(result.note).toContain('Consultation Started');
      expect(result.note).toContain('Patient presents with headache');
      expect(mockAppointmentRepository.update).toHaveBeenCalledOnce();
      expect(mockAuditService.recordEvent).toHaveBeenCalledOnce();
    });

    it('should update PENDING appointment to SCHEDULED when starting', async () => {
      // Arrange
      const pendingAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.PENDING,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(pendingAppointment);
      mockAppointmentRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(validDto);

      // Assert
      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
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
        time: '10:00 AM',
        status: AppointmentStatus.SCHEDULED,
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
        time: '10:00 AM',
        status: AppointmentStatus.CANCELLED,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(cancelledAppointment);

      await expect(useCase.execute(validDto)).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto)).rejects.toThrow('cancelled');
    });

    it('should append notes to existing appointment notes', async () => {
      const appointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00 AM',
        status: AppointmentStatus.SCHEDULED,
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
