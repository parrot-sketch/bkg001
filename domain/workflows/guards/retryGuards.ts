/**
 * Guard implementations for retry and error recovery transitions.
 *
 * G-069: RetryCountNotExhausted
 * G-070: ErrorIsRetryable
 * G-071: UserInitiatedRetry
 * G-072: UserInitiatedDismiss
 * G-073: NoPendingMutations
 * G-074: PreviousStateWasCompleting
 * G-075: AppointmentStillActive
 * G-076: NoDataCorruption
 */

import type { GuardContext } from '../GuardContext';
import type { GuardResult } from '../GuardResult';
import { ConsultationWorkflowState } from '../ConsultationWorkflowStateMachine';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

export function G_069_RetryCountNotExhausted(ctx: GuardContext): GuardResult {
  const valid = ctx.retryCount < 3;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-069', reason: 'Retry count exhausted', clinicalRisk: 'low' };
}

export function G_070_ErrorIsRetryable(ctx: GuardContext): GuardResult {
  const errorType = ctx.metadata.errorType as string | undefined;
  const retryable = ['NETWORK_UNAVAILABLE', 'TIMEOUT', 'HTTP_5XX'];
  const valid = !errorType || retryable.includes(errorType);
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-070', reason: `Error type ${errorType ?? 'unknown'} is not retryable`, clinicalRisk: 'medium' };
}

export function G_071_UserInitiatedRetry(ctx: GuardContext): GuardResult {
  const valid = (ctx.metadata.userInitiated as boolean | undefined) === true;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-071', reason: 'Retry was not user-initiated', clinicalRisk: 'low' };
}

export function G_072_UserInitiatedDismiss(ctx: GuardContext): GuardResult {
  const valid = (ctx.metadata.userInitiated as boolean | undefined) === true;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-072', reason: 'Dismiss was not user-initiated', clinicalRisk: 'low' };
}

export function G_073_NoPendingMutations(ctx: GuardContext): GuardResult {
  const pending = (ctx.metadata.pendingMutations as number | undefined) ?? 0;
  const valid = pending === 0;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-073', reason: 'Background mutations still in flight', clinicalRisk: 'low' };
}

export function G_074_PreviousStateWasCompleting(ctx: GuardContext): GuardResult {
  const valid = ctx.metadata.previousState === ConsultationWorkflowState.COMPLETING || ctx.metadata.previousState === ConsultationWorkflowState.TRANSITIONING;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-074', reason: `Previous state ${ctx.metadata.previousState ?? 'null'} was not completing`, clinicalRisk: 'low' };
}

export function G_075_AppointmentStillActive(ctx: GuardContext): GuardResult {
  const valid = ctx.appointment?.status !== AppointmentStatus.COMPLETED && ctx.appointment?.status !== AppointmentStatus.CANCELLED;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-075', reason: `Appointment is ${ctx.appointment?.status ?? 'null'}`, clinicalRisk: 'high' };
}

export function G_076_NoDataCorruption(ctx: GuardContext): GuardResult {
  const corruptionConfirmed = (ctx.metadata.dataCorruptionConfirmed as boolean | undefined) === true;
  const valid = !corruptionConfirmed;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-076', reason: 'Client state does not match server state and user did not confirm', clinicalRisk: 'medium' };
}
