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
  procedurePlan: string | null | undefined,
  equipmentNotes: string | null | undefined,
  patientPositioning: string | null | undefined,
  surgeonNarrative: string | null | undefined,
  postOpInstructions: string | null | undefined
): UpdateProcedureRequest {
  return {
    procedureName: procedureName?.trim() || undefined,
    procedurePlan: normalizeProcedurePlan(procedurePlan) || undefined,
    equipmentNotes: equipmentNotes?.trim() || undefined,
    patientPositioning: patientPositioning?.trim() || undefined,
    surgeonNarrative: normalizeProcedurePlan(surgeonNarrative) || undefined,
    postOpInstructions: normalizeProcedurePlan(postOpInstructions) || undefined,
  };
}
