/**
 * Domain Enum: ConsultStatus
 * 
 * Represents the status of a doctor-to-doctor consultation.
 */
export enum ConsultStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export function isConsultStatus(value: string): value is ConsultStatus {
  return Object.values(ConsultStatus).includes(value as ConsultStatus);
}
