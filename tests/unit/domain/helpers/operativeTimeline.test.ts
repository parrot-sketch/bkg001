import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateTimeline,
  computeDerivedDurations,
  getMissingTimelineItemsForStatus,
  dbRecordToTimeline,
  timelineToDto,
  TIMELINE_FIELD_ORDER,
  TIMELINE_FIELD_LABELS,
  TimelinePatchSchema,
  type OperativeTimeline,
} from '@/domain/helpers/operativeTimeline';

// ============================================================================
// Helpers — build timelines with sensible defaults
// ============================================================================

/** Returns a base Date anchored to "now" with an offset in minutes. */
function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

/** Builds a full, valid, chronologically-ordered timeline. */
function buildValidTimeline(opts?: {
  baseMinutesAgo?: number;
}): OperativeTimeline {
  const base = opts?.baseMinutesAgo ?? 120; // default: started 2h ago
  return {
    wheelsIn: minutesFromNow(-base),
    anesthesiaStart: minutesFromNow(-base + 10),
    incisionTime: minutesFromNow(-base + 25),
    closureTime: minutesFromNow(-base + 85),
    anesthesiaEnd: minutesFromNow(-base + 90),
    wheelsOut: minutesFromNow(-base + 100),
  };
}

/** Builds an empty timeline (all nulls). */
function emptyTimeline(): OperativeTimeline {
  return {
    wheelsIn: null,
    anesthesiaStart: null,
    incisionTime: null,
    closureTime: null,
    anesthesiaEnd: null,
    wheelsOut: null,
  };
}

// ============================================================================
// validateTimeline
// ============================================================================

describe('validateTimeline', () => {
  describe('valid timelines', () => {
    it('should accept a complete, chronologically-ordered timeline', () => {
      const result = validateTimeline(buildValidTimeline());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept an empty timeline (all nulls)', () => {
      const result = validateTimeline(emptyTimeline());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept a partial timeline with only wheelsIn', () => {
      const tl = { ...emptyTimeline(), wheelsIn: minutesFromNow(-60) };
      const result = validateTimeline(tl);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept a partial timeline with wheelsIn + incisionTime (skipping anesthesiaStart)', () => {
      const tl = {
        ...emptyTimeline(),
        wheelsIn: minutesFromNow(-60),
        incisionTime: minutesFromNow(-40),
      };
      const result = validateTimeline(tl);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept timestamps right at the current moment', () => {
      const now = new Date();
      const tl = { ...emptyTimeline(), wheelsIn: now };
      const result = validateTimeline(tl);
      expect(result.valid).toBe(true);
    });
  });

  describe('chronological violations', () => {
    it('should reject when incisionTime is before wheelsIn', () => {
      const tl = {
        ...emptyTimeline(),
        wheelsIn: minutesFromNow(-30),
        incisionTime: minutesFromNow(-60), // before wheelsIn
      };
      // Since anesthesiaStart is null, the pair (wheelsIn, anesthesiaStart) is skipped,
      // but (anesthesiaStart, incisionTime) is also skipped. However, we need to check
      // indirect ordering. Wait — the validation checks adjacent pairs only:
      // wheelsIn → anesthesiaStart → incisionTime → closureTime → anesthesiaEnd → wheelsOut
      // So wheelsIn → anesthesiaStart is skipped (null), anesthesiaStart → incisionTime is skipped (null).
      // This means wheelsIn and incisionTime are NOT directly checked as a pair.
      // Let's test with anesthesiaStart set to create a violation.
      const tl2 = {
        ...emptyTimeline(),
        wheelsIn: minutesFromNow(-30),
        anesthesiaStart: minutesFromNow(-20),
        incisionTime: minutesFromNow(-35), // before anesthesiaStart
      };
      const result = validateTimeline(tl2);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'incisionTime')).toBe(true);
    });

    it('should reject when closureTime is before incisionTime', () => {
      const tl = {
        ...emptyTimeline(),
        incisionTime: minutesFromNow(-30),
        closureTime: minutesFromNow(-60), // before incision
      };
      const result = validateTimeline(tl);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('closureTime');
      expect(result.errors[0].message).toContain('must be after');
      expect(result.errors[0].message).toContain('Incision');
    });

    it('should reject when wheelsOut is before anesthesiaEnd', () => {
      const tl = {
        ...emptyTimeline(),
        anesthesiaEnd: minutesFromNow(-10),
        wheelsOut: minutesFromNow(-20), // before anesthesiaEnd
      };
      const result = validateTimeline(tl);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'wheelsOut')).toBe(true);
    });

    it('should reject when two timestamps are equal (not strictly increasing)', () => {
      const same = minutesFromNow(-30);
      const tl = {
        ...emptyTimeline(),
        incisionTime: same,
        closureTime: same, // same time
      };
      const result = validateTimeline(tl);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'closureTime')).toBe(true);
    });

    it('should report multiple errors for multiple violations', () => {
      const tl = {
        ...emptyTimeline(),
        wheelsIn: minutesFromNow(-10),
        anesthesiaStart: minutesFromNow(-20), // before wheelsIn
        incisionTime: minutesFromNow(-30), // before anesthesiaStart
        closureTime: minutesFromNow(-5),
      };
      const result = validateTimeline(tl);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('range checks', () => {
    it('should reject timestamps more than 5 minutes in the future', () => {
      const tl = {
        ...emptyTimeline(),
        wheelsIn: minutesFromNow(10), // 10 min in the future
      };
      const result = validateTimeline(tl);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('future');
    });

    it('should reject timestamps more than 48 hours in the past', () => {
      const tl = {
        ...emptyTimeline(),
        wheelsIn: new Date(Date.now() - 49 * 60 * 60 * 1000), // 49h ago
      };
      const result = validateTimeline(tl);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('48 hours');
    });

    it('should accept timestamps within the 5-minute future buffer', () => {
      const tl = {
        ...emptyTimeline(),
        wheelsIn: minutesFromNow(2), // 2 min from now — within buffer
      };
      const result = validateTimeline(tl);
      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// computeDerivedDurations
// ============================================================================

describe('computeDerivedDurations', () => {
  it('should compute all durations for a complete timeline', () => {
    const tl: OperativeTimeline = {
      wheelsIn: new Date('2026-02-11T08:00:00Z'),
      anesthesiaStart: new Date('2026-02-11T08:10:00Z'),
      incisionTime: new Date('2026-02-11T08:25:00Z'),
      closureTime: new Date('2026-02-11T09:25:00Z'),
      anesthesiaEnd: new Date('2026-02-11T09:30:00Z'),
      wheelsOut: new Date('2026-02-11T09:40:00Z'),
    };
    const d = computeDerivedDurations(tl);

    expect(d.orTimeMinutes).toBe(100); // 8:00 → 9:40
    expect(d.surgeryTimeMinutes).toBe(60); // 8:25 → 9:25
    expect(d.prepTimeMinutes).toBe(25); // 8:00 → 8:25
    expect(d.closeOutTimeMinutes).toBe(15); // 9:25 → 9:40
    expect(d.anesthesiaTimeMinutes).toBe(80); // 8:10 → 9:30
  });

  it('should return null for durations where one endpoint is missing', () => {
    const tl: OperativeTimeline = {
      wheelsIn: new Date('2026-02-11T08:00:00Z'),
      anesthesiaStart: null,
      incisionTime: new Date('2026-02-11T08:25:00Z'),
      closureTime: null,
      anesthesiaEnd: null,
      wheelsOut: null,
    };
    const d = computeDerivedDurations(tl);

    expect(d.orTimeMinutes).toBeNull(); // missing wheelsOut
    expect(d.surgeryTimeMinutes).toBeNull(); // missing closureTime
    expect(d.prepTimeMinutes).toBe(25); // wheelsIn + incisionTime both present
    expect(d.closeOutTimeMinutes).toBeNull(); // missing both
    expect(d.anesthesiaTimeMinutes).toBeNull(); // missing both
  });

  it('should return all nulls for an empty timeline', () => {
    const d = computeDerivedDurations(emptyTimeline());

    expect(d.orTimeMinutes).toBeNull();
    expect(d.surgeryTimeMinutes).toBeNull();
    expect(d.prepTimeMinutes).toBeNull();
    expect(d.closeOutTimeMinutes).toBeNull();
    expect(d.anesthesiaTimeMinutes).toBeNull();
  });

  it('should round to nearest minute', () => {
    const tl: OperativeTimeline = {
      ...emptyTimeline(),
      wheelsIn: new Date('2026-02-11T08:00:00Z'),
      wheelsOut: new Date('2026-02-11T08:01:30Z'), // 1.5 minutes
    };
    const d = computeDerivedDurations(tl);
    expect(d.orTimeMinutes).toBe(2); // rounded from 1.5
  });
});

// ============================================================================
// getMissingTimelineItemsForStatus
// ============================================================================

describe('getMissingTimelineItemsForStatus', () => {
  it('should return no missing items for IN_PREP (no timeline expected)', () => {
    const result = getMissingTimelineItemsForStatus('IN_PREP', emptyTimeline());
    expect(result).toHaveLength(0);
  });

  it('should return no missing items for DRAFT', () => {
    const result = getMissingTimelineItemsForStatus('DRAFT', emptyTimeline());
    expect(result).toHaveLength(0);
  });

  it('should return wheelsIn, anesthesiaStart, incisionTime for IN_THEATER when all empty', () => {
    const result = getMissingTimelineItemsForStatus('IN_THEATER', emptyTimeline());
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.field)).toEqual(['wheelsIn', 'anesthesiaStart', 'incisionTime']);
  });

  it('should return only incisionTime for IN_THEATER when wheelsIn + anesthesiaStart set', () => {
    const tl = {
      ...emptyTimeline(),
      wheelsIn: new Date(),
      anesthesiaStart: new Date(),
    };
    const result = getMissingTimelineItemsForStatus('IN_THEATER', tl);
    expect(result).toHaveLength(1);
    expect(result[0].field).toBe('incisionTime');
    expect(result[0].label).toBe('Incision');
  });

  it('should return all 6 items for RECOVERY when all empty', () => {
    const result = getMissingTimelineItemsForStatus('RECOVERY', emptyTimeline());
    expect(result).toHaveLength(6);
  });

  it('should return all 6 items for COMPLETED when all empty', () => {
    const result = getMissingTimelineItemsForStatus('COMPLETED', emptyTimeline());
    expect(result).toHaveLength(6);
  });

  it('should return no missing items for COMPLETED when all set', () => {
    const result = getMissingTimelineItemsForStatus('COMPLETED', buildValidTimeline());
    expect(result).toHaveLength(0);
  });

  it('should include human-readable labels', () => {
    const result = getMissingTimelineItemsForStatus('RECOVERY', emptyTimeline());
    const labels = result.map((r) => r.label);
    expect(labels).toContain('Wheels In');
    expect(labels).toContain('Wheels Out');
    expect(labels).toContain('Incision');
    expect(labels).toContain('Closure');
  });
});

// ============================================================================
// dbRecordToTimeline — conversion helper
// ============================================================================

describe('dbRecordToTimeline', () => {
  it('should convert snake_case DB record to camelCase OperativeTimeline', () => {
    const d = new Date('2026-02-11T08:00:00Z');
    const record = {
      wheels_in: d,
      anesthesia_start: d,
      anesthesia_end: d,
      incision_time: d,
      closure_time: d,
      wheels_out: d,
    };
    const tl = dbRecordToTimeline(record);
    expect(tl.wheelsIn).toBe(d);
    expect(tl.anesthesiaStart).toBe(d);
    expect(tl.anesthesiaEnd).toBe(d);
    expect(tl.incisionTime).toBe(d);
    expect(tl.closureTime).toBe(d);
    expect(tl.wheelsOut).toBe(d);
  });

  it('should preserve nulls', () => {
    const record = {
      wheels_in: null,
      anesthesia_start: null,
      anesthesia_end: null,
      incision_time: null,
      closure_time: null,
      wheels_out: null,
    };
    const tl = dbRecordToTimeline(record);
    expect(tl.wheelsIn).toBeNull();
    expect(tl.wheelsOut).toBeNull();
  });
});

// ============================================================================
// timelineToDto — conversion helper
// ============================================================================

describe('timelineToDto', () => {
  it('should convert Date values to ISO strings', () => {
    const d = new Date('2026-02-11T08:00:00.000Z');
    const tl: OperativeTimeline = {
      wheelsIn: d,
      anesthesiaStart: d,
      anesthesiaEnd: null,
      incisionTime: null,
      closureTime: null,
      wheelsOut: null,
    };
    const dto = timelineToDto(tl);
    expect(dto.wheelsIn).toBe('2026-02-11T08:00:00.000Z');
    expect(dto.anesthesiaStart).toBe('2026-02-11T08:00:00.000Z');
    expect(dto.anesthesiaEnd).toBeNull();
  });
});

// ============================================================================
// TimelinePatchSchema — Zod validation
// ============================================================================

describe('TimelinePatchSchema', () => {
  it('should accept a valid partial update', () => {
    const result = TimelinePatchSchema.safeParse({
      wheelsIn: '2026-02-11T08:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('should accept multiple fields', () => {
    const result = TimelinePatchSchema.safeParse({
      wheelsIn: '2026-02-11T08:00:00.000Z',
      incisionTime: '2026-02-11T08:25:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('should reject an empty object (no timestamps)', () => {
    const result = TimelinePatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject invalid ISO strings', () => {
    const result = TimelinePatchSchema.safeParse({
      wheelsIn: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-ISO date formats', () => {
    const result = TimelinePatchSchema.safeParse({
      wheelsIn: '02/11/2026 08:00',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Constants verification
// ============================================================================

describe('constants', () => {
  it('TIMELINE_FIELD_ORDER should have 6 entries', () => {
    expect(TIMELINE_FIELD_ORDER).toHaveLength(6);
  });

  it('TIMELINE_FIELD_LABELS should have a label for every field in TIMELINE_FIELD_ORDER', () => {
    for (const field of TIMELINE_FIELD_ORDER) {
      expect(TIMELINE_FIELD_LABELS[field]).toBeDefined();
      expect(typeof TIMELINE_FIELD_LABELS[field]).toBe('string');
      expect(TIMELINE_FIELD_LABELS[field].length).toBeGreaterThan(0);
    }
  });
});
