/**
 * Domain Enum: PatientDecision
 * 
 * Represents the patient's decision regarding a recommended procedure.
 * Used when consultation outcome is PROCEDURE_RECOMMENDED or PATIENT_DECIDING.
 * 
 * This is a pure TypeScript enum with no framework dependencies.
 */

export enum PatientDecision {
  YES = 'YES',
  NO = 'NO',
  PENDING = 'PENDING',
}

/**
 * Type guard to check if a string is a valid PatientDecision
 */
export function isPatientDecision(value: string): value is PatientDecision {
  return Object.values(PatientDecision).includes(value as PatientDecision);
}

/**
 * Get user-friendly label for patient decision
 */
export function getPatientDecisionLabel(decision: PatientDecision): string {
  const labels: Record<PatientDecision, string> = {
    [PatientDecision.YES]: 'Yes, Proceed',
    [PatientDecision.NO]: 'No, Not Proceeding',
    [PatientDecision.PENDING]: 'Still Deciding',
  };
  return labels[decision];
}
