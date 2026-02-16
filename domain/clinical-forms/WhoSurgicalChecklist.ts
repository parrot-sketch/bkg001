/**
 * Domain: WHO Surgical Safety Checklist
 *
 * Type-safe schemas and validation for the WHO Surgical Safety Checklist
 * with three phases: Sign-In (before anesthesia), Time-Out (before incision),
 * Sign-Out (before leaving OR).
 *
 * Data lives in the dedicated SurgicalChecklist table (per-phase timestamp
 * columns for efficient gate queries). This domain file adds:
 *   - Canonical WHO item definitions per phase
 *   - Zod draft schema (items with optional confirmations)
 *   - Zod final schemas (all required items confirmed)
 *   - Helper functions for missing items + section completion
 *
 * Source of truth: SurgicalChecklist table, enhanced with typed JSON items.
 */

import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────

export const WHO_CHECKLIST_KEY = 'WHO_SURGICAL_CHECKLIST' as const;
export const WHO_CHECKLIST_VERSION = 1;

// ──────────────────────────────────────────────────────────────────────
// Item Definition Types
// ──────────────────────────────────────────────────────────────────────

export interface WhoChecklistItemDef {
  /** Unique machine-readable key */
  key: string;
  /** Human-readable label shown in UI */
  label: string;
  /** Whether the item must be confirmed to finalize the phase */
  required: boolean;
  /** Optional helper text for the user */
  helpText?: string;
}

// ──────────────────────────────────────────────────────────────────────
// Canonical WHO Item Definitions — Sign-In
// (Before induction of anesthesia)
// ──────────────────────────────────────────────────────────────────────

export const WHO_SIGN_IN_ITEMS: readonly WhoChecklistItemDef[] = [
  {
    key: 'patient_identity',
    label: 'Patient identity confirmed (name, DOB, wristband)',
    required: true,
  },
  {
    key: 'site_marked',
    label: 'Surgical site marked / not applicable',
    required: true,
  },
  {
    key: 'consent_verified',
    label: 'Consent signed and verified',
    required: true,
  },
  {
    key: 'anesthesia_check',
    label: 'Anesthesia safety check completed',
    required: true,
  },
  {
    key: 'pulse_oximeter',
    label: 'Pulse oximeter on patient and functioning',
    required: true,
  },
  {
    key: 'allergy_check',
    label: 'Known allergies reviewed',
    required: true,
  },
  {
    key: 'airway_risk',
    label: 'Difficult airway / aspiration risk assessed',
    required: true,
    helpText: 'Equipment and assistance available if needed',
  },
  {
    key: 'blood_loss_risk',
    label: 'Risk of >500ml blood loss assessed',
    required: true,
    helpText: 'Adequate IV access and fluids planned',
  },
] as const;

// ──────────────────────────────────────────────────────────────────────
// Canonical WHO Item Definitions — Time-Out
// (Before skin incision)
// ──────────────────────────────────────────────────────────────────────

export const WHO_TIME_OUT_ITEMS: readonly WhoChecklistItemDef[] = [
  {
    key: 'team_intro',
    label: 'All team members introduced by name and role',
    required: true,
  },
  {
    key: 'patient_confirm',
    label: 'Patient name, procedure, and incision site confirmed',
    required: true,
  },
  {
    key: 'antibiotic_prophylaxis',
    label: 'Antibiotic prophylaxis given within last 60 minutes',
    required: true,
  },
  {
    key: 'critical_events_surgeon',
    label: 'Anticipated critical events — Surgeon reviewed',
    required: true,
    helpText: 'Critical steps, case duration, anticipated blood loss',
  },
  {
    key: 'critical_events_anesthesia',
    label: 'Anticipated critical events — Anesthesia reviewed',
    required: true,
    helpText: 'Patient-specific concerns',
  },
  {
    key: 'critical_events_nursing',
    label: 'Anticipated critical events — Nursing reviewed',
    required: true,
    helpText: 'Sterility confirmed, equipment issues, other concerns',
  },
  {
    key: 'imaging_displayed',
    label: 'Essential imaging displayed',
    required: true,
  },
  {
    key: 'equipment_sterile',
    label: 'Equipment sterility confirmed (indicator results)',
    required: true,
  },
] as const;

// ──────────────────────────────────────────────────────────────────────
// Canonical WHO Item Definitions — Sign-Out
// (Before patient leaves operating room)
// ──────────────────────────────────────────────────────────────────────

export const WHO_SIGN_OUT_ITEMS: readonly WhoChecklistItemDef[] = [
  {
    key: 'procedure_recorded',
    label: 'Procedure name / description recorded',
    required: true,
  },
  {
    key: 'instrument_count',
    label: 'Instrument, sponge, and needle counts correct',
    required: true,
  },
  {
    key: 'specimen_labeled',
    label: 'Specimen labeled (including patient name)',
    required: true,
  },
  {
    key: 'equipment_issues',
    label: 'Equipment problems addressed',
    required: true,
  },
  {
    key: 'recovery_plan',
    label: 'Key concerns for recovery and management reviewed',
    required: true,
  },
] as const;

// ──────────────────────────────────────────────────────────────────────
// Zod Schemas — Checklist Item
// ──────────────────────────────────────────────────────────────────────

export const checklistItemSchema = z.object({
  /** Machine-readable key matching a WhoChecklistItemDef.key */
  key: z.string().min(1, 'Item key is required'),
  /** Display label */
  label: z.string().min(1, 'Item label is required'),
  /** Whether the item has been confirmed */
  confirmed: z.boolean(),
  /** Optional free-text note */
  note: z.string().max(500).optional(),
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;

// ──────────────────────────────────────────────────────────────────────
// Draft Schemas (partial — items may have confirmed: false)
// ──────────────────────────────────────────────────────────────────────

export const checklistDraftSchema = z.object({
  phase: z.enum(['SIGN_IN', 'TIME_OUT', 'SIGN_OUT']),
  items: z.array(checklistItemSchema).min(1, 'At least one checklist item is required'),
});

export type ChecklistDraftInput = z.infer<typeof checklistDraftSchema>;

// ──────────────────────────────────────────────────────────────────────
// Final Schemas (all required items must be present AND confirmed)
// ──────────────────────────────────────────────────────────────────────

function createFinalSchema(requiredDefs: readonly WhoChecklistItemDef[]) {
  const requiredKeys = requiredDefs.filter((d) => d.required).map((d) => d.key);

  return z
    .object({
      items: z.array(checklistItemSchema).min(1),
    })
    .refine(
      (data) => {
        const confirmedKeys = new Set(
          data.items.filter((i) => i.confirmed).map((i) => i.key)
        );
        return requiredKeys.every((key) => confirmedKeys.has(key));
      },
      (data) => {
        const confirmedKeys = new Set(
          data.items.filter((i) => i.confirmed).map((i) => i.key)
        );
        const missing = requiredKeys.filter((key) => !confirmedKeys.has(key));
        const missingLabels = missing
          .map((key) => requiredDefs.find((d) => d.key === key)?.label ?? key)
          .join('; ');
        return {
          message: `Missing required items: ${missingLabels}`,
          path: ['items'],
        };
      }
    );
}

export const signInFinalSchema = createFinalSchema(WHO_SIGN_IN_ITEMS);
export const timeOutFinalSchema = createFinalSchema(WHO_TIME_OUT_ITEMS);
export const signOutFinalSchema = createFinalSchema(WHO_SIGN_OUT_ITEMS);

export type SignInFinalInput = z.infer<typeof signInFinalSchema>;
export type TimeOutFinalInput = z.infer<typeof timeOutFinalSchema>;
export type SignOutFinalInput = z.infer<typeof signOutFinalSchema>;

// ──────────────────────────────────────────────────────────────────────
// Helper: Get Missing Items (labels of unconfirmed required items)
// ──────────────────────────────────────────────────────────────────────

function getMissingItems(
  items: ChecklistItem[] | null | undefined,
  requiredDefs: readonly WhoChecklistItemDef[]
): string[] {
  const required = requiredDefs.filter((d) => d.required);
  if (!items || items.length === 0) {
    return required.map((d) => d.label);
  }
  const confirmedKeys = new Set(
    items.filter((i) => i.confirmed).map((i) => i.key)
  );
  return required
    .filter((d) => !confirmedKeys.has(d.key))
    .map((d) => d.label);
}

export function getMissingSignInItems(
  items: ChecklistItem[] | null | undefined
): string[] {
  return getMissingItems(items, WHO_SIGN_IN_ITEMS);
}

export function getMissingTimeOutItems(
  items: ChecklistItem[] | null | undefined
): string[] {
  return getMissingItems(items, WHO_TIME_OUT_ITEMS);
}

export function getMissingSignOutItems(
  items: ChecklistItem[] | null | undefined
): string[] {
  return getMissingItems(items, WHO_SIGN_OUT_ITEMS);
}

// ──────────────────────────────────────────────────────────────────────
// Helper: Section Completion (for dayboard / progress display)
// ──────────────────────────────────────────────────────────────────────

export interface SectionCompletionInfo {
  /** Total canonical items in this phase */
  total: number;
  /** Number of items confirmed (from saved data) */
  confirmed: number;
  /** Whether this phase has been finalized (completed_at set) */
  finalized: boolean;
}

export interface ChecklistSectionCompletion {
  signIn: SectionCompletionInfo;
  timeOut: SectionCompletionInfo;
  signOut: SectionCompletionInfo;
}

export function getChecklistSectionCompletion(
  checklist: {
    sign_in_completed_at: Date | null;
    sign_in_items: string | null;
    time_out_completed_at: Date | null;
    time_out_items: string | null;
    sign_out_completed_at: Date | null;
    sign_out_items: string | null;
  } | null
): ChecklistSectionCompletion {
  const parseAndCount = (
    raw: string | null,
    defs: readonly WhoChecklistItemDef[]
  ): { total: number; confirmed: number } => {
    const total = defs.filter((d) => d.required).length;
    if (!raw) return { total, confirmed: 0 };
    try {
      const items: ChecklistItem[] = JSON.parse(raw);
      const confirmedKeys = new Set(
        items.filter((i) => i.confirmed).map((i) => i.key)
      );
      const confirmed = defs.filter(
        (d) => d.required && confirmedKeys.has(d.key)
      ).length;
      return { total, confirmed };
    } catch {
      return { total, confirmed: 0 };
    }
  };

  if (!checklist) {
    return {
      signIn: {
        total: WHO_SIGN_IN_ITEMS.filter((d) => d.required).length,
        confirmed: 0,
        finalized: false,
      },
      timeOut: {
        total: WHO_TIME_OUT_ITEMS.filter((d) => d.required).length,
        confirmed: 0,
        finalized: false,
      },
      signOut: {
        total: WHO_SIGN_OUT_ITEMS.filter((d) => d.required).length,
        confirmed: 0,
        finalized: false,
      },
    };
  }

  return {
    signIn: {
      ...parseAndCount(checklist.sign_in_items, WHO_SIGN_IN_ITEMS),
      finalized: checklist.sign_in_completed_at !== null,
    },
    timeOut: {
      ...parseAndCount(checklist.time_out_items, WHO_TIME_OUT_ITEMS),
      finalized: checklist.time_out_completed_at !== null,
    },
    signOut: {
      ...parseAndCount(checklist.sign_out_items, WHO_SIGN_OUT_ITEMS),
      finalized: checklist.sign_out_completed_at !== null,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// Utility: Get all WHO items for a phase
// ──────────────────────────────────────────────────────────────────────

export function getWhoItemsForPhase(
  phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT'
): readonly WhoChecklistItemDef[] {
  const map = {
    SIGN_IN: WHO_SIGN_IN_ITEMS,
    TIME_OUT: WHO_TIME_OUT_ITEMS,
    SIGN_OUT: WHO_SIGN_OUT_ITEMS,
  } as const;
  return map[phase];
}

export function getFinalSchemaForPhase(
  phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT'
) {
  const map = {
    SIGN_IN: signInFinalSchema,
    TIME_OUT: timeOutFinalSchema,
    SIGN_OUT: signOutFinalSchema,
  } as const;
  return map[phase];
}

export function getMissingItemsForPhase(
  phase: 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT',
  items: ChecklistItem[] | null | undefined
): string[] {
  const map = {
    SIGN_IN: getMissingSignInItems,
    TIME_OUT: getMissingTimeOutItems,
    SIGN_OUT: getMissingSignOutItems,
  } as const;
  return map[phase](items);
}
