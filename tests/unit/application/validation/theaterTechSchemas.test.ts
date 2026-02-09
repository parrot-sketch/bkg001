import { describe, it, expect } from 'vitest';
import {
  CaseTransitionSchema,
  ProcedureTimestampSchema,
  ChecklistUpdateSchema,
} from '../../../../application/validation/theaterTechSchemas';

describe('CaseTransitionSchema', () => {
  it('should accept valid actions', () => {
    expect(CaseTransitionSchema.safeParse({ action: 'IN_PREP' }).success).toBe(true);
    expect(CaseTransitionSchema.safeParse({ action: 'IN_THEATER' }).success).toBe(true);
    expect(CaseTransitionSchema.safeParse({ action: 'RECOVERY' }).success).toBe(true);
    expect(CaseTransitionSchema.safeParse({ action: 'COMPLETED' }).success).toBe(true);
  });

  it('should reject invalid actions', () => {
    expect(CaseTransitionSchema.safeParse({ action: 'INVALID' }).success).toBe(false);
    expect(CaseTransitionSchema.safeParse({ action: '' }).success).toBe(false);
    expect(CaseTransitionSchema.safeParse({}).success).toBe(false);
  });

  it('should accept optional reason', () => {
    const result = CaseTransitionSchema.safeParse({
      action: 'IN_PREP',
      reason: 'Patient arrived early',
    });
    expect(result.success).toBe(true);
  });

  it('should reject reason longer than 500 chars', () => {
    const result = CaseTransitionSchema.safeParse({
      action: 'IN_PREP',
      reason: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('ProcedureTimestampSchema', () => {
  it('should accept valid ISO datetimes', () => {
    const result = ProcedureTimestampSchema.safeParse({
      anesthesiaStart: '2026-02-08T08:00:00Z',
      incisionTime: '2026-02-08T08:15:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('should reject if no timestamp fields provided', () => {
    const result = ProcedureTimestampSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject non-ISO strings', () => {
    const result = ProcedureTimestampSchema.safeParse({
      anesthesiaStart: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('should accept single field', () => {
    const result = ProcedureTimestampSchema.safeParse({
      wheelsOut: '2026-02-08T12:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});

describe('ChecklistUpdateSchema', () => {
  it('should accept valid checklist update', () => {
    const result = ChecklistUpdateSchema.safeParse({
      phase: 'SIGN_IN',
      items: [
        { key: 'patient_identity', label: 'Patient identity confirmed', confirmed: true },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid phase', () => {
    const result = ChecklistUpdateSchema.safeParse({
      phase: 'INVALID_PHASE',
      items: [{ key: 'x', label: 'X', confirmed: true }],
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty items array', () => {
    const result = ChecklistUpdateSchema.safeParse({
      phase: 'SIGN_IN',
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('should reject items with missing key', () => {
    const result = ChecklistUpdateSchema.safeParse({
      phase: 'SIGN_IN',
      items: [{ key: '', label: 'Check', confirmed: true }],
    });
    expect(result.success).toBe(false);
  });

  it('should accept items with notes', () => {
    const result = ChecklistUpdateSchema.safeParse({
      phase: 'TIME_OUT',
      items: [
        {
          key: 'team_intro',
          label: 'Team introduced',
          confirmed: true,
          note: 'Dr. Smith leading',
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
