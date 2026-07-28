/**
 * Shared Kernel — Note Serialization Utilities
 *
 * Pure functions for consultation note serialization and legacy parsing.
 *
 * These utilities operate on the canonical StructuredNotes shape and
 * preserve exact compatibility with existing localStorage payloads and
 * API payloads.
 */

import type { StructuredNotes } from '../types/notes';

export function generateFullText(notes: StructuredNotes): string {
  const parts: string[] = [];

  if (notes.chiefComplaint) {
    parts.push(`PATIENT CONCERNS:\n${notes.chiefComplaint}`);
  }

  const combinedPlanParts: string[] = [];
  if (notes.examination) combinedPlanParts.push(notes.examination);
  if (notes.plan) combinedPlanParts.push(notes.plan);

  if (combinedPlanParts.length > 0) {
    parts.push(`TREATMENT PLAN & CLINICAL NOTES:\n${combinedPlanParts.join('\n\n')}`);
  }

  return parts.join('\n\n' + '='.repeat(40) + '\n\n');
}

export function parseLegacyNotes(fullText: string): StructuredNotes {
  const notes: StructuredNotes = {};

  const chiefMatch = fullText.match(/Chief Complaint:([\s\S]*?)(?:Examination:|Assessment:|Plan:|=== CONSULTATION OUTCOME ===|$)/i);
  const examMatch = fullText.match(/Examination:([\s\S]*?)(?:Assessment:|Plan:|=== CONSULTATION OUTCOME ===|$)/i);
  const assessmentMatch = fullText.match(/Assessment:([\s\S]*?)(?:Plan:|=== CONSULTATION OUTCOME ===|$)/i);
  const planMatch = fullText.match(/Plan:([\s\S]*?)(=== CONSULTATION OUTCOME ===|$)/i);

  if (chiefMatch) notes.chiefComplaint = chiefMatch[1].trim();
  if (examMatch) notes.examination = examMatch[1].trim();
  if (assessmentMatch) notes.assessment = assessmentMatch[1].trim();
  if (planMatch) notes.plan = planMatch[1].trim();

  return notes;
}
