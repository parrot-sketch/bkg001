/**
 * Zod Validation Schemas for Theater Tech API
 *
 * All request body validation for theater tech endpoints.
 * Ensures type safety and provides clear error messages.
 */

import { z } from 'zod';

// ============================================================================
// CASE TRANSITION
// ============================================================================

export const CaseTransitionSchema = z.object({
  action: z.enum(['IN_PREP', 'IN_THEATER', 'RECOVERY', 'COMPLETED'], {
    required_error: 'Transition action is required',
    invalid_type_error: 'Invalid transition action',
  }),
  reason: z.string().max(500).optional(),
});

export type CaseTransitionInput = z.infer<typeof CaseTransitionSchema>;

// ============================================================================
// PROCEDURE RECORD TIMESTAMPS
// ============================================================================

const isoDatetime = z.string().datetime({ message: 'Must be a valid ISO 8601 datetime' });

export const ProcedureTimestampSchema = z
  .object({
    anesthesiaStart: isoDatetime.optional(),
    incisionTime: isoDatetime.optional(),
    closureTime: isoDatetime.optional(),
    wheelsOut: isoDatetime.optional(),
  })
  .refine(
    (data) =>
      data.anesthesiaStart !== undefined ||
      data.incisionTime !== undefined ||
      data.closureTime !== undefined ||
      data.wheelsOut !== undefined,
    { message: 'At least one timestamp field must be provided' }
  );

export type ProcedureTimestampInput = z.infer<typeof ProcedureTimestampSchema>;

// ============================================================================
// CHECKLIST
// ============================================================================

const ChecklistItemSchema = z.object({
  key: z.string().min(1, 'Item key is required'),
  label: z.string().min(1, 'Item label is required'),
  confirmed: z.boolean(),
  note: z.string().max(500).optional(),
});

export const ChecklistUpdateSchema = z.object({
  phase: z.enum(['SIGN_IN', 'TIME_OUT', 'SIGN_OUT'], {
    required_error: 'Checklist phase is required',
    invalid_type_error: 'Invalid checklist phase',
  }),
  items: z
    .array(ChecklistItemSchema)
    .min(1, 'At least one checklist item is required'),
});

export type ChecklistUpdateInput = z.infer<typeof ChecklistUpdateSchema>;
