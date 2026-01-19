/**
 * Domain Enum: OutcomeStatus
 * 
 * Represents the outcome status of a surgical procedure.
 */
export enum OutcomeStatus {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  SATISFACTORY = 'SATISFACTORY',
  NEEDS_REVISION = 'NEEDS_REVISION',
  COMPLICATION = 'COMPLICATION',
}

export function isOutcomeStatus(value: string): value is OutcomeStatus {
  return Object.values(OutcomeStatus).includes(value as OutcomeStatus);
}

export function getOutcomeStatusLabel(status: OutcomeStatus): string {
  const labels: Record<OutcomeStatus, string> = {
    [OutcomeStatus.EXCELLENT]: 'Excellent',
    [OutcomeStatus.GOOD]: 'Good',
    [OutcomeStatus.SATISFACTORY]: 'Satisfactory',
    [OutcomeStatus.NEEDS_REVISION]: 'Needs Revision',
    [OutcomeStatus.COMPLICATION]: 'Complication',
  };
  return labels[status];
}

export function getOutcomeStatusColor(status: OutcomeStatus): string {
  const colors: Record<OutcomeStatus, string> = {
    [OutcomeStatus.EXCELLENT]: 'text-green-700 bg-green-100',
    [OutcomeStatus.GOOD]: 'text-green-600 bg-green-50',
    [OutcomeStatus.SATISFACTORY]: 'text-yellow-600 bg-yellow-50',
    [OutcomeStatus.NEEDS_REVISION]: 'text-orange-600 bg-orange-50',
    [OutcomeStatus.COMPLICATION]: 'text-red-600 bg-red-50',
  };
  return colors[status];
}
