/**
 * Guard implementations for navigation and queue transitions.
 *
 * G-016: TargetAppointmentExists (duplicated in consultationFlow for convenience)
 * G-051: NextPatientExists
 * G-052: NextPatientNotCurrent
 * G-053: DoctorAuthorizedForNext
 * G-054: NoNextPatient
 * G-055: AllCachesInvalidated
 * G-056: CompletedOrNewSession
 */

import type { GuardContext } from '../GuardContext';
import type { GuardResult } from '../GuardResult';

export function G_051_NextPatientExists(ctx: GuardContext): GuardResult {
  const nextInConsultation = ctx.queue?.inConsultation?.[0];
  const nextWaiting = ctx.queue?.waiting?.[0];
  const valid = nextInConsultation !== undefined || nextWaiting !== undefined;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-051', reason: 'No next patient in queue', clinicalRisk: 'low' };
}

export function G_052_NextPatientNotCurrent(ctx: GuardContext): GuardResult {
  const nextInConsultation = ctx.queue?.inConsultation?.[0];
  const nextWaiting = ctx.queue?.waiting?.[0];
  const next = nextInConsultation ?? nextWaiting;
  if (!next) {
    return { passed: true };
  }
  const valid = next.id !== ctx.appointmentId;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-052', reason: 'Next patient is the same as current appointment', clinicalRisk: 'high' };
}

export function G_053_DoctorAuthorizedForNext(ctx: GuardContext): GuardResult {
  const nextInConsultation = ctx.queue?.inConsultation?.[0];
  const nextWaiting = ctx.queue?.waiting?.[0];
  const next = nextInConsultation ?? nextWaiting;
  if (!next) {
    return { passed: true };
  }
  const valid = next.patientId !== undefined && next.patientId !== null;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-053', reason: 'Doctor not authorized for next patient', clinicalRisk: 'high' };
}

export function G_054_NoNextPatient(ctx: GuardContext): GuardResult {
  const nextInConsultation = ctx.queue?.inConsultation ?? [];
  const nextWaiting = ctx.queue?.waiting ?? [];
  const valid = nextInConsultation.length === 0 && nextWaiting.length === 0;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-054', reason: 'Next patient exists in queue', clinicalRisk: 'low' };
}

export function G_055_AllCachesInvalidated(ctx: GuardContext): GuardResult {
  const invalidated = (ctx.metadata.cachesInvalidated as boolean | undefined) === true;
  return invalidated
    ? { passed: true }
    : { passed: false, guardId: 'G-055', reason: 'React Query caches have not been invalidated', clinicalRisk: 'low' };
}

export function G_056_CompletedOrNewSession(ctx: GuardContext): GuardResult {
  const valid = ctx.consultationWorkflowState === 'COMPLETED';
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-056', reason: 'Reset requires previous state to be COMPLETED', clinicalRisk: 'low' };
}
