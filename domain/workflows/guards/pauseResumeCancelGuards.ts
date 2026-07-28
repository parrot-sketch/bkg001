/**
 * Guard implementations for pause, resume, and cancel transitions.
 *
 * G-033: SessionActive
 * G-034: NoActiveSave
 * G-035: NoActiveConflict
 * G-036: NoPendingCompletion
 * G-037: UserExplicitResume
 * G-038: AppointmentStillLoaded
 * G-039: PatientStillLoaded
 * G-040: DialogIsOpen
 */

import type { GuardContext } from '../GuardContext';
import type { GuardResult } from '../GuardResult';
import { ConsultationWorkflowState } from '../ConsultationWorkflowStateMachine';

export function G_033_SessionActive(ctx: GuardContext): GuardResult {
  const valid = ctx.consultationWorkflowState === ConsultationWorkflowState.ACTIVE;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-033', reason: `Session state ${ctx.consultationWorkflowState} is not ACTIVE`, clinicalRisk: 'low' };
}

export function G_034_NoActiveSave(ctx: GuardContext): GuardResult {
  const valid = ctx.documentationWorkflowState !== 'Saving';
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-034', reason: 'Cannot pause while save is in progress', clinicalRisk: 'medium' };
}

export function G_035_NoActiveConflict(ctx: GuardContext): GuardResult {
  const valid = ctx.documentationWorkflowState !== 'Conflict';
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-035', reason: 'Cannot pause while conflict is unresolved', clinicalRisk: 'medium' };
}

export function G_036_NoPendingCompletion(ctx: GuardContext): GuardResult {
  const showCompleteDialog = (ctx.metadata.showCompleteDialog as boolean | undefined) === true;
  const valid = !showCompleteDialog;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-036', reason: 'Completion dialog is open', clinicalRisk: 'low' };
}

export function G_037_UserExplicitResume(ctx: GuardContext): GuardResult {
  const valid = (ctx.metadata.userInitiated as boolean | undefined) === true;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-037', reason: 'Resume not user-initiated', clinicalRisk: 'low' };
}

export function G_038_AppointmentStillLoaded(ctx: GuardContext): GuardResult {
  const valid = ctx.appointment !== null;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-038', reason: 'Appointment data no longer available', clinicalRisk: 'medium' };
}

export function G_039_PatientStillLoaded(ctx: GuardContext): GuardResult {
  const valid = ctx.patientId !== null;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-039', reason: 'Patient data no longer available', clinicalRisk: 'medium' };
}

export function G_040_DialogIsOpen(ctx: GuardContext): GuardResult {
  const valid = (ctx.metadata.showCompleteDialog as boolean | undefined) === true;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-040', reason: 'Completion dialog is not open', clinicalRisk: 'low' };
}
