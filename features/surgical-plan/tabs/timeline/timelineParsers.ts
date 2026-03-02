/**
 * Timeline Tab Parsers
 * 
 * Zod schemas and parsers for timeline API responses.
 * All parsers throw ValidationError on invalid data.
 */

import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';

// ============================================================================
// Timeline Response Schema
// ============================================================================

const TimelineSchema = z.object({
  wheelsIn: z.string().datetime().nullable(),
  anesthesiaStart: z.string().datetime().nullable(),
  anesthesiaEnd: z.string().datetime().nullable(),
  incisionTime: z.string().datetime().nullable(),
  closureTime: z.string().datetime().nullable(),
  wheelsOut: z.string().datetime().nullable(),
});

const DurationsSchema = z.object({
  orTimeMinutes: z.number().nullable(),
  surgeryTimeMinutes: z.number().nullable(),
  prepTimeMinutes: z.number().nullable(),
  closeOutTimeMinutes: z.number().nullable(),
  anesthesiaTimeMinutes: z.number().nullable(),
});

const MissingItemSchema = z.object({
  field: z.string(),
  label: z.string(),
});

export const TimelineResponseSchema = z.object({
  caseId: z.string().uuid(),
  caseStatus: z.string(),
  timeline: TimelineSchema,
  durations: DurationsSchema,
  missingItems: z.array(MissingItemSchema),
});

export type TimelineResponseDto = z.infer<typeof TimelineResponseSchema>;

/**
 * Parse and validate timeline response.
 * Throws ValidationError if invalid.
 */
export function parseTimelineResponse(data: unknown): TimelineResponseDto {
  try {
    return TimelineResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid timeline response');
    }
    throw error;
  }
}
