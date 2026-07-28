/**
 * Guard implementations for consultation flow transitions.
 *
 * G-012: AppointmentStatusAllowsStart
 * G-013: DoctorAssigned
 * G-014: AppointmentNotCompleted
 * G-015: NoActiveConflict
 * G-016: TargetAppointmentExists
 * G-017: DraftSavedOrUserConfirmed
 * G-018: SaveTimeoutCleared
 * G-019: ConsultingNotOwnedByOther
 * G-020: CurrentSessionClean
 * G-021: ConsultationInProgress
 * G-022: AppointmentNotCompleted
 * G-023: NotAlreadySaving
 * G-024: NotesPresent
 * G-025: DoctorIdPresent
 * G-026: ConsultationIdPresent
 * G-027: ConsultationInProgress
 * G-028: AppointmentNotTerminal
 * G-029: UserRoleDoctor
 * G-030: NoActiveSave
 * G-031: NoActiveConflict
 * G-032: PatientNotDeceased
 */

import type { GuardContext } from '../GuardContext';
import type { GuardResult } from '../GuardResult';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';
import { ConsultationState } from '@/domain/enums/ConsultationState';

export function G_012_AppointmentStatusAllowsStart(ctx: GuardContext): GuardResult {
  const valid = ctx.appointment?.status === AppointmentStatus.CHECKED_IN || ctx.appointment?.status === AppointmentStatus.READY_FOR_CONSULTATION;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-012', reason: `Appointment status ${ctx.appointment?.status ?? 'null'} does not allow start`, clinicalRisk: 'high' };
}

export function G_013_DoctorAssigned(ctx: GuardContext): GuardResult {
  if (!ctx.appointment || !ctx.user) {
    return { passed: false, guardId: 'G-013', reason: 'Missing appointment or user data for assignment check', clinicalRisk: 'high' };
  }
  const valid = ctx.appointment.doctorId === ctx.user.id;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-013', reason: 'Doctor not assigned to this appointment', clinicalRisk: 'high' };
}

export function G_014_AppointmentNotCompleted(ctx: GuardContext): GuardResult {
  const valid = ctx.appointment?.status !== AppointmentStatus.COMPLETED && ctx.appointment?.status !== AppointmentStatus.CANCELLED;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-014', reason: `Appointment is ${ctx.appointment?.status ?? 'null'}`, clinicalRisk: 'high' };
}

export function G_015_NoActiveConflict(ctx: GuardContext): GuardResult {
  const valid = ctx.documentationWorkflowState !== 'Conflict';
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-015', reason: 'Documentation conflict must be resolved before starting', clinicalRisk: 'medium' };
}

export function G_016_TargetAppointmentExists(ctx: GuardContext): GuardResult {
  const targetId = ctx.metadata.targetAppointmentId as number | undefined;
  const valid = targetId !== undefined && targetId > 0 && targetId !== ctx.appointmentId;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-016', reason: 'Target appointment does not exist or is same as current', clinicalRisk: 'high' };
}

export function G_017_DraftSavedOrUserConfirmed(ctx: GuardContext): GuardResult {
  const userConfirmed = (ctx.metadata.userConfirmedSwitch as boolean | undefined) === true;
  const valid = !ctx.isDirty || userConfirmed;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-017', reason: 'Unsaved changes exist and user did not confirm switch', clinicalRisk: 'medium' };
}

export function G_018_SaveTimeoutCleared(ctx: GuardContext): GuardResult {
  const saveTimeoutCleared = (ctx.metadata.saveTimeoutCleared as boolean | undefined) === true;
  const valid = saveTimeoutCleared || !ctx.isDirty;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-018', reason: 'Save timeout is still active', clinicalRisk: 'medium' };
}

export function G_019_ConsultingNotOwnedByOther(ctx: GuardContext): GuardResult {
  const targetId = ctx.metadata.targetAppointmentId as number | undefined;
  if (!targetId) {
    return { passed: false, guardId: 'G-019', reason: 'No target appointment for switch', clinicalRisk: 'high' };
  }
  const valid = targetId !== ctx.appointmentId;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-019', reason: 'Cannot switch to same appointment', clinicalRisk: 'high' };
}

export function G_020_CurrentSessionClean(ctx: GuardContext): GuardResult {
  const valid = !ctx.isDirty;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-020', reason: 'Current session has unsaved changes', clinicalRisk: 'medium' };
}

export function G_021_ConsultationInProgress(ctx: GuardContext): GuardResult {
  const valid = ctx.consultation?.state === ConsultationState.IN_PROGRESS;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-021', reason: `Consultation state ${ctx.consultation?.state ?? 'null'} is not IN_PROGRESS`, clinicalRisk: 'medium' };
}

export function G_022_AppointmentNotCompleted(ctx: GuardContext): GuardResult {
  const valid = ctx.appointment?.status !== AppointmentStatus.COMPLETED;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-022', reason: `Appointment is ${ctx.appointment?.status ?? 'null'}`, clinicalRisk: 'high' };
}

export function G_023_NotAlreadySaving(ctx: GuardContext): GuardResult {
  const valid = ctx.documentationWorkflowState !== 'Saving';
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-023', reason: 'Save already in progress', clinicalRisk: 'medium' };
}

export function G_024_NotesPresent(ctx: GuardContext): GuardResult {
  const hasNotes = ctx.notes !== null && ctx.notes !== undefined;
  return hasNotes
    ? { passed: true }
    : { passed: false, guardId: 'G-024', reason: 'Notes object is missing', clinicalRisk: 'medium' };
}

export function G_025_DoctorIdPresent(ctx: GuardContext): GuardResult {
  const valid = ctx.doctorId !== null && ctx.doctorId !== undefined;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-025', reason: 'doctorId is required for save', clinicalRisk: 'medium' };
}

export function G_026_ConsultationIdPresent(ctx: GuardContext): GuardResult {
  const valid = ctx.consultationId !== null && ctx.consultationId !== undefined;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-026', reason: 'consultationId is required for save mutation', clinicalRisk: 'medium' };
}

export function G_027_ConsultationInProgress(ctx: GuardContext): GuardResult {
  const valid = ctx.consultation?.state === ConsultationState.IN_PROGRESS;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-027', reason: `Consultation state ${ctx.consultation?.state ?? 'null'} prevents completion`, clinicalRisk: 'high' };
}

export function G_028_AppointmentNotTerminal(ctx: GuardContext): GuardResult {
  const valid = ctx.appointment?.status !== AppointmentStatus.COMPLETED && ctx.appointment?.status !== AppointmentStatus.CANCELLED;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-028', reason: `Appointment is ${ctx.appointment?.status ?? 'null'}`, clinicalRisk: 'high' };
}

export function G_029_UserRoleDoctor(ctx: GuardContext): GuardResult {
  const valid = ctx.user?.role === 'DOCTOR';
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-029', reason: `User role ${ctx.user?.role ?? 'null'} cannot complete consultation`, clinicalRisk: 'high' };
}

export function G_030_NoActiveSave(ctx: GuardContext): GuardResult {
  const valid = ctx.documentationWorkflowState !== 'Saving';
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-030', reason: 'Cannot complete while save is in progress', clinicalRisk: 'medium' };
}

export function G_031_NoActiveConflict(ctx: GuardContext): GuardResult {
  const valid = ctx.documentationWorkflowState !== 'Conflict';
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-031', reason: 'Cannot complete while conflict is unresolved', clinicalRisk: 'medium' };
}

export function G_032_PatientNotDeceased(ctx: GuardContext): GuardResult {
  const deceased = ctx.metadata.patientDeceased as boolean | undefined;
  const valid = !deceased;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-032', reason: 'Patient is marked deceased, completion requires special handling', clinicalRisk: 'high' };
}
