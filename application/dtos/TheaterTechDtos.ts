/**
 * DTOs for Theater Tech Operations
 *
 * Typed data transfer objects for all theater tech API endpoints.
 * Keeps domain entities separate from API layer.
 */

import { ChecklistItemConfirmation } from '@/domain/interfaces/repositories/ISurgicalChecklistRepository';

// ============================================================================
// DAYBOARD (OPTIMIZED) — Phase 2 dashboard endpoint
// ============================================================================

export interface DayboardDto {
  theaters: DayboardTheaterDto[];
  summary: DayboardSummaryDto;
  date: string; // ISO date YYYY-MM-DD
}

export interface DayboardTheaterDto {
  id: string;
  name: string;
  type: string;
  colorCode: string | null;
  cases: DayboardCaseDto[];
}

export interface DayboardCaseDto {
  // Case core
  id: string;
  status: string;
  urgency: string;
  procedureName: string | null;
  side: string | null;
  estimatedDurationMinutes: number | null;

  // Patient lean summary
  patient: {
    id: string;
    fullName: string;
    fileNumber: string | null;
    hasAllergies: boolean;
  };

  // Surgeon
  primarySurgeon: {
    id: string;
    name: string;
  };

  // Booking
  booking: {
    id: string;
    theaterName: string;
    startTime: string; // ISO
    endTime: string;   // ISO
    status: string;
  };

  // Readiness blockers summary
  blockers: DayboardBlockersDto;

  // Checklist status
  checklist: {
    signInCompleted: boolean;
    timeOutCompleted: boolean;
    signOutCompleted: boolean;
  };

  // Procedure record
  hasProcedureRecord: boolean;

  // Operative timeline
  timeline: {
    wheelsIn: string | null;
    anesthesiaStart: string | null;
    anesthesiaEnd: string | null;
    incisionTime: string | null;
    closureTime: string | null;
    wheelsOut: string | null;
  } | null;
}

export interface DayboardBlockersDto {
  /** Doctor planning missing items count (0 = complete) */
  doctorPlanningMissingCount: number;
  /** Whether doctor plan is marked ready */
  doctorPlanReady: boolean;
  /** Nurse pre-op form status: null=not started, 'DRAFT', 'FINAL' */
  nursePreopStatus: string | null;
  /** Number of signed consents */
  consentsSignedCount: number;
  /** Total consents */
  consentsTotalCount: number;
  /** Number of pre-op photos */
  preOpPhotosCount: number;
  /** Nurse intra-op record status: null=not started, 'DRAFT', 'FINAL' */
  nurseIntraOpStatus: string | null;
  /** Whether intra-op record has count discrepancy */
  intraOpDiscrepancy: boolean;
  /** Nurse recovery record status: null=not started, 'DRAFT', 'FINAL' */
  nurseRecoveryStatus: string | null;
  /** Whether discharge criteria are all met and decision is not HOLD */
  dischargeReady: boolean;
  /** Surgeon operative note status: null=not started, 'DRAFT', 'FINAL' */
  operativeNoteStatus: string | null;
  /** Overall blocker level: 'clear' | 'warning' | 'blocked' */
  level: 'clear' | 'warning' | 'blocked';
}

export interface DayboardSummaryDto {
  totalCases: number;
  scheduled: number;
  inPrep: number;
  inTheater: number;
  inRecovery: number;
  completed: number;
  /** Average OR time in minutes for cases with complete wheels-in + wheels-out */
  avgOrTimeMinutes: number | null;
  /** Count of cases where wheelsIn > booking start + 10 min threshold */
  delayedStartCount: number;
  /** Sum of OR times per theater { theaterId → minutes } */
  utilizationByTheater: Record<string, number>;
}

// ============================================================================
// TODAY BOARD (legacy — kept for backward compat)
// ============================================================================

export interface TheaterBoardDto {
  theaters: TheaterWithCasesDto[];
  summary: BoardSummaryDto;
}

export interface TheaterWithCasesDto {
  id: string;
  name: string;
  type: string;
  colorCode: string | null;
  cases: TheaterCaseDto[];
}

export interface TheaterCaseDto {
  id: string;
  status: string;
  urgency: string;
  procedureName: string | null;
  diagnosis: string | null;
  side: string | null;

  // Patient summary
  patient: {
    id: string;
    fullName: string;
    fileNumber: string | null;
    dateOfBirth: Date | null;
  };

  // Surgeon
  primarySurgeon: {
    id: string;
    name: string;
    specialization: string | null;
  };

  // Booking times
  booking: {
    id: string;
    startTime: Date;
    endTime: Date;
    status: string;
  };

  // Readiness
  readinessPercentage: number;
  readyForSurgery: boolean;

  // Checklist status
  checklist: {
    signInCompleted: boolean;
    timeOutCompleted: boolean;
    signOutCompleted: boolean;
  };

  // Procedure record existence
  hasProcedureRecord: boolean;
}

export interface BoardSummaryDto {
  totalCases: number;
  inPrep: number;
  inTheater: number;
  inRecovery: number;
  completed: number;
  scheduled: number;
}

// ============================================================================
// CASE TRANSITION
// ============================================================================

export interface CaseTransitionRequestDto {
  action: 'IN_PREP' | 'IN_THEATER' | 'RECOVERY' | 'COMPLETED';
  reason?: string;
}

export interface CaseTransitionResultDto {
  caseId: string;
  previousStatus: string;
  newStatus: string;
  transitionedAt: Date;
  transitionedBy: string;
}

// ============================================================================
// PROCEDURE RECORD TIMESTAMPS (LEGACY)
// ============================================================================

export interface ProcedureTimestampUpdateDto {
  anesthesiaStart?: string; // ISO datetime
  incisionTime?: string;
  closureTime?: string;
  wheelsOut?: string;
}

export interface ProcedureTimestampResultDto {
  recordId: number;
  caseId: string;
  anesthesiaStart: Date | null;
  incisionTime: Date | null;
  closureTime: Date | null;
  wheelsOut: Date | null;
  updatedFields: string[];
}

// ============================================================================
// OPERATIVE TIMELINE
// ============================================================================

export interface TimelineResultDto {
  caseId: string;
  caseStatus: string;
  timeline: {
    wheelsIn: string | null;
    anesthesiaStart: string | null;
    anesthesiaEnd: string | null;
    incisionTime: string | null;
    closureTime: string | null;
    wheelsOut: string | null;
  };
  durations: {
    orTimeMinutes: number | null;
    surgeryTimeMinutes: number | null;
    prepTimeMinutes: number | null;
    closeOutTimeMinutes: number | null;
    anesthesiaTimeMinutes: number | null;
  };
  missingItems: { field: string; label: string }[];
}

// ============================================================================
// CHECKLIST
// ============================================================================

export interface ChecklistUpdateRequestDto {
  phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT';
  items: ChecklistItemConfirmation[];
}

export interface ChecklistStatusDto {
  caseId: string;
  signIn: PhaseStatusDto;
  timeOut: PhaseStatusDto;
  signOut: PhaseStatusDto;
}

export interface PhaseStatusDto {
  completed: boolean;
  completedAt: Date | null;
  completedByUserId: string | null;
  completedByRole: string | null;
  items: ChecklistItemConfirmation[] | null;
}
