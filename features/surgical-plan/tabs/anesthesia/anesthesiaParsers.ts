/**
 * Anesthesia Tab Parsers
 * 
 * Zod schemas and parsers for anesthesia tab API requests.
 * All parsers throw ValidationError on invalid data.
 */

import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';
import { AnesthesiaType } from '@prisma/client';

// ============================================================================
// Update Anesthesia Request
// ============================================================================

const AnesthesiaTypeEnum = z.nativeEnum(AnesthesiaType);

export const UpdateAnesthesiaRequestSchema = z.object({
  anesthesiaPlan: AnesthesiaTypeEnum.nullable().optional(),
  specialInstructions: z.string().optional(),
  estimatedDurationMinutes: z.number().int().min(15).max(600).nullable().optional(),
}).strict();

export type UpdateAnesthesiaRequest = z.infer<typeof UpdateAnesthesiaRequestSchema>;

/**
 * Parse and validate update anesthesia request.
 * Throws ValidationError if invalid.
 */
export function parseUpdateAnesthesiaRequest(body: unknown): UpdateAnesthesiaRequest {
  try {
    return UpdateAnesthesiaRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid update anesthesia request');
    }
    throw error;
  }
}

/**
 * Normalize special instructions (empty string -> null)
 */
export function normalizeSpecialInstructions(html: string | null | undefined): string | null {
  if (!html || html.trim() === '' || html.trim() === '<p></p>') {
    return null;
  }
  return html.trim();
}
