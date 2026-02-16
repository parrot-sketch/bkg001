import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { CheckInPatientUseCase } from '../../../../application/use-cases/CheckInPatientUseCase';
import { CheckInPatientDto } from '../../../../application/dtos/CheckInPatientDto';
import type { IAppointmentRepository } from '../../../../domain/interfaces/repositories/IAppointmentRepository';
import type { IAuditService } from '../../../../domain/interfaces/services/IAuditService';
import type { ITimeService } from '../../../../domain/interfaces/services/ITimeService';
import { Appointment } from '../../../../domain/entities/Appointment';
import { AppointmentStatus } from '../../../../domain/enums/AppointmentStatus';
import { DomainException } from '../../../../domain/exceptions/DomainException';

// Mock the database dependency
vi.mock('@/lib/db', () => ({
  default: {
    appointment: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import db from '@/lib/db';

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
    vi.clearAllMocks();

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
      now: vi.fn().mockReturnValue(new Date('2025-12-31T10:00:00')),
      today: vi.fn().mockReturnValue(new Date('2025-12-31')),
    };

    useCase = new CheckInPatientUseCase(
      mockAppointmentRepository as unknown as IAppointmentRepository,
      mockAuditService as unknown as IAuditService,
      mockTimeService as unknown as ITimeService,
    );
  });

  describe('execute', () => {
    it('should check in patient successfully when arriving on time', async () => {
      // Arrange — appointment must be CONFIRMED/SCHEDULED for check-in
      const confirmedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00',
        status: AppointmentStatus.CONFIRMED,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(confirmedAppointment);
      mockAppointmentRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(validDto);

      // Assert — transitions to CHECKED_IN
      expect(result.status).toBe(AppointmentStatus.CHECKED_IN);
      expect(mockAppointmentRepository.update).toHaveBeenCalledOnce();

      // Verify DB update for arrival metadata
      expect(db.appointment.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          late_arrival: false,
          late_by_minutes: null,
        }),
      });

      // Verify audit event
      const auditCall = mockAuditService.recordEvent.mock.calls[0][0];
      expect(auditCall.details).toContain('Patient checked in');
      expect(auditCall.details).not.toContain('minutes late');
    });

    it('should calculate lateness when arriving after scheduled time', async () => {
      // Arrange
      const scheduledTime = '10:00';
      const arrivalTime = new Date('2025-12-31T10:15:00'); // 15 mins late
      mockTimeService.now.mockReturnValue(arrivalTime);

      const confirmedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: scheduledTime,
        status: AppointmentStatus.CONFIRMED,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(confirmedAppointment);

      // Act
      await useCase.execute(validDto);

      // Assert
      expect(db.appointment.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          late_arrival: true,
          late_by_minutes: 15,
        }),
      });

      // Verify audit event contains lateness
      const auditCall = mockAuditService.recordEvent.mock.calls[0][0];
      expect(auditCall.details).toContain('15 minutes late');
    });

    it('should be idempotent if already CHECKED_IN', async () => {
      // Arrange — patient is already checked in
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

      // Act
      const result = await useCase.execute(validDto);

      // Assert — stays CHECKED_IN, no status update
      expect(result.status).toBe(AppointmentStatus.CHECKED_IN);
      expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
      expect(mockAuditService.recordEvent).toHaveBeenCalled();
    });

    it('should throw DomainException if appointment not found', async () => {
      // Arrange
      mockAppointmentRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(validDto)).rejects.toThrow(DomainException);
      expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
    });

    it('should throw DomainException if appointment is cancelled', async () => {
      // Arrange
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

      // Act & Assert
      await expect(useCase.execute(validDto)).rejects.toThrow('cancelled');
    });

    it('should throw DomainException if appointment is completed', async () => {
      // Arrange
      const completedAppointment = Appointment.create({
        id: 1,
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        appointmentDate: new Date('2025-12-31'),
        time: '10:00',
        status: AppointmentStatus.COMPLETED,
        type: 'Consultation',
      });

      mockAppointmentRepository.findById.mockResolvedValue(completedAppointment);

      // Act & Assert
      await expect(useCase.execute(validDto)).rejects.toThrow('completed');
    });
  });
});
