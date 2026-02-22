/**
 * Pure Helper Functions for Theater Tech Dayboard
 *
 * Business logic extracted from dayboard page component.
 * All functions are pure (no side effects, deterministic).
 */

import type { DayboardDto, DayboardCaseDto, DayboardBlockersDto, DayboardTheaterDto } from '@/application/dtos/TheaterTechDtos';
import { ApiResponse, isError, ApiErrorCode } from '@/lib/http/apiResponse';
import { Activity, CheckCircle2, Clock, Heart, Play, Wrench } from 'lucide-react';

// ============================================================================
// Filtering & Grouping
// ============================================================================

/**
 * Filter theaters by status.
 */
export function filterTheatersByStatus(
  theaters: DayboardTheaterDto[],
  status: string
): DayboardTheaterDto[] {
  if (status === 'ALL') return theaters;

  return theaters
    .map((theater) => ({
      ...theater,
      cases: theater.cases.filter((c) => c.status === status),
    }))
    .filter((t) => t.cases.length > 0);
}

/**
 * Get unique theater options for filter dropdown.
 */
export function getTheaterOptions(theaters: DayboardTheaterDto[]): Array<{ value: string; label: string }> {
  return theaters.map((t) => ({ value: t.id, label: t.name }));
}

// ============================================================================
// Primary CTA Computation
// ============================================================================

export interface PrimaryCta {
  action: string;
  label: string;
  icon: string;
  variant: 'default' | 'destructive';
}

// Status configuration for UI display
export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Activity }
> = {
  SCHEDULED: {
    label: 'Scheduled',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: Clock,
  },
  IN_PREP: {
    label: 'In Prep',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: Wrench,
  },
  IN_THEATER: {
    label: 'In Theater',
    color: 'text-violet-700',
    bg: 'bg-violet-50 border-violet-200',
    icon: Activity,
  },
  RECOVERY: {
    label: 'Recovery',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: Heart,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-slate-600',
    bg: 'bg-slate-50 border-slate-200',
    icon: CheckCircle2,
  },
};

const NEXT_ACTION_MAP: Record<string, PrimaryCta> = {
  SCHEDULED: { action: 'IN_PREP', label: 'Start Prep', icon: 'Wrench', variant: 'default' },
  IN_PREP: { action: 'IN_THEATER', label: 'Start Case', icon: 'Play', variant: 'default' },
  IN_THEATER: { action: 'RECOVERY', label: 'Move to Recovery', icon: 'Heart', variant: 'default' },
  RECOVERY: { action: 'COMPLETED', label: 'Complete', icon: 'CheckCircle2', variant: 'default' },
};

/**
 * Compute the primary CTA for a case based on its status.
 */
export function computePrimaryCta(caseData: DayboardCaseDto): PrimaryCta | null {
  return NEXT_ACTION_MAP[caseData.status] || null;
}

// ============================================================================
// Blocker Level Computation
// ============================================================================

export type BlockerLevel = 'clear' | 'warning' | 'blocked';

/**
 * Compute blocker level from blockers data.
 */
export function computeBlockerLevel(blockers: DayboardBlockersDto): BlockerLevel {
  // Blocked: critical items missing
  if (
    !blockers.doctorPlanReady ||
    (blockers.consentsTotalCount > 0 && blockers.consentsSignedCount < blockers.consentsTotalCount) ||
    blockers.intraOpDiscrepancy
  ) {
    return 'blocked';
  }

  // Blocked: nurse pre-op must be FINAL (not DRAFT or null)
  if (blockers.nursePreopStatus !== 'FINAL') {
    return 'blocked';
  }

  // Warning: some items incomplete but not critical
  if (
    blockers.doctorPlanningMissingCount > 0 ||
    (blockers.nurseRecoveryStatus === 'FINAL' && !blockers.dischargeReady) ||
    blockers.nurseRecoveryStatus === 'DRAFT'
  ) {
    return 'warning';
  }

  return 'clear';
}

// ============================================================================
// Time Formatting
// ============================================================================

/**
 * Format time range for display.
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const startHours = String(start.getHours()).padStart(2, '0');
    const startMinutes = String(start.getMinutes()).padStart(2, '0');
    const endHours = String(end.getHours()).padStart(2, '0');
    const endMinutes = String(end.getMinutes()).padStart(2, '0');
    return `${startHours}:${startMinutes} – ${endHours}:${endMinutes}`;
  } catch {
    return `${startTime} – ${endTime}`;
  }
}

// ============================================================================
// API Error Mapping
// ============================================================================

/**
 * Map API error response to user-friendly message.
 * Handles structured errors from ApiResponse<T> format.
 */
export function mapApiErrorToUiMessage(error: unknown): { message: string; missingItems?: string[] } {
  // Handle ApiResponse error format
  if (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    !error.success &&
    'error' in error &&
    typeof (error as { error: unknown }).error === 'string'
  ) {
    const apiError = error as unknown as { error: string; code?: string; metadata?: { missingItems?: string[] } };
    return {
      message: apiError.error || 'An error occurred',
      missingItems: apiError.metadata?.missingItems,
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'An unexpected error occurred' };
}

/**
 * Extract missing items from API error response.
 */
export function extractMissingItems(error: unknown): string[] {
  if (typeof error === 'object' && error !== null && 'success' in error && !error.success) {
    const apiError = error as { metadata?: { missingItems?: string[] } };
    return apiError.metadata?.missingItems || [];
  }

  if (error instanceof Error && 'missingItems' in error) {
    return (error as { missingItems: string[] }).missingItems || [];
  }

  return [];
}

/**
 * Check if error is a gate-blocked error.
 */
export function isGateBlockedError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'success' in error && !error.success) {
    const apiError = error as { code?: string };
    return apiError.code === ApiErrorCode.GATE_BLOCKED;
  }
  return false;
}
