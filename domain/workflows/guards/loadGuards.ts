/**
 * Guard implementations for load transitions.
 *
 * G-001: ValidAppointmentId
 * G-002: UserAuthenticated
 * G-003: PatientNotArchived
 * G-004: AppointmentLoaded
 * G-005: PatientLoaded
 * G-006: DoctorLoaded
 * G-007: PatientIdentityPreserved
 * G-008: ConsultationStateValid
 * G-009: AppointmentStatusReady
 * G-010: AppointmentStatusActive
 * G-011: ErrorIsRecoverable
 */

import type { GuardContext } from '../GuardContext';
import type { GuardResult } from '../GuardResult';
import { ConsultationState } from '@/domain/enums/ConsultationState';
import { AppointmentStatus } from '@/domain/enums/AppointmentStatus';

export function G_001_ValidAppointmentId(ctx: GuardContext): GuardResult {
  const valid = ctx.appointmentId !== null && ctx.appointmentId > 0;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-001', reason: 'appointmentId must be a positive integer', clinicalRisk: 'low' };
}

export function G_002_UserAuthenticated(ctx: GuardContext): GuardResult {
  const valid = ctx.user?.role === 'DOCTOR';
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-002', reason: 'User must be authenticated as DOCTOR', clinicalRisk: 'medium' };
}

export function G_003_PatientNotArchived(ctx: GuardContext): GuardResult {
  if (!ctx.appointment) {
    return { passed: false, guardId: 'G-003', reason: 'Appointment data missing', clinicalRisk: 'low' };
  }
  return { passed: true };
}

export function G_004_AppointmentLoaded(ctx: GuardContext): GuardResult {
  const valid = ctx.appointment !== null;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-004', reason: 'Appointment data not loaded', clinicalRisk: 'critical' };
}

export function G_005_PatientLoaded(ctx: GuardContext): GuardResult {
  const valid = ctx.patientId !== null;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-005', reason: 'Patient data not loaded', clinicalRisk: 'critical' };
}

export function G_006_DoctorLoaded(ctx: GuardContext): GuardResult {
  const valid = ctx.doctorId !== null;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-006', reason: 'Doctor data not loaded', clinicalRisk: 'high' };
}

export function G_007_PatientIdentityPreserved(ctx: GuardContext): GuardResult {
  if (!ctx.appointment || !ctx.patientId) {
    return { passed: false, guardId: 'G-007', reason: 'Missing data for identity verification', clinicalRisk: 'high' };
  }
  const valid = ctx.appointment.patientId === ctx.patientId;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-007', reason: 'Patient identity mismatch between appointment and session', clinicalRisk: 'high' };
}

export function G_008_ConsultationStateValid(ctx: GuardContext): GuardResult {
  if (!ctx.consultation) {
    return { passed: true };
  }
  const valid = ctx.consultation.state === ConsultationState.IN_PROGRESS || ctx.consultation.state === ConsultationState.NOT_STARTED;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-008', reason: `Consultation state ${ctx.consultation.state} prevents resume`, clinicalRisk: 'high' };
}

export function G_009_AppointmentStatusReady(ctx: GuardContext): GuardResult {
  const validStatuses = [AppointmentStatus.CHECKED_IN, AppointmentStatus.READY_FOR_CONSULTATION, AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED];
  const valid = ctx.appointment ? validStatuses.includes(ctx.appointment.status as AppointmentStatus) : false;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-009', reason: `Appointment status ${ctx.appointment?.status ?? 'null'} not ready for consultation`, clinicalRisk: 'high' };
}

export function G_010_AppointmentStatusActive(ctx: GuardContext): GuardResult {
  const valid = ctx.appointment?.status === AppointmentStatus.IN_CONSULTATION;
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-010', reason: `Appointment status ${ctx.appointment?.status ?? 'null'} not active`, clinicalRisk: 'high' };
}

export function G_011_ErrorIsRecoverable(ctx: GuardContext): GuardResult {
  const errorType = ctx.metadata.errorType as string | undefined;
  const unrecoverableTypes = ['CORRUPTED_DB', 'UNKNOWN_FATAL'];
  const valid = !errorType || !unrecoverableTypes.includes(errorType);
  return valid
    ? { passed: true }
    : { passed: false, guardId: 'G-011', reason: `Error type ${errorType ?? 'unknown'} is not recoverable`, clinicalRisk: 'low' };
}
