/**
 * Test Utilities and Custom Matchers
 * 
 * Provides convenient assertions and helpers for testing appointment-related code.
 * Extends Vitest's assertion library with domain-specific matchers.
 */

import { expect } from 'vitest';
import { Appointment } from '@domain/entities/Appointment';
import { AppointmentStatus } from '@domain/enums/AppointmentStatus';

/**
 * Custom Vitest matchers for Appointments
 */
declare global {
  namespace Vi {
    interface Matchers<R> {
      /**
       * Assert that an appointment has a specific status
       * @param expected - The expected status
       */
      toHaveStatus(expected: AppointmentStatus): R;

      /**
       * Assert that an appointment is scheduled for a specific date
       * @param expected - The expected date (YYYY-MM-DD format or Date object)
       */
      toBeScheduledOn(expected: string | Date): R;

      /**
       * Assert that an appointment is scheduled for a specific time
       * @param expected - The expected time (HH:mm format)
       */
      toBeScheduledAt(expected: string): R;

      /**
       * Assert that an appointment belongs to a specific doctor
       * @param expected - The expected doctor ID
       */
      toBeFor(expected: string): R;

      /**
       * Assert that an appointment belongs to a specific patient
       * @param expected - The expected patient ID
       */
      toBeOfPatient(expected: string): R;
    }
  }
}

/**
 * Setup custom matchers
 * Call this in your test setup file
 */
export function setupCustomMatchers(): void {
  // Status matcher
  expect.extend({
    toHaveStatus(received: Appointment, expected: AppointmentStatus) {
      const actual = (received as any).status;
      const pass = actual === expected;

      return {
        pass,
        message: () =>
          `expected appointment to have status ${expected}, but got ${actual}`,
      };
    },

    toBeScheduledOn(received: Appointment, expected: string | Date) {
      const expectedDate = typeof expected === 'string' ? new Date(expected) : expected;
      const actualDate = new Date((received as any).appointment_date);

      const pass =
        actualDate.getFullYear() === expectedDate.getFullYear() &&
        actualDate.getMonth() === expectedDate.getMonth() &&
        actualDate.getDate() === expectedDate.getDate();

      return {
        pass,
        message: () =>
          `expected appointment to be scheduled on ${expectedDate.toISOString().split('T')[0]}, ` +
          `but got ${actualDate.toISOString().split('T')[0]}`,
      };
    },

    toBeScheduledAt(received: Appointment, expected: string) {
      const actual = (received as any).time;
      const pass = actual === expected;

      return {
        pass,
        message: () =>
          `expected appointment to be scheduled at ${expected}, but got ${actual}`,
      };
    },

    toBeFor(received: Appointment, expected: string) {
      const actual = (received as any).doctor_id || (received as any).getDoctorId?.();
      const pass = actual === expected;

      return {
        pass,
        message: () =>
          `expected appointment to be for doctor ${expected}, but got ${actual}`,
      };
    },

    toBeOfPatient(received: Appointment, expected: string) {
      const actual = (received as any).patient_id || (received as any).getPatientId?.();
      const pass = actual === expected;

      return {
        pass,
        message: () =>
          `expected appointment to be of patient ${expected}, but got ${actual}`,
      };
    },
  });
}

/**
 * Assertion helpers for appointments
 */
export const appointmentAssertions = {
  /**
   * Assert that an appointment has a specific status
   */
  assertStatus(apt: Appointment, expected: AppointmentStatus): void {
    const actual = (apt as any).status;
    if (actual !== expected) {
      throw new Error(`Expected status ${expected}, got ${actual}`);
    }
  },

  /**
   * Assert that an appointment is scheduled for a specific doctor
   */
  assertDoctor(apt: Appointment, expected: string): void {
    const actual = (apt as any).doctor_id || (apt as any).getDoctorId?.();
    if (actual !== expected) {
      throw new Error(`Expected doctor ${expected}, got ${actual}`);
    }
  },

  /**
   * Assert that an appointment belongs to a specific patient
   */
  assertPatient(apt: Appointment, expected: string): void {
    const actual = (apt as any).patient_id || (apt as any).getPatientId?.();
    if (actual !== expected) {
      throw new Error(`Expected patient ${expected}, got ${actual}`);
    }
  },

  /**
   * Assert that an appointment has a specific time slot
   */
  assertTimeSlot(apt: Appointment, expectedDate: Date, expectedTime: string): void {
    const actualDate = new Date((apt as any).appointment_date);
    const actualTime = (apt as any).time;

    const dateDatesMatch =
      actualDate.getFullYear() === expectedDate.getFullYear() &&
      actualDate.getMonth() === expectedDate.getMonth() &&
      actualDate.getDate() === expectedDate.getDate();

    if (!dateDatesMatch) {
      throw new Error(
        `Expected date ${expectedDate.toDateString()}, got ${actualDate.toDateString()}`
      );
    }

    if (actualTime !== expectedTime) {
      throw new Error(`Expected time ${expectedTime}, got ${actualTime}`);
    }
  },
};

/**
 * Test data generators
 */
export const testDataGenerators = {
  /**
   * Generate a unique doctor ID
   */
  doctorId(seed: number = 1): string {
    return `doctor-${seed}-${Date.now()}`;
  },

  /**
   * Generate a unique patient ID
   */
  patientId(seed: number = 1): string {
    return `patient-${seed}-${Date.now()}`;
  },

  /**
   * Generate a unique user ID
   */
  userId(seed: number = 1): string {
    return `user-${seed}-${Date.now()}`;
  },

  /**
   * Generate a future date (days from now)
   */
  futureDate(daysFromNow: number = 7): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  },

  /**
   * Generate a past date (days ago)
   */
  pastDate(daysAgo: number = 7): Date {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  },

  /**
   * Generate a time string (HH:mm format)
   */
  timeSlot(hour: number = 14, minute: number = 30): string {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  },
};
