/**
 * Procedure Tab Mappers
 * 
 * Business logic for procedure tab (normalization, payload building).
 * Pure functions only - no side effects, no React.
 */

import type { UpdateProcedureRequest } from './procedureParsers';
import { normalizeProcedurePlan } from './procedureParsers';

/**
 * Build update request payload from view model
 */
export function buildUpdateProcedurePayload(
  procedureName: string | null | undefined,
  procedurePlan: string | null | undefined
): UpdateProcedureRequest {
  return {
    procedureName: procedureName?.trim() || undefined,
    procedurePlan: normalizeProcedurePlan(procedurePlan) || undefined,
  };
}
