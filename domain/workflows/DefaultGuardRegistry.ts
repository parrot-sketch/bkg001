/**
 * Default implementation of GuardRegistry.
 *
 * Pre-populated with all 73 guards organized by transition.
 * Consumers can register additional guards via register().
 */

import type { GuardFunction } from './GuardContext';
import type { GuardRegistration, GuardRegistry } from './GuardRegistry';
import type { GuardResult } from './GuardResult';
import {
  G_001_ValidAppointmentId,
  G_002_UserAuthenticated,
  G_003_PatientNotArchived,
  G_004_AppointmentLoaded,
  G_005_PatientLoaded,
  G_006_DoctorLoaded,
  G_007_PatientIdentityPreserved,
  G_008_ConsultationStateValid,
  G_009_AppointmentStatusReady,
  G_010_AppointmentStatusActive,
  G_011_ErrorIsRecoverable,
  G_012_AppointmentStatusAllowsStart,
  G_013_DoctorAssigned,
  G_014_AppointmentNotCompleted,
  G_015_NoActiveConflict,
  G_016_TargetAppointmentExists,
  G_017_DraftSavedOrUserConfirmed,
  G_018_SaveTimeoutCleared,
  G_019_ConsultingNotOwnedByOther,
  G_020_CurrentSessionClean,
  G_021_ConsultationInProgress,
  G_022_AppointmentNotCompleted as G_022_SaveAppointmentNotCompleted,
  G_023_NotAlreadySaving,
  G_024_NotesPresent,
  G_025_DoctorIdPresent,
  G_026_ConsultationIdPresent,
  G_027_ConsultationInProgress as G_027_CompleteConsultationInProgress,
  G_028_AppointmentNotTerminal,
  G_029_UserRoleDoctor,
  G_030_NoActiveSave,
  G_031_NoActiveConflict as G_031_NoActiveConflictComplete,
  G_032_PatientNotDeceased,
  G_033_SessionActive,
  G_034_NoActiveSave as G_034_PauseNoActiveSave,
  G_035_NoActiveConflict as G_035_PauseNoActiveConflict,
  G_036_NoPendingCompletion,
  G_037_UserExplicitResume,
  G_038_AppointmentStillLoaded,
  G_039_PatientStillLoaded,
  G_040_DialogIsOpen,
  G_041_OutcomeSelected,
  G_042_NoPendingSave,
  G_043_UserConfirmedProceed,
  G_044_ConsultationInProgress as G_044_ConfirmConsultationInProgress,
  G_045_AppointmentNotCompleted as G_045_ConfirmAppointmentNotCompleted,
  G_046_PatientIdentityVerified,
  G_047_VersionCurrent,
  G_048_BillingSummaryPresent,
  G_049_QueueOwnershipValid,
  G_050_AdvisoryWarningsReviewed,
  G_051_NextPatientExists,
  G_052_NextPatientNotCurrent,
  G_053_DoctorAuthorizedForNext,
  G_054_NoNextPatient,
  G_055_AllCachesInvalidated,
  G_056_CompletedOrNewSession,
  G_057_ServerDataAvailable,
  G_058_AuditLogged as G_058_ServerAuditLogged,
  G_059_LocalNotesPresent,
  G_060_LocalVersionTracked,
  G_061_AuditLogged as G_061_LocalAuditLogged,
  G_062_UserExplicitDismiss,
  G_063_DirtyFlagMaintained,
  G_064_DraftTimestampValid,
  G_065_DraftTimestampNewer,
  G_066_DraftStructureValid,
  G_067_DraftTimestampOlderOrEqual,
  G_068_DraftCorruptOrMissing,
  G_069_RetryCountNotExhausted,
  G_070_ErrorIsRetryable,
  G_071_UserInitiatedRetry,
  G_072_UserInitiatedDismiss,
  G_073_NoPendingMutations,
  G_074_PreviousStateWasCompleting,
  G_075_AppointmentStillActive,
  G_076_NoDataCorruption,
} from './guards';

export class DefaultGuardRegistry implements GuardRegistry {
  private readonly guardMap: Map<string, Map<string, GuardFunction[]>> = new Map();

  constructor() {
    this.registerAllGuards();
  }

  getGuards(from: string, action: string): readonly GuardFunction[] {
    return this.guardMap.get(from)?.get(action) ?? [];
  }

  register(registration: GuardRegistration): void {
    if (!this.guardMap.has(registration.from)) {
      this.guardMap.set(registration.from, new Map());
    }
    const actionMap = this.guardMap.get(registration.from)!;
    const existing = actionMap.get(registration.action) ?? [];
    actionMap.set(registration.action, [...existing, registration.guard]);
  }

  getAllRegistrations(): readonly GuardRegistration[] {
    const registrations: GuardRegistration[] = [];
    for (const [from, actionMap] of this.guardMap.entries()) {
      for (const [action, guards] of actionMap.entries()) {
        for (const guard of guards) {
          registrations.push({ from, action, guard });
        }
      }
    }
    return registrations;
  }

  private addGuards(from: string, action: string, guards: GuardFunction[]): void {
    if (!this.guardMap.has(from)) {
      this.guardMap.set(from, new Map());
    }
    const actionMap = this.guardMap.get(from)!;
    const existing = actionMap.get(action) ?? [];
    actionMap.set(action, [...existing, ...guards]);
  }

  private registerAllGuards(): void {
    // LOAD_PATIENT (IDLE -> LOADING, TRANSITIONING -> LOADING)
    this.addGuards('IDLE', 'LOAD_PATIENT', [
      G_001_ValidAppointmentId,
      G_002_UserAuthenticated,
      G_003_PatientNotArchived,
    ]);
    this.addGuards('TRANSITIONING', 'LOAD_NEXT_PATIENT', [
      G_001_ValidAppointmentId,
      G_002_UserAuthenticated,
      G_003_PatientNotArchived,
    ]);

    // LOAD_SUCCESS (LOADING -> READY, LOADING -> ACTIVE)
    this.addGuards('LOADING', 'LOAD_SUCCESS', [
      G_004_AppointmentLoaded,
      G_005_PatientLoaded,
      G_006_DoctorLoaded,
      G_007_PatientIdentityPreserved,
      G_008_ConsultationStateValid,
      G_009_AppointmentStatusReady,
      G_010_AppointmentStatusActive,
    ]);

    // LOAD_ERROR (LOADING -> ERROR)
    this.addGuards('LOADING', 'LOAD_ERROR', [
      G_011_ErrorIsRecoverable,
    ]);

    // START_CONSULTATION (READY -> ACTIVE)
    this.addGuards('READY', 'START_CONSULTATION', [
      G_012_AppointmentStatusAllowsStart,
      G_013_DoctorAssigned,
      G_014_AppointmentNotCompleted,
      G_015_NoActiveConflict,
    ]);

    // SWITCH_PATIENT (READY -> LOADING, ACTIVE -> LOADING, PAUSED -> LOADING, ERROR -> LOADING)
    this.addGuards('READY', 'SWITCH_PATIENT', [
      G_016_TargetAppointmentExists,
      G_020_CurrentSessionClean,
    ]);
    this.addGuards('ACTIVE', 'SWITCH_PATIENT', [
      G_016_TargetAppointmentExists,
      G_017_DraftSavedOrUserConfirmed,
      G_018_SaveTimeoutCleared,
      G_019_ConsultingNotOwnedByOther,
    ]);
    this.addGuards('PAUSED', 'SWITCH_PATIENT', [
      G_016_TargetAppointmentExists,
      G_017_DraftSavedOrUserConfirmed,
      G_018_SaveTimeoutCleared,
      G_019_ConsultingNotOwnedByOther,
    ]);
    this.addGuards('ERROR', 'SWITCH_PATIENT', [
      G_016_TargetAppointmentExists,
      G_019_ConsultingNotOwnedByOther,
    ]);

    // SAVE_DRAFT (ACTIVE -> SAVING)
    this.addGuards('ACTIVE', 'SAVE_DRAFT', [
      G_021_ConsultationInProgress,
      G_022_SaveAppointmentNotCompleted,
      G_023_NotAlreadySaving,
      G_024_NotesPresent,
      G_025_DoctorIdPresent,
      G_026_ConsultationIdPresent,
    ]);

    // OPEN_COMPLETE_DIALOG (ACTIVE -> COMPLETING)
    this.addGuards('ACTIVE', 'OPEN_COMPLETE_DIALOG', [
      G_027_CompleteConsultationInProgress,
      G_028_AppointmentNotTerminal,
      G_029_UserRoleDoctor,
      G_030_NoActiveSave,
      G_031_NoActiveConflictComplete,
      G_032_PatientNotDeceased,
    ]);

    // PAUSE (ACTIVE -> PAUSED)
    this.addGuards('ACTIVE', 'PAUSE', [
      G_033_SessionActive,
      G_034_PauseNoActiveSave,
      G_035_PauseNoActiveConflict,
      G_036_NoPendingCompletion,
    ]);

    // RESUME (PAUSED -> ACTIVE)
    this.addGuards('PAUSED', 'RESUME', [
      G_037_UserExplicitResume,
      G_038_AppointmentStillLoaded,
      G_039_PatientStillLoaded,
    ]);

    // CANCEL_COMPLETE (COMPLETING -> ACTIVE)
    this.addGuards('COMPLETING', 'CANCEL_COMPLETE', [
      G_040_DialogIsOpen,
    ]);

    // CONFIRM_COMPLETE (COMPLETING -> TRANSITIONING)
    this.addGuards('COMPLETING', 'CONFIRM_COMPLETE', [
      G_041_OutcomeSelected,
      G_042_NoPendingSave,
      G_043_UserConfirmedProceed,
      G_044_ConfirmConsultationInProgress,
      G_045_ConfirmAppointmentNotCompleted,
      G_046_PatientIdentityVerified,
      G_047_VersionCurrent,
      G_048_BillingSummaryPresent,
      G_049_QueueOwnershipValid,
      G_050_AdvisoryWarningsReviewed,
    ]);

    // LOAD_NEXT_PATIENT (TRANSITIONING -> LOADING)
    this.addGuards('TRANSITIONING', 'LOAD_NEXT_PATIENT', [
      G_051_NextPatientExists,
      G_052_NextPatientNotCurrent,
      G_053_DoctorAuthorizedForNext,
    ]);

    // COMPLETE_SESSION (TRANSITIONING -> COMPLETED)
    this.addGuards('TRANSITIONING', 'COMPLETE_SESSION', [
      G_054_NoNextPatient,
      G_055_AllCachesInvalidated,
    ]);

    // RESET (COMPLETED -> IDLE)
    this.addGuards('COMPLETED', 'RESET', [
      G_056_CompletedOrNewSession,
    ]);

    // RESOLVE_WITH_SERVER (CONFLICT -> Saved)
    this.addGuards('CONFLICT', 'RESOLVE_WITH_SERVER', [
      G_057_ServerDataAvailable,
      G_058_ServerAuditLogged,
    ]);

    // RESOLVE_WITH_LOCAL (CONFLICT -> Saving)
    this.addGuards('CONFLICT', 'RESOLVE_WITH_LOCAL', [
      G_059_LocalNotesPresent,
      G_060_LocalVersionTracked,
      G_061_LocalAuditLogged,
    ]);

    // DISMISS_CONFLICT (CONFLICT -> Active)
    this.addGuards('CONFLICT', 'DISMISS_CONFLICT', [
      G_062_UserExplicitDismiss,
      G_063_DirtyFlagMaintained,
    ]);

    // RESTORE_SUCCESS (Restoring -> Dirty)
    this.addGuards('Restoring', 'RESTORE_SUCCESS', [
      G_064_DraftTimestampValid,
      G_065_DraftTimestampNewer,
      G_066_DraftStructureValid,
    ]);

    // RESTORE_NOOP (Restoring -> Document)
    this.addGuards('Restoring', 'RESTORE_NOOP', [
      G_067_DraftTimestampOlderOrEqual,
      G_068_DraftCorruptOrMissing,
    ]);

    // RETRY (ERROR -> LOADING)
    this.addGuards('ERROR', 'RETRY', [
      G_069_RetryCountNotExhausted,
      G_070_ErrorIsRetryable,
      G_071_UserInitiatedRetry,
    ]);

    // DISMISS_ERROR (ERROR -> IDLE)
    this.addGuards('ERROR', 'DISMISS_ERROR', [
      G_072_UserInitiatedDismiss,
      G_073_NoPendingMutations,
    ]);

    // COMPLETION_RETRY (ERROR -> ACTIVE)
    this.addGuards('ERROR', 'COMPLETION_RETRY', [
      G_074_PreviousStateWasCompleting,
      G_075_AppointmentStillActive,
      G_076_NoDataCorruption,
    ]);
  }
}
