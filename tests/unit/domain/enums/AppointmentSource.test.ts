/**
 * Unit tests for AppointmentSource enum and type guard
 */
import { describe, it, expect } from 'vitest';
import { 
  AppointmentSource, 
  isAppointmentSource 
} from '../../../../domain/enums/AppointmentSource';

describe('AppointmentSource', () => {
  it('has exactly 4 values', () => {
    const values = Object.values(AppointmentSource);
    expect(values).toHaveLength(4);
  });

  it('values match Prisma enum', () => {
    expect(AppointmentSource.PATIENT_REQUESTED).toBe('PATIENT_REQUESTED');
    expect(AppointmentSource.FRONTDESK_SCHEDULED).toBe('FRONTDESK_SCHEDULED');
    expect(AppointmentSource.DOCTOR_FOLLOW_UP).toBe('DOCTOR_FOLLOW_UP');
    expect(AppointmentSource.ADMIN_SCHEDULED).toBe('ADMIN_SCHEDULED');
  });
});

describe('isAppointmentSource', () => {
  it('returns true for valid sources', () => {
    expect(isAppointmentSource('PATIENT_REQUESTED')).toBe(true);
    expect(isAppointmentSource('FRONTDESK_SCHEDULED')).toBe(true);
    expect(isAppointmentSource('DOCTOR_FOLLOW_UP')).toBe(true);
    expect(isAppointmentSource('ADMIN_SCHEDULED')).toBe(true);
  });

  it('returns false for invalid strings', () => {
    expect(isAppointmentSource('UNKNOWN')).toBe(false);
    expect(isAppointmentSource('')).toBe(false);
    expect(isAppointmentSource('patient_requested')).toBe(false); // case sensitive
  });
});
