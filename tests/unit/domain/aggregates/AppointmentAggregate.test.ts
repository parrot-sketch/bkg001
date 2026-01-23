import { describe, it, expect, beforeEach } from 'vitest';
import { AppointmentAggregate } from '../../../../domain/aggregates/AppointmentAggregate';
import { Appointment } from '../../../../domain/entities/Appointment';
import { AppointmentStatus } from '../../../../domain/enums/AppointmentStatus';
import { CheckInInfo } from '../../../../domain/value-objects/CheckInInfo';
import { NoShowInfo } from '../../../../domain/value-objects/NoShowInfo';
import { NoShowReason } from '../../../../domain/enums/NoShowReason';
import { DomainException } from '../../../../domain/exceptions/DomainException';

describe('AppointmentAggregate', () => {
  let baseAppointment: Appointment;
  // Use a specific date/time to avoid timezone issues
  const appointmentDate = new Date('2025-01-15T00:00:00Z');
  const appointmentTime = '10:00';

  beforeEach(() => {
    baseAppointment = Appointment.create({
      id: 1,
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      appointmentDate,
      time: appointmentTime,
      status: AppointmentStatus.PENDING,
      type: 'Consultation',
    });
  });

  describe('checkIn - On-time check-in', () => {
    it('should check in patient on time', () => {
      const aggregate = AppointmentAggregate.create(baseAppointment);
      // Appointment is at 10:00, so check-in at 10:00 is on time
      const checkedInAt = new Date('2025-01-15T10:00:00'); // Exactly on time (local time)

      const result = aggregate.checkIn(checkedInAt, 'user-1');

      const appointment = result.getAppointment();
      expect(appointment.isCheckedIn()).toBe(true);
      expect(appointment.isLateArrival()).toBe(false);
      expect(appointment.getStatus()).toBe(AppointmentStatus.SCHEDULED); // Status updated from PENDING

      const checkInInfo = appointment.getCheckInInfo()!;
      expect(checkInInfo.getCheckedInAt()).toEqual(checkedInAt);
      expect(checkInInfo.getCheckedInBy()).toBe('user-1');
      expect(checkInInfo.isLate()).toBe(false);
      expect(checkInInfo.getLateByMinutes()).toBeUndefined();
    });

    it('should check in patient 5 minutes early', () => {
      const aggregate = AppointmentAggregate.create(baseAppointment);
      const checkedInAt = new Date('2025-01-15T09:55:00'); // 5 minutes early (local time)

      const result = aggregate.checkIn(checkedInAt, 'user-1');

      const appointment = result.getAppointment();
      expect(appointment.isCheckedIn()).toBe(true);
      expect(appointment.isLateArrival()).toBe(false);
      const checkInInfo = appointment.getCheckInInfo()!;
      expect(checkInInfo.isLate()).toBe(false);
    });
  });

  describe('checkIn - Late check-in', () => {
    it('should check in patient 15 minutes late', () => {
      const aggregate = AppointmentAggregate.create(baseAppointment);
      const checkedInAt = new Date('2025-01-15T10:15:00'); // 15 minutes late (local time)

      const result = aggregate.checkIn(checkedInAt, 'user-1');

      const appointment = result.getAppointment();
      expect(appointment.isCheckedIn()).toBe(true);
      expect(appointment.isLateArrival()).toBe(true);

      const checkInInfo = appointment.getCheckInInfo()!;
      expect(checkInInfo.isLate()).toBe(true);
      expect(checkInInfo.getLateByMinutes()).toBe(15);
    });

    it('should check in patient 30 minutes late', () => {
      const aggregate = AppointmentAggregate.create(baseAppointment);
      const checkedInAt = new Date('2025-01-15T10:30:00'); // 30 minutes late (local time)

      const result = aggregate.checkIn(checkedInAt, 'user-1');

      const appointment = result.getAppointment();
      const checkInInfo = appointment.getCheckInInfo()!;
      expect(checkInInfo.getLateByMinutes()).toBe(30);
    });
  });

  describe('checkIn - Invariants', () => {
    it('should throw if already checked in', () => {
      const checkedInAppointment = baseAppointment.checkIn(
        CheckInInfo.createOnTime({
          checkedInAt: new Date('2025-01-15T10:00:00'),
          checkedInBy: 'user-1',
        })
      );
      const aggregate = AppointmentAggregate.create(checkedInAppointment);

      expect(() => {
        aggregate.checkIn(new Date('2025-01-15T10:05:00'), 'user-2');
      }).toThrow(DomainException);
    });

    it('should throw if appointment is cancelled', () => {
      const cancelledAppointment = Appointment.create({
        id: baseAppointment.getId(),
        patientId: baseAppointment.getPatientId(),
        doctorId: baseAppointment.getDoctorId(),
        appointmentDate: baseAppointment.getAppointmentDate(),
        time: baseAppointment.getTime(),
        status: AppointmentStatus.CANCELLED,
        type: baseAppointment.getType(),
      });
      const aggregate = AppointmentAggregate.create(cancelledAppointment);

      expect(() => {
        aggregate.checkIn(new Date('2025-01-15T10:00:00'), 'user-1');
      }).toThrow(DomainException);
    });

    it('should throw if appointment is completed', () => {
      const completedAppointment = Appointment.create({
        id: baseAppointment.getId(),
        patientId: baseAppointment.getPatientId(),
        doctorId: baseAppointment.getDoctorId(),
        appointmentDate: baseAppointment.getAppointmentDate(),
        time: baseAppointment.getTime(),
        status: AppointmentStatus.COMPLETED,
        type: baseAppointment.getType(),
      });
      const aggregate = AppointmentAggregate.create(completedAppointment);

      expect(() => {
        aggregate.checkIn(new Date('2025-01-15T10:00:00'), 'user-1');
      }).toThrow(DomainException);
    });
  });

  describe('markAsNoShow - Manual no-show', () => {
    it('should mark appointment as no-show with MANUAL reason', () => {
      const aggregate = AppointmentAggregate.create(baseAppointment);

      const result = aggregate.markAsNoShow(NoShowReason.MANUAL, 'Patient did not arrive', 'user-1');

      const appointment = result.getAppointment();
      expect(appointment.isNoShow()).toBe(true);
      expect(appointment.getStatus()).toBe(AppointmentStatus.NO_SHOW);

      const noShowInfo = appointment.getNoShowInfo()!;
      expect(noShowInfo.getReason()).toBe(NoShowReason.MANUAL);
      expect(noShowInfo.getNotes()).toBe('Patient did not arrive');
    });

    it('should mark appointment as no-show with PATIENT_CALLED reason', () => {
      const aggregate = AppointmentAggregate.create(baseAppointment);

      const result = aggregate.markAsNoShow(
        NoShowReason.PATIENT_CALLED,
        'Patient called to reschedule',
        'user-1'
      );

      const appointment = result.getAppointment();
      const noShowInfo = appointment.getNoShowInfo()!;
      expect(noShowInfo.getReason()).toBe(NoShowReason.PATIENT_CALLED);
    });
  });

  describe('markAsNoShow - Invariants', () => {
    it('should throw if already checked in', () => {
      const checkedInAppointment = baseAppointment.checkIn(
        CheckInInfo.createOnTime({
          checkedInAt: new Date('2025-01-15T10:00:00'),
          checkedInBy: 'user-1',
        })
      );
      const aggregate = AppointmentAggregate.create(checkedInAppointment);

      expect(() => {
        aggregate.markAsNoShow(NoShowReason.MANUAL, 'Notes', 'user-1');
      }).toThrow(DomainException);
    });

    it('should throw if already marked as no-show (idempotency)', () => {
      const noShowAppointment = baseAppointment.markAsNoShow(
        NoShowInfo.create({
          noShowAt: new Date(),
          reason: NoShowReason.MANUAL,
          notes: 'Already marked',
        })
      );
      const aggregate = AppointmentAggregate.create(noShowAppointment);

      expect(() => {
        aggregate.markAsNoShow(NoShowReason.MANUAL, 'New notes', 'user-1');
      }).toThrow(DomainException);
    });

    it('should throw if appointment is cancelled', () => {
      const cancelledAppointment = Appointment.create({
        id: baseAppointment.getId(),
        patientId: baseAppointment.getPatientId(),
        doctorId: baseAppointment.getDoctorId(),
        appointmentDate: baseAppointment.getAppointmentDate(),
        time: baseAppointment.getTime(),
        status: AppointmentStatus.CANCELLED,
        type: baseAppointment.getType(),
      });
      const aggregate = AppointmentAggregate.create(cancelledAppointment);

      expect(() => {
        aggregate.markAsNoShow(NoShowReason.MANUAL, 'Notes', 'user-1');
      }).toThrow(DomainException);
    });
  });

  describe('autoDetectNoShow', () => {
    it('should auto-detect no-show after threshold', () => {
      const aggregate = AppointmentAggregate.create(baseAppointment);
      const now = new Date('2025-01-15T10:35:00'); // 35 minutes after 10:00
      const thresholdMinutes = 30;

      const result = aggregate.autoDetectNoShow(now, thresholdMinutes);

      const appointment = result.getAppointment();
      expect(appointment.isNoShow()).toBe(true);
      expect(appointment.getStatus()).toBe(AppointmentStatus.NO_SHOW);

      const noShowInfo = appointment.getNoShowInfo()!;
      expect(noShowInfo.getReason()).toBe(NoShowReason.AUTO);
      expect(noShowInfo.getNotes()).toContain('Automatically detected');
    });

    it('should not auto-detect if threshold not met', () => {
      const aggregate = AppointmentAggregate.create(baseAppointment);
      const now = new Date('2025-01-15T10:20:00'); // 20 minutes after 10:00
      const thresholdMinutes = 30;

      const result = aggregate.autoDetectNoShow(now, thresholdMinutes);

      // Should return unchanged aggregate
      expect(result).toBe(aggregate);
      expect(result.getAppointment().isNoShow()).toBe(false);
    });

    it('should be idempotent - return unchanged if already marked', () => {
      const noShowAppointment = baseAppointment.markAsNoShow(
        NoShowInfo.create({
          noShowAt: new Date('2025-01-15T10:30:00Z'),
          reason: NoShowReason.MANUAL,
        })
      );
      const aggregate = AppointmentAggregate.create(noShowAppointment);
      const now = new Date('2025-01-15T10:35:00Z');
      const thresholdMinutes = 30;

      const result = aggregate.autoDetectNoShow(now, thresholdMinutes);

      // Should return unchanged (idempotent)
      expect(result.getAppointment()).toBe(noShowAppointment);
    });

    it('should never override checked-in appointment', () => {
      const checkedInAppointment = baseAppointment.checkIn(
        CheckInInfo.createOnTime({
          checkedInAt: new Date('2025-01-15T10:00:00'),
          checkedInBy: 'user-1',
        })
      );
      const aggregate = AppointmentAggregate.create(checkedInAppointment);
      const now = new Date('2025-01-15T10:35:00Z'); // Well past threshold
      const thresholdMinutes = 30;

      const result = aggregate.autoDetectNoShow(now, thresholdMinutes);

      // Should return unchanged (never override checked-in)
      expect(result.getAppointment()).toBe(checkedInAppointment);
      expect(result.getAppointment().isCheckedIn()).toBe(true);
      expect(result.getAppointment().isNoShow()).toBe(false);
    });

    it('should not auto-detect if appointment cannot be marked as no-show', () => {
      const cancelledAppointment = Appointment.create({
        id: baseAppointment.getId(),
        patientId: baseAppointment.getPatientId(),
        doctorId: baseAppointment.getDoctorId(),
        appointmentDate: baseAppointment.getAppointmentDate(),
        time: baseAppointment.getTime(),
        status: AppointmentStatus.CANCELLED,
        type: baseAppointment.getType(),
      });
      const aggregate = AppointmentAggregate.create(cancelledAppointment);
      const now = new Date('2025-01-15T10:35:00Z');
      const thresholdMinutes = 30;

      const result = aggregate.autoDetectNoShow(now, thresholdMinutes);

      // Should return unchanged
      expect(result.getAppointment()).toBe(cancelledAppointment);
      expect(result.getAppointment().isNoShow()).toBe(false);
    });
  });

  describe('reverseNoShowWithCheckIn', () => {
    it('should reverse no-show and check in patient on time', () => {
      const noShowAppointment = baseAppointment.markAsNoShow(
        NoShowInfo.create({
          noShowAt: new Date('2025-01-15T10:30:00Z'),
          reason: NoShowReason.AUTO,
        })
      );
      const aggregate = AppointmentAggregate.create(noShowAppointment);
      const checkedInAt = new Date('2025-01-15T10:00:00'); // On time

      const result = aggregate.reverseNoShowWithCheckIn(checkedInAt, 'user-1');

      const appointment = result.getAppointment();
      expect(appointment.isCheckedIn()).toBe(true);
      expect(appointment.isNoShow()).toBe(false);
      expect(appointment.isLateArrival()).toBe(false);
      expect(appointment.getStatus()).toBe(AppointmentStatus.SCHEDULED);
    });

    it('should reverse no-show and check in patient late', () => {
      const noShowAppointment = baseAppointment.markAsNoShow(
        NoShowInfo.create({
          noShowAt: new Date('2025-01-15T10:30:00Z'),
          reason: NoShowReason.AUTO,
        })
      );
      const aggregate = AppointmentAggregate.create(noShowAppointment);
      const checkedInAt = new Date('2025-01-15T10:20:00'); // 20 minutes late

      const result = aggregate.reverseNoShowWithCheckIn(checkedInAt, 'user-1');

      const appointment = result.getAppointment();
      expect(appointment.isCheckedIn()).toBe(true);
      expect(appointment.isNoShow()).toBe(false);
      expect(appointment.isLateArrival()).toBe(true);

      const checkInInfo = appointment.getCheckInInfo()!;
      expect(checkInInfo.getLateByMinutes()).toBe(20);
    });

    it('should throw if no-show does not exist', () => {
      const aggregate = AppointmentAggregate.create(baseAppointment);

      expect(() => {
        aggregate.reverseNoShowWithCheckIn(new Date('2025-01-15T10:00:00'), 'user-1');
      }).toThrow(DomainException);
    });
  });

  describe('Invariant Preservation', () => {
    it('should prevent creating appointment with both check-in and no-show', () => {
      // This test verifies that the Appointment entity itself prevents invalid state
      expect(() => {
        Appointment.create({
          id: 1,
          patientId: 'patient-1',
          doctorId: 'doctor-1',
          appointmentDate,
          time: appointmentTime,
          status: AppointmentStatus.SCHEDULED,
          type: 'Consultation',
          checkInInfo: CheckInInfo.createOnTime({
            checkedInAt: new Date(),
            checkedInBy: 'user-1',
          }),
          noShowInfo: NoShowInfo.create({
            noShowAt: new Date(),
            reason: NoShowReason.MANUAL,
          }),
        });
      }).toThrow(DomainException);
    });

    it('should maintain status consistency after check-in', () => {
      const aggregate = AppointmentAggregate.create(baseAppointment);
      const result = aggregate.checkIn(new Date('2025-01-15T10:00:00Z'), 'user-1');

      const appointment = result.getAppointment();
      // Status should be SCHEDULED (was PENDING)
      expect(appointment.getStatus()).toBe(AppointmentStatus.SCHEDULED);
      expect(appointment.isCheckedIn()).toBe(true);
    });

    it('should maintain status consistency after no-show', () => {
      const aggregate = AppointmentAggregate.create(baseAppointment);
      const result = aggregate.markAsNoShow(NoShowReason.MANUAL, 'Notes', 'user-1');

      const appointment = result.getAppointment();
      // Status should be NO_SHOW
      expect(appointment.getStatus()).toBe(AppointmentStatus.NO_SHOW);
      expect(appointment.isNoShow()).toBe(true);
    });
  });
});
