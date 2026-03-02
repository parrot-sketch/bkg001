/**
 * Risk Factors Tab Parsers
 * 
 * Zod schemas and parsers for risk factors tab API requests.
 * All parsers throw ValidationError on invalid data.
 */

import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';

// ============================================================================
// Update Risk Factors Request
// ============================================================================

export const UpdateRiskFactorsRequestSchema = z.object({
  riskFactors: z.string().optional(),
  preOpNotes: z.string().optional(),
}).strict();

export type UpdateRiskFactorsRequest = z.infer<typeof UpdateRiskFactorsRequestSchema>;

/**
 * Parse and validate update risk factors request.
 * Throws ValidationError if invalid.
 */
export function parseUpdateRiskFactorsRequest(body: unknown): UpdateRiskFactorsRequest {
  try {
    return UpdateRiskFactorsRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid update risk factors request');
    }
    throw error;
  }
}

/**
 * Normalize rich text fields (empty string -> null, strip empty tags)
 */
export function normalizeRichText(html: string | null | undefined): string | null {
  if (!html || html.trim() === '' || html.trim() === '<p></p>') {
    return null;
  }
  return html.trim();
}
