/**
 * Constants for Surgical Plan Feature
 * 
 * Shared constants used across the surgical plan feature module.
 */

/**
 * Anesthesia types for selection dropdowns
 */
export const ANESTHESIA_TYPES = [
  { value: 'GENERAL', label: 'General Anesthesia' },
  { value: 'REGIONAL', label: 'Regional Anesthesia' },
  { value: 'LOCAL', label: 'Local Anesthesia' },
  { value: 'SEDATION', label: 'Sedation' },
  { value: 'TIVA', label: 'Total IV Anesthesia (TIVA)' },
  { value: 'MAC', label: 'Monitored Anesthesia Care (MAC)' },
] as const;

/**
 * Readiness status configuration
 */
export const READINESS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  READY: { label: 'Ready for Surgery', variant: 'default' },
  IN_PROGRESS: { label: 'In Progress', variant: 'secondary' },
  NOT_STARTED: { label: 'Not Started', variant: 'outline' },
  PENDING_LABS: { label: 'Pending Labs', variant: 'secondary' },
  PENDING_CONSENT: { label: 'Pending Consent', variant: 'secondary' },
  PENDING_REVIEW: { label: 'Pending Review', variant: 'secondary' },
  ON_HOLD: { label: 'On Hold', variant: 'destructive' },
};

/**
 * Case status configuration
 */
export const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
  PLANNING: { label: 'Planning', className: 'bg-blue-100 text-blue-700' },
  READY_FOR_SCHEDULING: { label: 'Ready for Scheduling', className: 'bg-cyan-100 text-cyan-700' },
  SCHEDULED: { label: 'Scheduled', className: 'bg-indigo-100 text-indigo-700' },
};

/**
 * Statuses where an operative timeline exists and should be shown
 */
export const OPERATIVE_STATUSES = new Set([
  'IN_PREP',
  'IN_THEATER',
  'RECOVERY',
  'COMPLETED',
]);
