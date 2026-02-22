import { describe, it, expect } from 'vitest';
import { AppointmentStatus, getDefaultStatusForSource } from '@/domain/enums/AppointmentStatus';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';

describe('AppointmentStatus.getDefaultStatusForSource', () => {
  it('should return PENDING_DOCTOR_CONFIRMATION for PATIENT_REQUESTED', () => {
    expect(getDefaultStatusForSource(AppointmentSource.PATIENT_REQUESTED)).toBe(
      AppointmentStatus.PENDING_DOCTOR_CONFIRMATION
    );
  });

  it('should return PENDING_DOCTOR_CONFIRMATION for FRONTDESK_SCHEDULED (requires doctor confirmation)', () => {
    expect(getDefaultStatusForSource(AppointmentSource.FRONTDESK_SCHEDULED)).toBe(
      AppointmentStatus.PENDING_DOCTOR_CONFIRMATION
    );
  });

  it('should return PENDING_DOCTOR_CONFIRMATION for ADMIN_SCHEDULED (requires doctor confirmation)', () => {
    expect(getDefaultStatusForSource(AppointmentSource.ADMIN_SCHEDULED)).toBe(
      AppointmentStatus.PENDING_DOCTOR_CONFIRMATION
    );
  });

  it('should return SCHEDULED for DOCTOR_FOLLOW_UP', () => {
    expect(getDefaultStatusForSource(AppointmentSource.DOCTOR_FOLLOW_UP)).toBe(
      AppointmentStatus.SCHEDULED
    );
  });

  it('should return PENDING_DOCTOR_CONFIRMATION for unknown source (defensive)', () => {
    expect(getDefaultStatusForSource('UNKNOWN_SOURCE')).toBe(
      AppointmentStatus.PENDING_DOCTOR_CONFIRMATION
    );
  });
});
