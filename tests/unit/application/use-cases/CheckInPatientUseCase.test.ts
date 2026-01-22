import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CheckInPatientUseCase } from '../../../../application/use-cases/CheckInPatientUseCase';
import { CheckInPatientDto } from '../../../../application/dtos/CheckInPatientDto';
import type { IAppointmentRepository } from '../../../../domain/interfaces/repositories/IAppointmentRepository';
import type { IAuditService } from '../../../../domain/interfaces/services/IAuditService';
import type { ITimeService } from '../../../../domain/interfaces/services/ITimeService';
import { Appointment } from '../../../../domain/entities/Appointment';
import { AppointmentStatus } from '../../../../domain/enums/AppointmentStatus';
import { DomainException } from '../../../../domain/exceptions/DomainException';

describe('CheckInPatientUseCase', () => {
  let mockAppointmentRepository: {
    findById: Mock;
    findByPatient: Mock;
    save: Mock;
    update: Mock;
  };
  let mockAuditService: {
    recordEvent: Mock;
  };
  let mockTimeService: {
    now: Mock;
    today: Mock;
  };
  let useCase: CheckInPatientUseCase;

  const validDto: CheckInPatientDto = {
    appointmentId: 1,
    userId: 'admin-1',
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

    mockTimeService = {
      now: vi.fn().mockReturnValue(new Date()),
      today: vi.fn().mockReturnValue(new Date()),
    };

    useCase = new CheckInPatientUseCase(
      mockAppointmentRepository as unknown as IAppointmentRepository,
      mockAuditService as unknown as IAuditService,
      mockTimeService as unknown as ITimeService,
    );
  });

  describe('execute', () => {
    it('should check in patient successfully (PENDING → SCHEDULED)', async () => {
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
      expect(result).toBeDefined();
      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
      expect(mockAppointmentRepository.update).toHaveBeenCalledOnce();
      expect(mockAuditService.recordEvent).toHaveBeenCalledOnce();

      // Verify audit event
      const auditCall = mockAuditService.recordEvent.mock.calls[0][0];
      expect(auditCall.action).toBe('UPDATE');
      expect(auditCall.model).toBe('Appointment');
    });

    it('should be idempotent if already SCHEDULED', async () => {
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

      // Act
      const result = await useCase.execute(validDto);

      // Assert
      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
      // Update should not be called (already scheduled)
      expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
      // Audit should still record the check-in attempt
      expect(mockAuditService.recordEvent).toHaveBeenCalledOnce();
    });

    it('should throw DomainException if appointment not found', async () => {
      // Arrange
      mockAppointmentRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(validDto)).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto)).rejects.toThrow('not found');
      expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw DomainException if appointment is cancelled', async () => {
      // Arrange
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

      // Act & Assert
      await expect(useCase.execute(validDto)).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto)).rejects.toThrow('cancelled');
      expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw DomainException if appointment is completed', async () => {
      // Arrange
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

      // Act & Assert
      await expect(useCase.execute(validDto)).rejects.toThrow(DomainException);
      await expect(useCase.execute(validDto)).rejects.toThrow('completed');
      expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
    });
  });
});
