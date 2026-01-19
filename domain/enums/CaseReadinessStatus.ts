/**
 * Domain Enum: CaseReadinessStatus
 * 
 * Represents the readiness status of a surgical case.
 */
export enum CaseReadinessStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING_LABS = 'PENDING_LABS',
  PENDING_CONSENT = 'PENDING_CONSENT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  READY = 'READY',
  ON_HOLD = 'ON_HOLD',
}

export function isCaseReadinessStatus(value: string): value is CaseReadinessStatus {
  return Object.values(CaseReadinessStatus).includes(value as CaseReadinessStatus);
}

export function getCaseReadinessStatusLabel(status: CaseReadinessStatus): string {
  const labels: Record<CaseReadinessStatus, string> = {
    [CaseReadinessStatus.NOT_STARTED]: 'Not Started',
    [CaseReadinessStatus.PENDING_LABS]: 'Pending Labs',
    [CaseReadinessStatus.PENDING_CONSENT]: 'Pending Consent',
    [CaseReadinessStatus.PENDING_REVIEW]: 'Pending Review',
    [CaseReadinessStatus.READY]: 'Ready',
    [CaseReadinessStatus.ON_HOLD]: 'On Hold',
  };
  return labels[status];
}
