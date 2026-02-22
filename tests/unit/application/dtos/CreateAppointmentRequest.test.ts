import { describe, it, expect } from 'vitest';
import { createAppointmentRequestSchema } from '@/application/dtos/CreateAppointmentRequest';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';

describe('createAppointmentRequestSchema', () => {
  const validRequest = {
    patientId: '123e4567-e89b-12d3-a456-426614174000',
    doctorId: '123e4567-e89b-12d3-a456-426614174001',
    appointmentDate: new Date('2025-12-31'),
    time: '14:30',
    type: 'Consultation',
  };

  it('should validate a valid request', () => {
    const result = createAppointmentRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.patientId).toBe(validRequest.patientId);
      expect(result.data.doctorId).toBe(validRequest.doctorId);
      expect(result.data.time).toBe(validRequest.time);
      expect(result.data.type).toBe(validRequest.type);
    }
  });

  it('should accept optional fields', () => {
    const requestWithOptionals = {
      ...validRequest,
      durationMinutes: 45,
      reason: 'Follow-up consultation',
      note: 'Patient requested morning slot',
      source: AppointmentSource.FRONTDESK_SCHEDULED,
      bookingChannel: BookingChannel.DASHBOARD,
      parentAppointmentId: 123,
    };
    const result = createAppointmentRequestSchema.safeParse(requestWithOptionals);
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID for patientId', () => {
    const result = createAppointmentRequestSchema.safeParse({
      ...validRequest,
      patientId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('UUID');
    }
  });

  it('should reject invalid UUID for doctorId', () => {
    const result = createAppointmentRequestSchema.safeParse({
      ...validRequest,
      doctorId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('UUID');
    }
  });

  it('should reject past dates', () => {
    const pastDate = new Date('2020-01-01');
    const result = createAppointmentRequestSchema.safeParse({
      ...validRequest,
      appointmentDate: pastDate,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('past');
    }
  });

  it('should reject invalid time format', () => {
    const result = createAppointmentRequestSchema.safeParse({
      ...validRequest,
      time: '2:30 PM', // Invalid format, should be HH:mm
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('HH:mm');
    }
  });

  it('should reject missing required fields', () => {
    const result = createAppointmentRequestSchema.safeParse({
      patientId: validRequest.patientId,
      // Missing doctorId, appointmentDate, time, type
    });
    expect(result.success).toBe(false);
  });

  it('should reject durationMinutes outside bounds', () => {
    const resultTooShort = createAppointmentRequestSchema.safeParse({
      ...validRequest,
      durationMinutes: 10, // Less than 15
    });
    expect(resultTooShort.success).toBe(false);

    const resultTooLong = createAppointmentRequestSchema.safeParse({
      ...validRequest,
      durationMinutes: 300, // More than 240
    });
    expect(resultTooLong.success).toBe(false);
  });

  it('should accept valid durationMinutes', () => {
    const result = createAppointmentRequestSchema.safeParse({
      ...validRequest,
      durationMinutes: 30,
    });
    expect(result.success).toBe(true);
  });

  it('should validate source enum', () => {
    const result = createAppointmentRequestSchema.safeParse({
      ...validRequest,
      source: AppointmentSource.FRONTDESK_SCHEDULED,
    });
    expect(result.success).toBe(true);
  });

  it('should validate bookingChannel enum', () => {
    const result = createAppointmentRequestSchema.safeParse({
      ...validRequest,
      bookingChannel: BookingChannel.DASHBOARD,
    });
    expect(result.success).toBe(true);
  });
});
