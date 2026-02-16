/**
 * Unit Tests: NursePreopWardChecklist validation
 *
 * Tests zod schemas for the pre-operative ward checklist:
 * - Draft schema (lenient: all optional)
 * - Final schema (strict: all required fields enforced)
 * - getMissingChecklistItems helper
 * - getSectionCompletion helper
 * - Vitals bounds validation
 * - Time format validation
 */

import { describe, it, expect } from 'vitest';
import {
    nursePreopWardChecklistDraftSchema,
    nursePreopWardChecklistFinalSchema,
    getMissingChecklistItems,
    getSectionCompletion,
    type NursePreopWardChecklistDraft,
    type NursePreopWardChecklistData,
} from '@/domain/clinical-forms/NursePreopWardChecklist';

// ──────────────────────────────────────────────────────────────────────
// Complete valid dataset for finalization
// ──────────────────────────────────────────────────────────────────────

const VALID_FINAL_DATA: NursePreopWardChecklistData = {
    documentation: {
        documentationComplete: true,
        correctConsent: true,
    },
    bloodResults: {
        hbPcv: '12.5',
        uecs: 'Normal',
        xMatchUnitsAvailable: 2,
        otherLabResults: '',
    },
    medications: {
        preMedGiven: true,
        preMedDetails: 'Midazolam 2mg',
        preMedTimeGiven: '08:30',
        periOpMedsGiven: false,
        periOpMedsDetails: '',
        regularMedsGiven: false,
        regularMedsDetails: '',
        regularMedsTimeGiven: '',
    },
    allergiesNpo: {
        allergiesDocumented: true,
        allergiesDetails: 'Penicillin',
        npoStatus: true,
        npoFastedFromTime: '00:00',
    },
    preparation: {
        bathGown: true,
        shaveSkinPrep: false,
        idBandOn: true,
        correctPositioning: false,
        jewelryRemoved: true,
        makeupNailPolishRemoved: true,
    },
    prosthetics: {
        contactLensRemoved: false,
        denturesRemoved: false,
        hearingAidRemoved: false,
        crownsBridgeworkNoted: false,
        prostheticNotes: '',
    },
    vitals: {
        bpSystolic: 120,
        bpDiastolic: 80,
        pulse: 72,
        respiratoryRate: 16,
        temperature: 36.5,
        cvp: '',
        bladderEmptied: true,
        height: 170,
        weight: 65,
        urinalysis: 'Clear',
        xRaysScansPresent: true,
        otherFormsRequired: '',
    },
    handover: {
        preparedByName: 'Nurse Jane',
        timeArrivedInTheatre: '09:00',
        receivedByName: 'Tech Mike',
        handedOverByName: 'Nurse Jane',
    },
};

// ──────────────────────────────────────────────────────────────────────
// Draft Schema Tests
// ──────────────────────────────────────────────────────────────────────

describe('nursePreopWardChecklistDraftSchema', () => {
    it('accepts empty data', () => {
        const result = nursePreopWardChecklistDraftSchema.safeParse({});
        expect(result.success).toBe(true);
    });

    it('accepts partial data', () => {
        const partial = {
            documentation: { documentationComplete: true },
            vitals: { bpSystolic: 120 },
        };
        const result = nursePreopWardChecklistDraftSchema.safeParse(partial);
        expect(result.success).toBe(true);
    });

    it('accepts complete valid data', () => {
        const result = nursePreopWardChecklistDraftSchema.safeParse(VALID_FINAL_DATA);
        expect(result.success).toBe(true);
    });
});

// ──────────────────────────────────────────────────────────────────────
// Final Schema Tests
// ──────────────────────────────────────────────────────────────────────

describe('nursePreopWardChecklistFinalSchema', () => {
    it('accepts complete valid data', () => {
        const result = nursePreopWardChecklistFinalSchema.safeParse(VALID_FINAL_DATA);
        expect(result.success).toBe(true);
    });

    it('rejects empty data', () => {
        const result = nursePreopWardChecklistFinalSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it('rejects when documentation section is missing', () => {
        const { documentation, ...rest } = VALID_FINAL_DATA;
        const result = nursePreopWardChecklistFinalSchema.safeParse(rest);
        expect(result.success).toBe(false);
    });

    it('rejects when vitals BP is out of range', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitals: { ...VALID_FINAL_DATA.vitals, bpSystolic: 10 },
        };
        const result = nursePreopWardChecklistFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some(i => i.path.includes('bpSystolic'))).toBe(true);
        }
    });

    it('rejects when BP systolic exceeds 260', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitals: { ...VALID_FINAL_DATA.vitals, bpSystolic: 300 },
        };
        const result = nursePreopWardChecklistFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects when pulse is out of bounds (< 30)', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitals: { ...VALID_FINAL_DATA.vitals, pulse: 5 },
        };
        const result = nursePreopWardChecklistFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects when temperature is out of range', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitals: { ...VALID_FINAL_DATA.vitals, temperature: 50 },
        };
        const result = nursePreopWardChecklistFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects when weight is too low', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitals: { ...VALID_FINAL_DATA.vitals, weight: 0.5 },
        };
        const result = nursePreopWardChecklistFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects when handover preparedByName is too short', () => {
        const data = {
            ...VALID_FINAL_DATA,
            handover: { ...VALID_FINAL_DATA.handover, preparedByName: 'A' },
        };
        const result = nursePreopWardChecklistFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects invalid time format', () => {
        const data = {
            ...VALID_FINAL_DATA,
            medications: { ...VALID_FINAL_DATA.medications, preMedTimeGiven: '25:99' },
        };
        const result = nursePreopWardChecklistFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('accepts valid edge-case time "23:59"', () => {
        const data = {
            ...VALID_FINAL_DATA,
            medications: { ...VALID_FINAL_DATA.medications, preMedTimeGiven: '23:59' },
        };
        const result = nursePreopWardChecklistFinalSchema.safeParse(data);
        expect(result.success).toBe(true);
    });
});

// ──────────────────────────────────────────────────────────────────────
// getMissingChecklistItems Tests
// ──────────────────────────────────────────────────────────────────────

describe('getMissingChecklistItems', () => {
    it('returns empty array for complete data', () => {
        const missing = getMissingChecklistItems(VALID_FINAL_DATA);
        expect(missing).toEqual([]);
    });

    it('returns missing items for empty data', () => {
        const missing = getMissingChecklistItems({});
        expect(missing.length).toBeGreaterThan(0);
    });

    it('reports specific missing field paths', () => {
        const partial: NursePreopWardChecklistDraft = {
            ...VALID_FINAL_DATA,
            vitals: { ...VALID_FINAL_DATA.vitals, bpSystolic: undefined as any },
        };
        const missing = getMissingChecklistItems(partial);
        expect(missing.some(m => m.includes('bpSystolic'))).toBe(true);
    });
});

// ──────────────────────────────────────────────────────────────────────
// getSectionCompletion Tests
// ──────────────────────────────────────────────────────────────────────

describe('getSectionCompletion', () => {
    it('returns all complete for valid data', () => {
        const completion = getSectionCompletion(VALID_FINAL_DATA);
        for (const [key, value] of Object.entries(completion)) {
            expect(value.complete, `Section ${key} should be complete`).toBe(true);
            expect(value.errors).toEqual([]);
        }
    });

    it('returns incomplete sections for empty data', () => {
        const completion = getSectionCompletion({});
        // At minimum, documentation, medications, allergiesNpo, preparation, vitals, handover should be incomplete
        expect(completion.documentation.complete).toBe(false);
        expect(completion.vitals.complete).toBe(false);
        expect(completion.handover.complete).toBe(false);
    });

    it('bloodResults section is complete even with empty data (all optional)', () => {
        const completion = getSectionCompletion({});
        // bloodResults has no required fields, so empty defaults should pass
        expect(completion.bloodResults.complete).toBe(true);
    });

    it('prosthetics section is complete even with empty data (all optional)', () => {
        const completion = getSectionCompletion({});
        expect(completion.prosthetics.complete).toBe(true);
    });
});
