/**
 * Domain Enum: ConsultationOutcomeType
 * 
 * Represents the possible outcomes of a consultation session.
 * This determines which workflow path the patient journey will follow.
 * 
 * This is a pure TypeScript enum with no framework dependencies.
 */

export enum ConsultationOutcomeType {
  PROCEDURE_RECOMMENDED = 'PROCEDURE_RECOMMENDED',
  CONSULTATION_ONLY = 'CONSULTATION_ONLY',
  FOLLOW_UP_CONSULTATION_NEEDED = 'FOLLOW_UP_CONSULTATION_NEEDED',
  PATIENT_DECIDING = 'PATIENT_DECIDING',
  REFERRAL_NEEDED = 'REFERRAL_NEEDED',
}

/**
 * Type guard to check if a string is a valid ConsultationOutcomeType
 */
export function isConsultationOutcomeType(value: string): value is ConsultationOutcomeType {
  return Object.values(ConsultationOutcomeType).includes(value as ConsultationOutcomeType);
}

/**
 * Get user-friendly label for consultation outcome type
 */
export function getConsultationOutcomeTypeLabel(type: ConsultationOutcomeType): string {
  const labels: Record<ConsultationOutcomeType, string> = {
    [ConsultationOutcomeType.PROCEDURE_RECOMMENDED]: 'Procedure Recommended',
    [ConsultationOutcomeType.CONSULTATION_ONLY]: 'Consultation Only',
    [ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED]: 'Follow-Up Consultation Needed',
    [ConsultationOutcomeType.PATIENT_DECIDING]: 'Patient Deciding',
    [ConsultationOutcomeType.REFERRAL_NEEDED]: 'Referral Needed',
  };
  return labels[type];
}

/**
 * Get description of what happens next for each outcome type
 */
export function getConsultationOutcomeTypeDescription(type: ConsultationOutcomeType): string {
  const descriptions: Record<ConsultationOutcomeType, string> = {
    [ConsultationOutcomeType.PROCEDURE_RECOMMENDED]: 'A procedure has been recommended. Case planning will be initiated.',
    [ConsultationOutcomeType.CONSULTATION_ONLY]: 'Consultation complete. No procedure recommended at this time.',
    [ConsultationOutcomeType.FOLLOW_UP_CONSULTATION_NEEDED]: 'A follow-up consultation is needed before making a decision.',
    [ConsultationOutcomeType.PATIENT_DECIDING]: 'Procedure recommended. Waiting for patient decision.',
    [ConsultationOutcomeType.REFERRAL_NEEDED]: 'Patient needs referral to another specialist or clinic.',
  };
  return descriptions[type];
}

/**
 * Check if outcome type requires case planning
 */
export function requiresCasePlanning(type: ConsultationOutcomeType): boolean {
  return type === ConsultationOutcomeType.PROCEDURE_RECOMMENDED || 
         type === ConsultationOutcomeType.PATIENT_DECIDING;
}
