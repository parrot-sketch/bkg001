/**
 * Risk Factors Tab Mappers
 * 
 * Business logic for risk factors tab (template insertion, normalization).
 * Pure functions only - no side effects, no React.
 */

import type { UpdateRiskFactorsRequest } from './riskFactorsParsers';
import { normalizeRichText } from './riskFactorsParsers';

/**
 * Pre-op template HTML
 */
const PRE_OP_TEMPLATE = `
    <p><strong>Chief Complaint:</strong></p>
    <p>Patient presents for...</p>
    <p><strong>Examination:</strong></p>
    <p>Key findings...</p>
    <p><strong>Assessment:</strong></p>
    <p>Diagnosis confirmed as...</p>
    <p><strong>Plan:</strong></p>
    <p>Proceed with surgical intervention...</p>
`.trim();

/**
 * Insert pre-op template into existing notes
 * 
 * Pure function that returns the result without side effects.
 * Logic extracted from UI component.
 */
export function insertPreOpTemplate(
  currentNotes: string | null | undefined
): { nextHtml: string; changed: boolean } {
  const normalized = normalizeRichText(currentNotes) || '';
  
  // If notes are substantial (> 10 chars after stripping HTML), append
  // Otherwise, replace
  const hasContent = normalized.length > 10;
  
  if (hasContent) {
    return {
      nextHtml: normalized + '\n\n' + PRE_OP_TEMPLATE,
      changed: true,
    };
  }
  
  return {
    nextHtml: PRE_OP_TEMPLATE,
    changed: true,
  };
}

/**
 * Build update request payload from view model
 */
export function buildUpdateRiskFactorsPayload(
  riskFactors: string | null | undefined,
  preOpNotes: string | null | undefined
): UpdateRiskFactorsRequest {
  return {
    riskFactors: normalizeRichText(riskFactors) || undefined,
    preOpNotes: normalizeRichText(preOpNotes) || undefined,
  };
}
