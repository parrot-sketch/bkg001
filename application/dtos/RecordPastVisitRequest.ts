import { z } from 'zod';

export const PAST_VISIT_MAX_DAYS = 7;

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const recordPastVisitRequestSchema = z.object({
  patientId: z.string().uuid('Patient is required'),
  doctorId: z.string().uuid('Doctor is required'),
  appointmentDate: z.coerce.date({
    required_error: 'Visit date is required',
    invalid_type_error: 'Visit date must be a valid date',
  }),
  time: z.string().regex(timeRegex, 'Time must be in HH:mm format'),
  type: z.string().trim().min(1, 'Appointment type is required').max(100),
  lateEntryNote: z
    .string()
    .trim()
    .min(5, 'Please explain why this visit is being recorded late (min 5 characters)')
    .max(1000, 'Late-entry note is too long'),
  durationMinutes: z.number().int().min(15).max(240).optional(),
});

export type RecordPastVisitRequest = z.infer<typeof recordPastVisitRequestSchema>;
