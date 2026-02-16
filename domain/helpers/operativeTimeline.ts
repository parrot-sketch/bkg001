/**
 * Domain Helper: Operative Timeline
 *
 * Validates, gates, and computes derived durations for the operative timeline.
 *
 * The canonical chronological order is:
 *   wheelsIn → anesthesiaStart → incisionTime → closureTime → anesthesiaEnd → wheelsOut
 *
 * All timestamps are optional; partial timelines are valid as long as the
 * existing values respect chronological order.
 */

import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

/** Canonical timeline shape — mirrors DB columns but uses camelCase. */
export interface OperativeTimeline {
  wheelsIn: Date | null;
  anesthesiaStart: Date | null;
  anesthesiaEnd: Date | null;
  incisionTime: Date | null;
  closureTime: Date | null;
  wheelsOut: Date | null;
}

/** Serialised (ISO-string) version used by API payloads. */
export interface OperativeTimelineDto {
  wheelsIn: string | null;
  anesthesiaStart: string | null;
  anesthesiaEnd: string | null;
  incisionTime: string | null;
  closureTime: string | null;
  wheelsOut: string | null;
}

/** Derived duration results (all in minutes, null if not computable). */
export interface TimelineDurations {
  /** Wheels-in → Wheels-out */
  orTimeMinutes: number | null;
  /** Incision → Closure */
  surgeryTimeMinutes: number | null;
  /** Wheels-in → Incision */
  prepTimeMinutes: number | null;
  /** Closure → Wheels-out */
  closeOutTimeMinutes: number | null;
  /** Anesthesia start → Anesthesia end */
  anesthesiaTimeMinutes: number | null;
}

/** A single validation error. */
export interface TimelineValidationError {
  field: string;
  message: string;
}

/** Result of `validateTimeline`. */
export interface TimelineValidationResult {
  valid: boolean;
  errors: TimelineValidationError[];
}

// ============================================================================
// Constants — canonical ordering
// ============================================================================

/**
 * Fields in strict chronological order.
 * Each pair (i, i+1) is checked during validation.
 */
export const TIMELINE_FIELD_ORDER = [
  'wheelsIn',
  'anesthesiaStart',
  'incisionTime',
  'closureTime',
  'anesthesiaEnd',
  'wheelsOut',
] as const;

export type TimelineFieldName = (typeof TIMELINE_FIELD_ORDER)[number];

/** Human-readable labels for UI display. */
export const TIMELINE_FIELD_LABELS: Record<TimelineFieldName, string> = {
  wheelsIn: 'Wheels In',
  anesthesiaStart: 'Anesthesia Start',
  incisionTime: 'Incision',
  closureTime: 'Closure',
  anesthesiaEnd: 'Anesthesia End',
  wheelsOut: 'Wheels Out',
};

// ============================================================================
// Zod Schema — PATCH body validation
// ============================================================================

const isoDatetime = z.string().datetime({ message: 'Must be a valid ISO 8601 datetime' });

export const TimelinePatchSchema = z
  .object({
    wheelsIn: isoDatetime.optional(),
    anesthesiaStart: isoDatetime.optional(),
    anesthesiaEnd: isoDatetime.optional(),
    incisionTime: isoDatetime.optional(),
    closureTime: isoDatetime.optional(),
    wheelsOut: isoDatetime.optional(),
  })
  .refine(
    (data) =>
      data.wheelsIn !== undefined ||
      data.anesthesiaStart !== undefined ||
      data.anesthesiaEnd !== undefined ||
      data.incisionTime !== undefined ||
      data.closureTime !== undefined ||
      data.wheelsOut !== undefined,
    { message: 'At least one timeline timestamp must be provided' }
  );

export type TimelinePatchInput = z.infer<typeof TimelinePatchSchema>;

// ============================================================================
// Mapping: camelCase → snake_case DB columns
// ============================================================================

export const FIELD_TO_DB_COLUMN: Record<TimelineFieldName, string> = {
  wheelsIn: 'wheels_in',
  anesthesiaStart: 'anesthesia_start',
  incisionTime: 'incision_time',
  closureTime: 'closure_time',
  anesthesiaEnd: 'anesthesia_end',
  wheelsOut: 'wheels_out',
};

// ============================================================================
// Validate Timeline — enforce chronological order
// ============================================================================

/**
 * Validates that existing (non-null) timestamps respect strict chronological order.
 *
 * Rules:
 *  - For every pair (fieldA, fieldB) where fieldA is earlier in the canonical order,
 *    if BOTH are set, fieldA < fieldB.
 *  - Timestamps in the future (> now + 5 min buffer) are rejected.
 *  - Timestamps more than 48h in the past are rejected (likely date-entry error).
 *
 * @returns `{ valid: true, errors: [] }` if OK, else `{ valid: false, errors: [...] }`.
 */
export function validateTimeline(timeline: OperativeTimeline): TimelineValidationResult {
  const errors: TimelineValidationError[] = [];
  const now = new Date();
  const futureLimit = new Date(now.getTime() + 5 * 60 * 1000); // now + 5 min
  const pastLimit = new Date(now.getTime() - 48 * 60 * 60 * 1000); // now - 48h

  // 1. Range checks
  for (const field of TIMELINE_FIELD_ORDER) {
    const value = timeline[field];
    if (value === null) continue;

    if (value > futureLimit) {
      errors.push({
        field,
        message: `${TIMELINE_FIELD_LABELS[field]} cannot be in the future`,
      });
    }

    if (value < pastLimit) {
      errors.push({
        field,
        message: `${TIMELINE_FIELD_LABELS[field]} is more than 48 hours in the past — possible date error`,
      });
    }
  }

  // 2. Chronological pair checks
  for (let i = 0; i < TIMELINE_FIELD_ORDER.length - 1; i++) {
    const fieldA = TIMELINE_FIELD_ORDER[i];
    const fieldB = TIMELINE_FIELD_ORDER[i + 1];
    const a = timeline[fieldA];
    const b = timeline[fieldB];

    if (a !== null && b !== null && a >= b) {
      errors.push({
        field: fieldB,
        message: `${TIMELINE_FIELD_LABELS[fieldB]} must be after ${TIMELINE_FIELD_LABELS[fieldA]}`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Missing-items helper for soft gating
// ============================================================================

/**
 * For a given case status, returns the timeline fields that SHOULD be set
 * but are currently null.
 *
 * This is for soft warnings — it does NOT block clinical flow.
 */
export function getMissingTimelineItemsForStatus(
  status: string,
  timeline: OperativeTimeline
): { field: TimelineFieldName; label: string }[] {
  const missing: { field: TimelineFieldName; label: string }[] = [];

  const check = (field: TimelineFieldName) => {
    if (timeline[field] === null) {
      missing.push({ field, label: TIMELINE_FIELD_LABELS[field] });
    }
  };

  switch (status) {
    case 'IN_THEATER':
      // When in theater, we expect wheels-in, anesthesia start, and incision
      check('wheelsIn');
      check('anesthesiaStart');
      check('incisionTime');
      break;

    case 'RECOVERY':
      // When in recovery, all 6 timestamps should be set
      check('wheelsIn');
      check('anesthesiaStart');
      check('incisionTime');
      check('closureTime');
      check('anesthesiaEnd');
      check('wheelsOut');
      break;

    case 'COMPLETED':
      // When completed, all timestamps should be set
      check('wheelsIn');
      check('anesthesiaStart');
      check('incisionTime');
      check('closureTime');
      check('anesthesiaEnd');
      check('wheelsOut');
      break;

    default:
      // IN_PREP and earlier — no timeline expected yet
      break;
  }

  return missing;
}

// ============================================================================
// Compute derived durations
// ============================================================================

function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60_000);
}

/**
 * Computes derived durations from the timeline.
 * Returns null for any duration where the required pair of timestamps is missing.
 */
export function computeDerivedDurations(timeline: OperativeTimeline): TimelineDurations {
  const { wheelsIn, anesthesiaStart, anesthesiaEnd, incisionTime, closureTime, wheelsOut } =
    timeline;

  return {
    orTimeMinutes:
      wheelsIn && wheelsOut ? minutesBetween(wheelsIn, wheelsOut) : null,
    surgeryTimeMinutes:
      incisionTime && closureTime ? minutesBetween(incisionTime, closureTime) : null,
    prepTimeMinutes:
      wheelsIn && incisionTime ? minutesBetween(wheelsIn, incisionTime) : null,
    closeOutTimeMinutes:
      closureTime && wheelsOut ? minutesBetween(closureTime, wheelsOut) : null,
    anesthesiaTimeMinutes:
      anesthesiaStart && anesthesiaEnd ? minutesBetween(anesthesiaStart, anesthesiaEnd) : null,
  };
}

// ============================================================================
// Conversion helpers
// ============================================================================

/** Convert DB record (snake_case) to domain `OperativeTimeline`. */
export function dbRecordToTimeline(record: {
  wheels_in: Date | null;
  anesthesia_start: Date | null;
  anesthesia_end: Date | null;
  incision_time: Date | null;
  closure_time: Date | null;
  wheels_out: Date | null;
}): OperativeTimeline {
  return {
    wheelsIn: record.wheels_in,
    anesthesiaStart: record.anesthesia_start,
    anesthesiaEnd: record.anesthesia_end,
    incisionTime: record.incision_time,
    closureTime: record.closure_time,
    wheelsOut: record.wheels_out,
  };
}

/** Convert domain `OperativeTimeline` to DTO (ISO strings). */
export function timelineToDto(timeline: OperativeTimeline): OperativeTimelineDto {
  return {
    wheelsIn: timeline.wheelsIn?.toISOString() ?? null,
    anesthesiaStart: timeline.anesthesiaStart?.toISOString() ?? null,
    anesthesiaEnd: timeline.anesthesiaEnd?.toISOString() ?? null,
    incisionTime: timeline.incisionTime?.toISOString() ?? null,
    closureTime: timeline.closureTime?.toISOString() ?? null,
    wheelsOut: timeline.wheelsOut?.toISOString() ?? null,
  };
}
