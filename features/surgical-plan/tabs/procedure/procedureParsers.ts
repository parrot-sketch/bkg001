/**
 * Procedure Tab Parsers
 * 
 * Zod schemas and parsers for procedure tab API requests.
 * All parsers throw ValidationError on invalid data.
 */

import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';

// ============================================================================
// Update Procedure Request
// ============================================================================

export const UpdateProcedureRequestSchema = z.object({
  procedureName: z.string().min(1, 'Procedure name is required').optional(),
  procedurePlan: z.string().optional(),
  equipmentNotes: z.string().optional(),
  patientPositioning: z.string().optional(),
  surgeonNarrative: z.string().optional(),
  postOpInstructions: z.string().optional(),
}).strict();

export type UpdateProcedureRequest = z.infer<typeof UpdateProcedureRequestSchema>;

/**
 * Parse and validate update procedure request.
 * Throws ValidationError if invalid.
 */
export function parseUpdateProcedureRequest(body: unknown): UpdateProcedureRequest {
  try {
    return UpdateProcedureRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid update procedure request');
    }
    throw error;
  }
}

/**
 * Normalize procedure plan HTML (empty string -> null, strip empty tags)
 */
export function normalizeProcedurePlan(html: string | null | undefined): string | null {
  if (!html || html.trim() === '' || html.trim() === '<p></p>') {
    return null;
  }
  return html.trim();
}
