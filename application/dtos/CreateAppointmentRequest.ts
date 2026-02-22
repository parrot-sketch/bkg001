/**
 * DTO: CreateAppointmentRequest
 *
 * Request body schema for POST /api/appointments
 * Validated with Zod for type safety and runtime validation.
 */

import { z } from 'zod';
import { AppointmentSource } from '@/domain/enums/AppointmentSource';
import { BookingChannel } from '@/domain/enums/BookingChannel';

/**
 * Zod schema for creating an appointment
 */
export const createAppointmentRequestSchema = z.object({
  // Required fields
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  doctorId: z.string().uuid('Doctor ID must be a valid UUID'),
  appointmentDate: z.coerce.date({
    required_error: 'Appointment date is required',
    invalid_type_error: 'Appointment date must be a valid date',
  }).refine(
    (date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    },
    { message: 'Appointment date cannot be in the past' }
  ),
  time: z.string().regex(
    /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
    'Time must be in HH:mm format (24-hour)'
  ),
  type: z.string().min(1, 'Appointment type is required'),

  // Optional fields
  durationMinutes: z.number().int().min(15).max(240).optional(),
  reason: z.string().max(1000).optional(),
  note: z.string().max(2000).optional(),

  // Source (optional, will be defaulted based on role)
  source: z.nativeEnum(AppointmentSource).optional(),

  // Booking channel (optional, for analytics)
  bookingChannel: z.nativeEnum(BookingChannel).optional(),

  // Follow-up linkage (optional)
  parentAppointmentId: z.number().int().positive().optional(),
  parentConsultationId: z.number().int().positive().optional(),
});

export type CreateAppointmentRequest = z.infer<typeof createAppointmentRequestSchema>;
