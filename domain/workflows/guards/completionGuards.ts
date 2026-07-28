/**
 * Guard implementations for completion transitions.
 *
 * G-041: OutcomeSelected
 * G-042: NoPendingSave
 * G-043: UserConfirmedProceed
 * G-044: ConsultationInProgress
 * G-045: AppointmentNotCompleted
 * G-046: PatientIdentityVerified
 * G-047: VersionCurrent
 * G-048: BillingSummaryPresent
 * G-049: QueueOwnershipValid
 * G-050: AdvisoryWarningsReviewed
 */

import type { GuardContext } from '../GuardContext';
import type { GuardResult } from '../GuardResult';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

export function G_041_OutcomeSelected(ctx: GuardContext): GuardResult {
  const valid = ctx.outcomeType !== null && ctx.outcomeType !== undefined;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-041', reason: 'No consultation outcome selected', clinicalRisk: 'medium' };
}

export function G_042_NoPendingSave(ctx: GuardContext): GuardResult {
  const userOverride = (ctx.metadata?.userConfirmUnsaved as boolean | undefined) === true;
  const completedStates = ['Document', 'Draft', 'Saved'];
  const isCleanDocs = completedStates.includes(ctx.documentationWorkflowState);
  const valid = isCleanDocs || userOverride;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-042', reason: 'Unsaved notes exist. Save before completing or confirm data loss.', clinicalRisk: 'high' };
}

export function G_043_UserConfirmedProceed(ctx: GuardContext): GuardResult {
  const isFailed = ctx.documentationWorkflowState === 'Failed';
  if (!isFailed) {
    return { passed: true };
  }
  const confirmed = (ctx.metadata?.userConfirmUnsaved as boolean | undefined) === true;
  return confirmed
    ? { passed: true }
    : { passed: false, guardId: 'G-043', reason: 'Save failed and user did not confirm proceed without saving', clinicalRisk: 'high' };
}

export function G_044_ConsultationInProgress(ctx: GuardContext): GuardResult {
  const valid = ctx.consultation?.state === 'IN_PROGRESS';
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-044', reason: `Consultation state ${ctx.consultation?.state ?? 'null'} is not IN_PROGRESS`, clinicalRisk: 'high' };
}

export function G_045_AppointmentNotCompleted(ctx: GuardContext): GuardResult {
  const valid = ctx.appointment?.status !== AppointmentStatus.COMPLETED && ctx.appointment?.status !== AppointmentStatus.CANCELLED;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-045', reason: `Appointment is ${ctx.appointment?.status ?? 'null'}`, clinicalRisk: 'high' };
}

export function G_046_PatientIdentityVerified(ctx: GuardContext): GuardResult {
  if (!ctx.appointment || !ctx.patientId) {
    return { passed: false, guardId: 'G-046', reason: 'Missing data for identity verification', clinicalRisk: 'high' };
  }
  const valid = ctx.appointment.patientId === ctx.patientId;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-046', reason: 'Patient identity does not match appointment', clinicalRisk: 'high' };
}

export function G_047_VersionCurrent(ctx: GuardContext): GuardResult {
  const clientVersion = ctx.version;
  const serverVersion = ctx.consultation?.version;
  if (!clientVersion || !serverVersion) {
    return { passed: true };
  }
  const valid = clientVersion <= serverVersion;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-047', reason: 'Client version is ahead of server version', clinicalRisk: 'medium' };
}

export function G_048_BillingSummaryPresent(ctx: GuardContext): GuardResult {
  const billing = ctx.metadata?.billingSummary;
  const valid = billing !== null && billing !== undefined;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-048', reason: 'Billing summary not loaded — using defaults', clinicalRisk: 'none' };
}

export function G_049_QueueOwnershipValid(ctx: GuardContext): GuardResult {
  if (!ctx.appointment || !ctx.user) {
    return { passed: false, guardId: 'G-049', reason: 'Missing data for queue ownership check', clinicalRisk: 'high' };
  }
  const valid = ctx.appointment.doctorId === (ctx.user.doctorId ?? ctx.user.id);
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-049', reason: 'Doctor not authorized for this appointment', clinicalRisk: 'high' };
}

export function G_050_AdvisoryWarningsReviewed(ctx: GuardContext): GuardResult {
  const warnings = (ctx.metadata?.advisoryWarnings as Array<{ readonly critical: boolean; readonly acknowledged: boolean }> | undefined) ?? [];
  const unacknowledgedCritical = warnings.some(w => w.critical && !w.acknowledged);
  const valid = !unacknowledgedCritical;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-050', reason: 'Unacknowledged critical advisory warnings exist', clinicalRisk: 'high' };
}
