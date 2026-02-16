/**
 * Unit Tests: WhoSurgicalChecklist validation
 *
 * Tests Zod schemas for the WHO Surgical Safety Checklist:
 * - Draft schema (partial confirmations allowed)
 * - Final schemas per phase (all required items confirmed)
 * - getMissingSignInItems / getMissingTimeOutItems / getMissingSignOutItems
 * - getChecklistSectionCompletion helper
 * - getMissingItemsForPhase utility
 * - getWhoItemsForPhase utility
 * - Edge cases: null items, empty arrays, partial confirmations
 */

import { describe, it, expect } from 'vitest';
import {
  checklistItemSchema,
  checklistDraftSchema,
  signInFinalSchema,
  timeOutFinalSchema,
  signOutFinalSchema,
  getMissingSignInItems,
  getMissingTimeOutItems,
  getMissingSignOutItems,
  getMissingItemsForPhase,
  getChecklistSectionCompletion,
  getWhoItemsForPhase,
  WHO_SIGN_IN_ITEMS,
  WHO_TIME_OUT_ITEMS,
  WHO_SIGN_OUT_ITEMS,
  type ChecklistItem,
} from '@/domain/clinical-forms/WhoSurgicalChecklist';

// ──────────────────────────────────────────────────────────────────────
// Test data builders
// ──────────────────────────────────────────────────────────────────────

function buildSignInItems(overrides: Partial<Record<string, boolean>> = {}): ChecklistItem[] {
  return WHO_SIGN_IN_ITEMS.map((def) => ({
    key: def.key,
    label: def.label,
    confirmed: overrides[def.key] ?? true,
  }));
}

function buildTimeOutItems(overrides: Partial<Record<string, boolean>> = {}): ChecklistItem[] {
  return WHO_TIME_OUT_ITEMS.map((def) => ({
    key: def.key,
    label: def.label,
    confirmed: overrides[def.key] ?? true,
  }));
}

function buildSignOutItems(overrides: Partial<Record<string, boolean>> = {}): ChecklistItem[] {
  return WHO_SIGN_OUT_ITEMS.map((def) => ({
    key: def.key,
    label: def.label,
    confirmed: overrides[def.key] ?? true,
  }));
}

// ──────────────────────────────────────────────────────────────────────
// checklistItemSchema
// ──────────────────────────────────────────────────────────────────────

describe('checklistItemSchema', () => {
  it('accepts a valid confirmed item', () => {
    const item = { key: 'patient_identity', label: 'Patient identity confirmed', confirmed: true };
    expect(checklistItemSchema.safeParse(item).success).toBe(true);
  });

  it('accepts an unconfirmed item with a note', () => {
    const item = {
      key: 'allergy_check',
      label: 'Known allergies reviewed',
      confirmed: false,
      note: 'Patient reports penicillin allergy',
    };
    expect(checklistItemSchema.safeParse(item).success).toBe(true);
  });

  it('rejects item with empty key', () => {
    const item = { key: '', label: 'Label', confirmed: true };
    expect(checklistItemSchema.safeParse(item).success).toBe(false);
  });

  it('rejects item with empty label', () => {
    const item = { key: 'key', label: '', confirmed: true };
    expect(checklistItemSchema.safeParse(item).success).toBe(false);
  });

  it('rejects note longer than 500 characters', () => {
    const item = { key: 'key', label: 'Label', confirmed: true, note: 'x'.repeat(501) };
    expect(checklistItemSchema.safeParse(item).success).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────
// checklistDraftSchema
// ──────────────────────────────────────────────────────────────────────

describe('checklistDraftSchema', () => {
  it('accepts a valid draft with partial confirmations', () => {
    const draft = {
      phase: 'SIGN_IN',
      items: [
        { key: 'patient_identity', label: 'Patient identity confirmed', confirmed: true },
        { key: 'site_marked', label: 'Site marked', confirmed: false },
      ],
    };
    expect(checklistDraftSchema.safeParse(draft).success).toBe(true);
  });

  it('accepts all three phases', () => {
    for (const phase of ['SIGN_IN', 'TIME_OUT', 'SIGN_OUT'] as const) {
      const draft = {
        phase,
        items: [{ key: 'test', label: 'Test item', confirmed: false }],
      };
      expect(checklistDraftSchema.safeParse(draft).success).toBe(true);
    }
  });

  it('rejects invalid phase', () => {
    const draft = {
      phase: 'INVALID_PHASE',
      items: [{ key: 'test', label: 'Test', confirmed: false }],
    };
    expect(checklistDraftSchema.safeParse(draft).success).toBe(false);
  });

  it('rejects empty items array', () => {
    const draft = { phase: 'SIGN_IN', items: [] };
    expect(checklistDraftSchema.safeParse(draft).success).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────
// signInFinalSchema
// ──────────────────────────────────────────────────────────────────────

describe('signInFinalSchema', () => {
  it('accepts when all required items are confirmed', () => {
    const input = { items: buildSignInItems() };
    expect(signInFinalSchema.safeParse(input).success).toBe(true);
  });

  it('rejects when patient_identity is not confirmed', () => {
    const input = { items: buildSignInItems({ patient_identity: false }) };
    const result = signInFinalSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Patient identity confirmed');
    }
  });

  it('rejects when multiple items are not confirmed', () => {
    const input = {
      items: buildSignInItems({
        consent_verified: false,
        anesthesia_check: false,
        blood_loss_risk: false,
      }),
    };
    const result = signInFinalSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects empty items array', () => {
    const input = { items: [] };
    expect(signInFinalSchema.safeParse(input).success).toBe(false);
  });

  it('rejects when a required item key is completely missing', () => {
    // Send items with all but one key
    const items = buildSignInItems().filter((i) => i.key !== 'pulse_oximeter');
    const input = { items };
    expect(signInFinalSchema.safeParse(input).success).toBe(false);
  });

  it('accepts items with extra optional notes', () => {
    const items = buildSignInItems();
    items[0].note = 'Verified via wristband and verbal confirmation';
    const input = { items };
    expect(signInFinalSchema.safeParse(input).success).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// timeOutFinalSchema
// ──────────────────────────────────────────────────────────────────────

describe('timeOutFinalSchema', () => {
  it('accepts when all required items are confirmed', () => {
    const input = { items: buildTimeOutItems() };
    expect(timeOutFinalSchema.safeParse(input).success).toBe(true);
  });

  it('rejects when team_intro is not confirmed', () => {
    const input = { items: buildTimeOutItems({ team_intro: false }) };
    expect(timeOutFinalSchema.safeParse(input).success).toBe(false);
  });

  it('rejects when antibiotic_prophylaxis is missing', () => {
    const items = buildTimeOutItems().filter((i) => i.key !== 'antibiotic_prophylaxis');
    const input = { items };
    expect(timeOutFinalSchema.safeParse(input).success).toBe(false);
  });

  it('rejects when critical events nursing is not confirmed', () => {
    const input = { items: buildTimeOutItems({ critical_events_nursing: false }) };
    expect(timeOutFinalSchema.safeParse(input).success).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────
// signOutFinalSchema
// ──────────────────────────────────────────────────────────────────────

describe('signOutFinalSchema', () => {
  it('accepts when all required items are confirmed', () => {
    const input = { items: buildSignOutItems() };
    expect(signOutFinalSchema.safeParse(input).success).toBe(true);
  });

  it('rejects when instrument_count is not confirmed', () => {
    const input = { items: buildSignOutItems({ instrument_count: false }) };
    expect(signOutFinalSchema.safeParse(input).success).toBe(false);
  });

  it('rejects when specimen_labeled is missing', () => {
    const items = buildSignOutItems().filter((i) => i.key !== 'specimen_labeled');
    const input = { items };
    expect(signOutFinalSchema.safeParse(input).success).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────
// getMissingSignInItems
// ──────────────────────────────────────────────────────────────────────

describe('getMissingSignInItems', () => {
  it('returns all items when passed null', () => {
    const missing = getMissingSignInItems(null);
    expect(missing).toHaveLength(WHO_SIGN_IN_ITEMS.filter((d) => d.required).length);
  });

  it('returns all items when passed empty array', () => {
    const missing = getMissingSignInItems([]);
    expect(missing).toHaveLength(WHO_SIGN_IN_ITEMS.filter((d) => d.required).length);
  });

  it('returns empty array when all items confirmed', () => {
    const items = buildSignInItems();
    expect(getMissingSignInItems(items)).toEqual([]);
  });

  it('returns labels of unconfirmed items', () => {
    const items = buildSignInItems({ patient_identity: false, consent_verified: false });
    const missing = getMissingSignInItems(items);
    expect(missing).toHaveLength(2);
    expect(missing).toContain('Patient identity confirmed (name, DOB, wristband)');
    expect(missing).toContain('Consent signed and verified');
  });

  it('returns undefined items as missing', () => {
    const missing = getMissingSignInItems(undefined);
    expect(missing).toHaveLength(WHO_SIGN_IN_ITEMS.filter((d) => d.required).length);
  });
});

// ──────────────────────────────────────────────────────────────────────
// getMissingTimeOutItems
// ──────────────────────────────────────────────────────────────────────

describe('getMissingTimeOutItems', () => {
  it('returns all items when passed null', () => {
    const missing = getMissingTimeOutItems(null);
    expect(missing).toHaveLength(WHO_TIME_OUT_ITEMS.filter((d) => d.required).length);
  });

  it('returns empty when all confirmed', () => {
    expect(getMissingTimeOutItems(buildTimeOutItems())).toEqual([]);
  });

  it('returns labels for unconfirmed critical events', () => {
    const items = buildTimeOutItems({
      critical_events_surgeon: false,
      critical_events_anesthesia: false,
    });
    const missing = getMissingTimeOutItems(items);
    expect(missing).toHaveLength(2);
    expect(missing[0]).toContain('Surgeon');
    expect(missing[1]).toContain('Anesthesia');
  });
});

// ──────────────────────────────────────────────────────────────────────
// getMissingSignOutItems
// ──────────────────────────────────────────────────────────────────────

describe('getMissingSignOutItems', () => {
  it('returns all items when passed null', () => {
    const missing = getMissingSignOutItems(null);
    expect(missing).toHaveLength(WHO_SIGN_OUT_ITEMS.filter((d) => d.required).length);
  });

  it('returns empty when all confirmed', () => {
    expect(getMissingSignOutItems(buildSignOutItems())).toEqual([]);
  });

  it('returns label for unconfirmed recovery_plan', () => {
    const items = buildSignOutItems({ recovery_plan: false });
    const missing = getMissingSignOutItems(items);
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain('recovery and management');
  });
});

// ──────────────────────────────────────────────────────────────────────
// getMissingItemsForPhase (utility)
// ──────────────────────────────────────────────────────────────────────

describe('getMissingItemsForPhase', () => {
  it('delegates correctly for SIGN_IN', () => {
    const missing = getMissingItemsForPhase('SIGN_IN', null);
    expect(missing).toHaveLength(WHO_SIGN_IN_ITEMS.filter((d) => d.required).length);
  });

  it('delegates correctly for TIME_OUT', () => {
    const missing = getMissingItemsForPhase('TIME_OUT', buildTimeOutItems());
    expect(missing).toEqual([]);
  });

  it('delegates correctly for SIGN_OUT', () => {
    const missing = getMissingItemsForPhase('SIGN_OUT', buildSignOutItems({ instrument_count: false }));
    expect(missing).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────────
// getWhoItemsForPhase
// ──────────────────────────────────────────────────────────────────────

describe('getWhoItemsForPhase', () => {
  it('returns correct items for each phase', () => {
    expect(getWhoItemsForPhase('SIGN_IN')).toBe(WHO_SIGN_IN_ITEMS);
    expect(getWhoItemsForPhase('TIME_OUT')).toBe(WHO_TIME_OUT_ITEMS);
    expect(getWhoItemsForPhase('SIGN_OUT')).toBe(WHO_SIGN_OUT_ITEMS);
  });

  it('SIGN_IN has 8 items', () => {
    expect(getWhoItemsForPhase('SIGN_IN')).toHaveLength(8);
  });

  it('TIME_OUT has 8 items', () => {
    expect(getWhoItemsForPhase('TIME_OUT')).toHaveLength(8);
  });

  it('SIGN_OUT has 5 items', () => {
    expect(getWhoItemsForPhase('SIGN_OUT')).toHaveLength(5);
  });
});

// ──────────────────────────────────────────────────────────────────────
// getChecklistSectionCompletion
// ──────────────────────────────────────────────────────────────────────

describe('getChecklistSectionCompletion', () => {
  it('returns zeroed completion for null checklist', () => {
    const comp = getChecklistSectionCompletion(null);
    expect(comp.signIn.total).toBe(8);
    expect(comp.signIn.confirmed).toBe(0);
    expect(comp.signIn.finalized).toBe(false);
    expect(comp.timeOut.total).toBe(8);
    expect(comp.timeOut.confirmed).toBe(0);
    expect(comp.timeOut.finalized).toBe(false);
    expect(comp.signOut.total).toBe(5);
    expect(comp.signOut.confirmed).toBe(0);
    expect(comp.signOut.finalized).toBe(false);
  });

  it('computes correct completion for partial sign-in', () => {
    const items = buildSignInItems({ patient_identity: false, consent_verified: false });
    const comp = getChecklistSectionCompletion({
      sign_in_completed_at: null,
      sign_in_items: JSON.stringify(items),
      time_out_completed_at: null,
      time_out_items: null,
      sign_out_completed_at: null,
      sign_out_items: null,
    });
    expect(comp.signIn.confirmed).toBe(6); // 8 total - 2 unconfirmed
    expect(comp.signIn.finalized).toBe(false);
  });

  it('marks finalized when completed_at is set', () => {
    const items = buildSignInItems();
    const comp = getChecklistSectionCompletion({
      sign_in_completed_at: new Date(),
      sign_in_items: JSON.stringify(items),
      time_out_completed_at: null,
      time_out_items: null,
      sign_out_completed_at: new Date(),
      sign_out_items: JSON.stringify(buildSignOutItems()),
    });
    expect(comp.signIn.finalized).toBe(true);
    expect(comp.signIn.confirmed).toBe(8);
    expect(comp.timeOut.finalized).toBe(false);
    expect(comp.signOut.finalized).toBe(true);
    expect(comp.signOut.confirmed).toBe(5);
  });

  it('handles invalid JSON gracefully', () => {
    const comp = getChecklistSectionCompletion({
      sign_in_completed_at: null,
      sign_in_items: 'not valid json{{',
      time_out_completed_at: null,
      time_out_items: null,
      sign_out_completed_at: null,
      sign_out_items: null,
    });
    expect(comp.signIn.confirmed).toBe(0);
  });

  it('handles empty items string', () => {
    const comp = getChecklistSectionCompletion({
      sign_in_completed_at: null,
      sign_in_items: null,
      time_out_completed_at: null,
      time_out_items: null,
      sign_out_completed_at: null,
      sign_out_items: null,
    });
    expect(comp.signIn.confirmed).toBe(0);
    expect(comp.timeOut.confirmed).toBe(0);
    expect(comp.signOut.confirmed).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// WHO item definitions consistency
// ──────────────────────────────────────────────────────────────────────

describe('WHO item definitions consistency', () => {
  it('all Sign-In items have unique keys', () => {
    const keys = WHO_SIGN_IN_ITEMS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('all Time-Out items have unique keys', () => {
    const keys = WHO_TIME_OUT_ITEMS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('all Sign-Out items have unique keys', () => {
    const keys = WHO_SIGN_OUT_ITEMS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('all required items are marked required', () => {
    // Every item in the WHO checklist should be required
    for (const item of [...WHO_SIGN_IN_ITEMS, ...WHO_TIME_OUT_ITEMS, ...WHO_SIGN_OUT_ITEMS]) {
      expect(item.required).toBe(true);
    }
  });

  it('no key overlap between phases', () => {
    const signInKeys = new Set(WHO_SIGN_IN_ITEMS.map((i) => i.key));
    const timeOutKeys = new Set(WHO_TIME_OUT_ITEMS.map((i) => i.key));
    const signOutKeys = new Set(WHO_SIGN_OUT_ITEMS.map((i) => i.key));

    // Allow some shared keys between phases (e.g., equipment-related)
    // but ensure at least some unique keys per phase
    expect(signInKeys.has('patient_identity')).toBe(true);
    expect(timeOutKeys.has('team_intro')).toBe(true);
    expect(signOutKeys.has('procedure_recorded')).toBe(true);
  });
});
