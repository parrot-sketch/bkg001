/**
 * Unit tests for getDefaultStatusForSource
 * 
 * Verifies the single source of truth for the source → status mapping.
 */
import { describe, it, expect } from 'vitest';
import {
  AppointmentStatus,
  getDefaultStatusForSource
} from '../../../../domain/enums/AppointmentStatus';

describe('getDefaultStatusForSource', () => {
  it('PATIENT_REQUESTED → PENDING_DOCTOR_CONFIRMATION', () => {
    expect(getDefaultStatusForSource('PATIENT_REQUESTED'))
      .toBe(AppointmentStatus.PENDING_DOCTOR_CONFIRMATION);
  });

  it('FRONTDESK_SCHEDULED → PENDING_DOCTOR_CONFIRMATION (Hardened Workflow)', () => {
    expect(getDefaultStatusForSource('FRONTDESK_SCHEDULED'))
      .toBe(AppointmentStatus.PENDING_DOCTOR_CONFIRMATION);
  });

  it('DOCTOR_FOLLOW_UP → SCHEDULED', () => {
    expect(getDefaultStatusForSource('DOCTOR_FOLLOW_UP'))
      .toBe(AppointmentStatus.SCHEDULED);
  });

  it('ADMIN_SCHEDULED → PENDING_DOCTOR_CONFIRMATION', () => {
    expect(getDefaultStatusForSource('ADMIN_SCHEDULED'))
      .toBe(AppointmentStatus.PENDING_DOCTOR_CONFIRMATION);
  });

  it('unknown source → PENDING_DOCTOR_CONFIRMATION (defensive)', () => {
    expect(getDefaultStatusForSource('SOME_UNKNOWN_SOURCE'))
      .toBe(AppointmentStatus.PENDING_DOCTOR_CONFIRMATION);
  });

  it('empty string → PENDING_DOCTOR_CONFIRMATION (defensive)', () => {
    expect(getDefaultStatusForSource(''))
      .toBe(AppointmentStatus.PENDING_DOCTOR_CONFIRMATION);
  });
});
