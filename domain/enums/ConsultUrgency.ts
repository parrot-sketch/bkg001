/**
 * Domain Enum: ConsultUrgency
 * 
 * Represents the urgency level of a doctor-to-doctor consultation.
 */
export enum ConsultUrgency {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  INTRA_OP = 'INTRA_OP',
}

export function isConsultUrgency(value: string): value is ConsultUrgency {
  return Object.values(ConsultUrgency).includes(value as ConsultUrgency);
}
