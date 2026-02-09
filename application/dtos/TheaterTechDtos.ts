/**
 * DTOs for Theater Tech Operations
 *
 * Typed data transfer objects for all theater tech API endpoints.
 * Keeps domain entities separate from API layer.
 */

import { ChecklistItemConfirmation } from '@/domain/interfaces/repositories/ISurgicalChecklistRepository';

// ============================================================================
// TODAY BOARD
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
// PROCEDURE RECORD TIMESTAMPS
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
