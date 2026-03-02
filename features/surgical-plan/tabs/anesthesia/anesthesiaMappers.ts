/**
 * Anesthesia Tab Mappers
 * 
 * Business logic for anesthesia tab (normalization, payload building).
 * Pure functions only - no side effects, no React.
 */

import type { UpdateAnesthesiaRequest } from './anesthesiaParsers';
import { normalizeSpecialInstructions } from './anesthesiaParsers';
import { AnesthesiaType } from '@prisma/client';

/**
 * Build update request payload from view model
 */
export function buildUpdateAnesthesiaPayload(
  anesthesiaPlan: AnesthesiaType | null | undefined,
  specialInstructions: string | null | undefined,
  estimatedDurationMinutes: number | null | undefined
): UpdateAnesthesiaRequest {
  return {
    anesthesiaPlan: anesthesiaPlan || null,
    specialInstructions: normalizeSpecialInstructions(specialInstructions) || undefined,
    estimatedDurationMinutes: estimatedDurationMinutes || null,
  };
}
