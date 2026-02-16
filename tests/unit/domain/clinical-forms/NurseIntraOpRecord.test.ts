/**
 * Unit Tests: NurseIntraOpRecord validation
 *
 * Tests zod schemas for the intra-operative nurse record:
 * - Draft schema (lenient: all optional)
 * - Final schema (strict: all required fields enforced)
 * - Count discrepancy refinement (notes required when discrepancy=true)
 * - getMissingIntraOpItems helper
 * - getIntraOpSectionCompletion helper
 * - getRecoveryGateItems helper (RECOVERY transition safety gate)
 * - Wound class enum validation
 * - Time format validation
 */

import { describe, it, expect } from 'vitest';
import {
    nurseIntraOpRecordDraftSchema,
    nurseIntraOpRecordFinalSchema,
    getMissingIntraOpItems,
    getIntraOpSectionCompletion,
    getRecoveryGateItems,
    theatreSetupSchema,
    countsSchemaFinal,
    signOutSchema,
    type NurseIntraOpRecordData,
    type NurseIntraOpRecordDraft,
} from '@/domain/clinical-forms/NurseIntraOpRecord';

// ──────────────────────────────────────────────────────────────────────
// Complete valid dataset for finalization
// ──────────────────────────────────────────────────────────────────────

const VALID_FINAL_DATA: NurseIntraOpRecordData = {
    theatreSetup: {
        positioning: 'Supine',
        skinPrepAgent: 'Betadine',
        drapeType: 'Standard sterile',
        tourniquetUsed: false,
        tourniquetPressure: undefined,
        tourniquetTimeOn: '',
        tourniquetTimeOff: '',
        cauteryUsed: true,
        cauterySettingsCut: '30W',
        cauterySettingsCoag: '25W',
        drainsUsed: false,
        drainType: '',
        drainLocation: '',
        irrigationType: 'Normal saline',
        irrigationVolumeMl: 500,
        woundClass: 'CLEAN',
    },
    counts: {
        initialCountsCompleted: true,
        initialCountsRecordedBy: 'Nurse Sarah',
        initialCountsTime: '10:00',
        swabsInitial: 10,
        sharpsInitial: 5,
        instrumentsInitial: 20,
        finalCountsCompleted: true,
        finalCountsRecordedBy: 'Nurse Sarah',
        finalCountsTime: '12:30',
        swabsFinal: 10,
        sharpsFinal: 5,
        instrumentsFinal: 20,
        countDiscrepancy: false,
        discrepancyNotes: '',
    },
    specimens: {
        specimens: [
            {
                specimenType: 'Tissue biopsy',
                site: 'Left breast',
                destinationLab: 'Pathology',
                timeSent: '11:45',
                notes: '',
            },
        ],
    },
    implantsUsed: {
        implantsConfirmed: true,
        items: [
            {
                name: 'Silicone implant',
                manufacturer: 'Allergan',
                lotNumber: 'LOT-2025-001',
                serialNumber: 'SER-4567',
                expiryDate: '2028-06-15',
                used: true,
                notes: '',
            },
        ],
    },
    signOut: {
        signOutCompleted: true,
        signOutTime: '13:00',
        signOutNurseName: 'Nurse Sarah',
        postopInstructionsConfirmed: true,
        specimensLabeledConfirmed: true,
        additionalNotes: '',
    },
};

// ──────────────────────────────────────────────────────────────────────
// Draft Schema Tests
// ──────────────────────────────────────────────────────────────────────

describe('nurseIntraOpRecordDraftSchema', () => {
    it('accepts empty data', () => {
        const result = nurseIntraOpRecordDraftSchema.safeParse({});
        expect(result.success).toBe(true);
    });

    it('accepts partial data', () => {
        const partial = {
            theatreSetup: { positioning: 'Supine' },
            counts: { initialCountsCompleted: true },
        };
        const result = nurseIntraOpRecordDraftSchema.safeParse(partial);
        expect(result.success).toBe(true);
    });

    it('accepts complete valid data', () => {
        const result = nurseIntraOpRecordDraftSchema.safeParse(VALID_FINAL_DATA);
        expect(result.success).toBe(true);
    });

    it('accepts empty sections', () => {
        const data = {
            theatreSetup: {},
            counts: {},
            specimens: {},
            implantsUsed: {},
            signOut: {},
        };
        const result = nurseIntraOpRecordDraftSchema.safeParse(data);
        expect(result.success).toBe(true);
    });
});

// ──────────────────────────────────────────────────────────────────────
// Final Schema Tests
// ──────────────────────────────────────────────────────────────────────

describe('nurseIntraOpRecordFinalSchema', () => {
    it('accepts complete valid data', () => {
        const result = nurseIntraOpRecordFinalSchema.safeParse(VALID_FINAL_DATA);
        expect(result.success).toBe(true);
    });

    it('rejects empty data', () => {
        const result = nurseIntraOpRecordFinalSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it('rejects when theatreSetup section is missing', () => {
        const { theatreSetup, ...rest } = VALID_FINAL_DATA;
        const result = nurseIntraOpRecordFinalSchema.safeParse(rest);
        expect(result.success).toBe(false);
    });

    it('rejects when counts section is missing', () => {
        const { counts, ...rest } = VALID_FINAL_DATA;
        const result = nurseIntraOpRecordFinalSchema.safeParse(rest);
        expect(result.success).toBe(false);
    });

    it('rejects when signOut section is missing', () => {
        const { signOut, ...rest } = VALID_FINAL_DATA;
        const result = nurseIntraOpRecordFinalSchema.safeParse(rest);
        expect(result.success).toBe(false);
    });
});

// ──────────────────────────────────────────────────────────────────────
// Theatre Setup Schema Tests
// ──────────────────────────────────────────────────────────────────────

describe('theatreSetupSchema', () => {
    it('rejects invalid wound class', () => {
        const data = { ...VALID_FINAL_DATA.theatreSetup, woundClass: 'INVALID' };
        const result = theatreSetupSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('accepts all valid wound classes', () => {
        for (const wc of ['CLEAN', 'CLEAN_CONTAMINATED', 'CONTAMINATED', 'DIRTY_INFECTED']) {
            const data = { ...VALID_FINAL_DATA.theatreSetup, woundClass: wc };
            const result = theatreSetupSchema.safeParse(data);
            expect(result.success, `Wound class ${wc} should be valid`).toBe(true);
        }
    });

    it('rejects positioning shorter than 2 chars', () => {
        const data = { ...VALID_FINAL_DATA.theatreSetup, positioning: 'X' };
        const result = theatreSetupSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('accepts tourniquet pressure in valid range', () => {
        const data = { ...VALID_FINAL_DATA.theatreSetup, tourniquetUsed: true, tourniquetPressure: 250 };
        const result = theatreSetupSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('rejects tourniquet pressure above 500', () => {
        const data = { ...VALID_FINAL_DATA.theatreSetup, tourniquetUsed: true, tourniquetPressure: 600 };
        const result = theatreSetupSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});

// ──────────────────────────────────────────────────────────────────────
// Counts Schema Tests (Critical Safety)
// ──────────────────────────────────────────────────────────────────────

describe('countsSchemaFinal', () => {
    it('accepts valid counts without discrepancy', () => {
        const result = countsSchemaFinal.safeParse(VALID_FINAL_DATA.counts);
        expect(result.success).toBe(true);
    });

    it('accepts counts with discrepancy when notes provided', () => {
        const data = {
            ...VALID_FINAL_DATA.counts,
            countDiscrepancy: true,
            discrepancyNotes: 'One swab missing — found in drape fold, count reconciled.',
        };
        const result = countsSchemaFinal.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('rejects discrepancy=true with empty notes', () => {
        const data = {
            ...VALID_FINAL_DATA.counts,
            countDiscrepancy: true,
            discrepancyNotes: '',
        };
        const result = countsSchemaFinal.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some(i => i.path.includes('discrepancyNotes'))).toBe(true);
        }
    });

    it('rejects discrepancy=true with short notes (< 5 chars)', () => {
        const data = {
            ...VALID_FINAL_DATA.counts,
            countDiscrepancy: true,
            discrepancyNotes: 'abc',
        };
        const result = countsSchemaFinal.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects when initialCountsRecordedBy is too short', () => {
        const data = { ...VALID_FINAL_DATA.counts, initialCountsRecordedBy: 'A' };
        const result = countsSchemaFinal.safeParse(data);
        expect(result.success).toBe(false);
    });
});

// ──────────────────────────────────────────────────────────────────────
// Sign-Out Schema Tests
// ──────────────────────────────────────────────────────────────────────

describe('signOutSchema', () => {
    it('accepts valid sign-out data', () => {
        const result = signOutSchema.safeParse(VALID_FINAL_DATA.signOut);
        expect(result.success).toBe(true);
    });

    it('rejects when signOutNurseName is too short', () => {
        const data = { ...VALID_FINAL_DATA.signOut, signOutNurseName: 'X' };
        const result = signOutSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects invalid time format', () => {
        const data = { ...VALID_FINAL_DATA.signOut, signOutTime: '25:99' };
        const result = signOutSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('accepts valid edge-case time "23:59"', () => {
        const data = { ...VALID_FINAL_DATA.signOut, signOutTime: '23:59' };
        const result = signOutSchema.safeParse(data);
        expect(result.success).toBe(true);
    });
});

// ──────────────────────────────────────────────────────────────────────
// getMissingIntraOpItems Tests
// ──────────────────────────────────────────────────────────────────────

describe('getMissingIntraOpItems', () => {
    it('returns empty array for complete data', () => {
        const missing = getMissingIntraOpItems(VALID_FINAL_DATA);
        expect(missing).toEqual([]);
    });

    it('returns missing items for empty data', () => {
        const missing = getMissingIntraOpItems({});
        expect(missing.length).toBeGreaterThan(0);
    });

    it('reports missing theatre setup fields', () => {
        const data: NurseIntraOpRecordDraft = {
            ...VALID_FINAL_DATA,
            theatreSetup: { positioning: undefined as any },
        };
        const missing = getMissingIntraOpItems(data);
        expect(missing.some(m => m.includes('theatreSetup'))).toBe(true);
    });

    it('reports missing counts fields', () => {
        const data: NurseIntraOpRecordDraft = {
            ...VALID_FINAL_DATA,
            counts: {},
        };
        const missing = getMissingIntraOpItems(data);
        expect(missing.some(m => m.includes('counts'))).toBe(true);
    });
});

// ──────────────────────────────────────────────────────────────────────
// getIntraOpSectionCompletion Tests
// ──────────────────────────────────────────────────────────────────────

describe('getIntraOpSectionCompletion', () => {
    it('returns all complete for valid data', () => {
        const completion = getIntraOpSectionCompletion(VALID_FINAL_DATA);
        for (const [key, value] of Object.entries(completion)) {
            expect(value.complete, `Section ${key} should be complete`).toBe(true);
            expect(value.errors).toEqual([]);
        }
    });

    it('returns incomplete sections for empty data', () => {
        const completion = getIntraOpSectionCompletion({});
        expect(completion.theatreSetup.complete).toBe(false);
        expect(completion.counts.complete).toBe(false);
        expect(completion.signOut.complete).toBe(false);
    });

    it('specimens section is complete with empty array', () => {
        const data = {
            ...VALID_FINAL_DATA,
            specimens: { specimens: [] },
        };
        const completion = getIntraOpSectionCompletion(data);
        expect(completion.specimens.complete).toBe(true);
    });
});

// ──────────────────────────────────────────────────────────────────────
// getRecoveryGateItems Tests (RECOVERY transition safety gate)
// ──────────────────────────────────────────────────────────────────────

describe('getRecoveryGateItems', () => {
    it('returns empty array when all safety items present', () => {
        const missing = getRecoveryGateItems(VALID_FINAL_DATA);
        expect(missing).toEqual([]);
    });

    it('detects missing final counts', () => {
        const data = {
            ...VALID_FINAL_DATA,
            counts: { ...VALID_FINAL_DATA.counts, finalCountsCompleted: false },
        };
        const missing = getRecoveryGateItems(data);
        expect(missing).toContain('Final counts not completed');
    });

    it('detects count discrepancy blocks RECOVERY', () => {
        const data = {
            ...VALID_FINAL_DATA,
            counts: { ...VALID_FINAL_DATA.counts, countDiscrepancy: true },
        };
        const missing = getRecoveryGateItems(data);
        expect(missing.some(m => m.toLowerCase().includes('discrepancy'))).toBe(true);
    });

    it('detects missing sign-out', () => {
        const data = {
            ...VALID_FINAL_DATA,
            signOut: { ...VALID_FINAL_DATA.signOut, signOutCompleted: false },
        };
        const missing = getRecoveryGateItems(data);
        expect(missing).toContain('Nurse sign-out not completed');
    });

    it('detects missing post-op instructions confirmation', () => {
        const data = {
            ...VALID_FINAL_DATA,
            signOut: { ...VALID_FINAL_DATA.signOut, postopInstructionsConfirmed: false },
        };
        const missing = getRecoveryGateItems(data);
        expect(missing).toContain('Post-op instructions not confirmed');
    });

    it('detects missing specimens labeled confirmation', () => {
        const data = {
            ...VALID_FINAL_DATA,
            signOut: { ...VALID_FINAL_DATA.signOut, specimensLabeledConfirmed: false },
        };
        const missing = getRecoveryGateItems(data);
        expect(missing).toContain('Specimens labeled confirmation missing');
    });

    it('returns multiple missing items for empty data', () => {
        const missing = getRecoveryGateItems({});
        expect(missing.length).toBeGreaterThanOrEqual(3);
    });

    it('reports all issues when everything is missing', () => {
        const data = {
            counts: { finalCountsCompleted: false, countDiscrepancy: true },
            signOut: { signOutCompleted: false, postopInstructionsConfirmed: false, specimensLabeledConfirmed: false },
        };
        const missing = getRecoveryGateItems(data);
        expect(missing.length).toBe(5);
    });
});
