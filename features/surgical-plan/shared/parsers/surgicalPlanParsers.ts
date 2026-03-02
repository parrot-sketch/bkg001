/**
 * Surgical Plan Parsers
 * 
 * Zod schemas and parsers for surgical plan API requests/responses.
 * All parsers throw ValidationError on invalid data.
 */

import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';

// ============================================================================
// Path Parameters
// ============================================================================

export const CaseIdParamSchema = z.object({
  caseId: z.string().uuid('Invalid case ID format'),
});

export type CaseIdParam = z.infer<typeof CaseIdParamSchema>;

/**
 * Parse and validate case ID from path parameters.
 * Throws ValidationError if invalid.
 */
export function parseCaseIdParam(params: unknown): CaseIdParam {
  try {
    return CaseIdParamSchema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid case ID parameter');
    }
    throw error;
  }
}

// ============================================================================
// Update Clinical Plan Request
// ============================================================================

export const UpdateClinicalPlanRequestSchema = z.object({
  procedureName: z.string().optional(),
  procedurePlan: z.string().optional(),
  riskFactors: z.string().optional(),
  preOpNotes: z.string().optional(),
  implantDetails: z.string().optional(),
  anesthesiaPlan: z.string().optional(),
  specialInstructions: z.string().optional(),
  estimatedDurationMinutes: z.number().int().min(15).max(600).nullable().optional(),
  readinessStatus: z.string().optional(),
}).strict();

export type UpdateClinicalPlanRequest = z.infer<typeof UpdateClinicalPlanRequestSchema>;

/**
 * Parse and validate update clinical plan request body.
 * Throws ValidationError if invalid.
 */
export function parseUpdateClinicalPlanRequest(body: unknown): UpdateClinicalPlanRequest {
  try {
    return UpdateClinicalPlanRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid update clinical plan request');
    }
    throw error;
  }
}

// ============================================================================
// Surgical Plan Detail Response (minimal subset for Phase 1)
// ============================================================================

const ReadinessChecklistItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  done: z.boolean(),
});

const PatientSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  fileNumber: z.string().nullable(),
  gender: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  allergies: z.string().nullable(),
}).nullable();

const PrimarySurgeonSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
}).nullable();

const TheaterBookingSchema = z.object({
  id: z.string().uuid(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.string(),
  theaterName: z.string().nullable(),
}).nullable();

const CasePlanSchema = z.object({
  id: z.number(),
  appointmentId: z.number(),
  procedurePlan: z.string().nullable(),
  riskFactors: z.string().nullable(),
  preOpNotes: z.string().nullable(),
  implantDetails: z.string().nullable(),
  anesthesiaPlan: z.string().nullable(),
  specialInstructions: z.string().nullable(),
  estimatedDurationMinutes: z.number().nullable(),
  readinessStatus: z.string(),
  readyForSurgery: z.boolean(),
  updatedAt: z.string(),
  consents: z.array(z.any()),
  images: z.array(z.any()),
  procedureRecord: z.any().nullable(),
}).nullable();

export const SurgicalPlanDetailResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  urgency: z.string(),
  diagnosis: z.string().nullable(),
  procedureName: z.string().nullable(),
  side: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  patient: PatientSchema,
  primarySurgeon: PrimarySurgeonSchema,
  theaterBooking: TheaterBookingSchema,
  casePlan: CasePlanSchema,
  readinessChecklist: z.array(ReadinessChecklistItemSchema),
});

export type SurgicalPlanDetailResponse = z.infer<typeof SurgicalPlanDetailResponseSchema>;

/**
 * Parse and validate surgical plan detail response.
 * Throws ValidationError if invalid.
 */
export function parseSurgicalPlanDetailResponse(data: unknown): SurgicalPlanDetailResponse {
  try {
    return SurgicalPlanDetailResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid surgical plan detail response');
    }
    throw error;
  }
}

// ============================================================================
// Timeline Response
// ============================================================================

const TimelineSchema = z.object({
  wheelsIn: z.string().nullable(),
  anesthesiaStart: z.string().nullable(),
  anesthesiaEnd: z.string().nullable(),
  incisionTime: z.string().nullable(),
  closureTime: z.string().nullable(),
  wheelsOut: z.string().nullable(),
});

const DurationsSchema = z.object({
  orTimeMinutes: z.number().nullable(),
  surgeryTimeMinutes: z.number().nullable(),
  prepTimeMinutes: z.number().nullable(),
  closeOutTimeMinutes: z.number().nullable(),
  anesthesiaTimeMinutes: z.number().nullable(),
});

export const TimelineResultResponseSchema = z.object({
  caseId: z.string().uuid(),
  caseStatus: z.string(),
  timeline: TimelineSchema,
  durations: DurationsSchema,
  missingItems: z.array(z.object({
    field: z.string(),
    label: z.string(),
  })),
});

export type TimelineResultResponse = z.infer<typeof TimelineResultResponseSchema>;

/**
 * Parse and validate timeline result response.
 * Throws ValidationError if invalid.
 */
export function parseTimelineResultResponse(data: unknown): TimelineResultResponse {
  try {
    return TimelineResultResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid timeline result response');
    }
    throw error;
  }
}
