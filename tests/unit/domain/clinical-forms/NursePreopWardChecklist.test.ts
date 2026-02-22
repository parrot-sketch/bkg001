/**
 * Unit Tests: NursePreopWardChecklist validation
 *
 * Tests zod schemas for the pre-operative ward checklist:
 * - Draft schema (lenient: all optional)
 * - Final schema (strict: all required fields enforced)
 * - getMissingChecklistItems helper
 * - getSectionCompletion helper
 * - Vitals bounds validation (including SpO₂)
 * - skinPrep sub-schema validation
 * - Urinalysis structured union
 * - normalizeLegacyChecklistData backward-compat normalizer
 */

import { describe, it, expect } from 'vitest';
import {
    nursePreopWardChecklistDraftSchema,
    nursePreopWardChecklistFinalSchema,
    skinPrepSchema,
    urinalysisValueSchema,
    getMissingChecklistItems,
    getSectionCompletion,
    normalizeLegacyChecklistData,
    SkinPrepAgent,
    SkinPrepArea,
    UrinalysisResult,
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
        hbPcvNotes: '',
        uecs: 'Normal',
        uecsNotes: '',
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

    it('accepts preparation with skinPrep sub-object', () => {
        const data = {
            preparation: {
                bathGown: true,
                shaveSkinPrep: true,
                idBandOn: true,
                jewelryRemoved: true,
                makeupNailPolishRemoved: true,
                skinPrep: {
                    agent: SkinPrepAgent.POVIDONE_IODINE,
                    area: SkinPrepArea.ABDOMEN,
                    performerName: 'Nurse Sarah',
                },
            },
        };
        const result = nursePreopWardChecklistDraftSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('accepts vitals with spo2', () => {
        const data = {
            vitals: { bpSystolic: 120, bpDiastolic: 80, pulse: 72, respiratoryRate: 16, temperature: 36.5, weight: 65, bladderEmptied: true, spo2: 98 },
        };
        const result = nursePreopWardChecklistDraftSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('accepts urinalysis as enum value', () => {
        const data = {
            vitals: { bpSystolic: 120, bpDiastolic: 80, pulse: 72, respiratoryRate: 16, temperature: 36.5, weight: 65, bladderEmptied: true, urinalysis: UrinalysisResult.CLEAR },
        };
        const result = nursePreopWardChecklistDraftSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('accepts urinalysis as custom object', () => {
        const data = {
            vitals: { bpSystolic: 120, bpDiastolic: 80, pulse: 72, respiratoryRate: 16, temperature: 36.5, weight: 65, bladderEmptied: true, urinalysis: { custom: 'Ketones +2' } },
        };
        const result = nursePreopWardChecklistDraftSchema.safeParse(data);
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

    it('accepts finalization with spo2 in range', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitals: { ...VALID_FINAL_DATA.vitals, spo2: 98 },
        };
        expect(nursePreopWardChecklistFinalSchema.safeParse(data).success).toBe(true);
    });

    it('rejects spo2 below 50', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitals: { ...VALID_FINAL_DATA.vitals, spo2: 30 },
        };
        const result = nursePreopWardChecklistFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('rejects spo2 above 100', () => {
        const data = {
            ...VALID_FINAL_DATA,
            vitals: { ...VALID_FINAL_DATA.vitals, spo2: 101 },
        };
        const result = nursePreopWardChecklistFinalSchema.safeParse(data);
        expect(result.success).toBe(false);
    });
});

// ──────────────────────────────────────────────────────────────────────
// skinPrepSchema Tests
// ──────────────────────────────────────────────────────────────────────

describe('skinPrepSchema', () => {
    it('accepts valid agent and area', () => {
        const result = skinPrepSchema.safeParse({
            agent: SkinPrepAgent.HIBITANE_SPIRIT,
            area: SkinPrepArea.ABDOMEN,
        });
        expect(result.success).toBe(true);
    });

    it('accepts OTHER agent with agentOther populated', () => {
        const result = skinPrepSchema.safeParse({
            agent: SkinPrepAgent.OTHER,
            area: SkinPrepArea.NECK,
            agentOther: 'Chlorhexidine 2%',
        });
        expect(result.success).toBe(true);
    });

    it('rejects OTHER agent without agentOther', () => {
        const result = skinPrepSchema.safeParse({
            agent: SkinPrepAgent.OTHER,
            area: SkinPrepArea.NECK,
            agentOther: '',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some(i => i.path.includes('agentOther'))).toBe(true);
        }
    });

    it('rejects OTHER area without areaOther', () => {
        const result = skinPrepSchema.safeParse({
            agent: SkinPrepAgent.ALCOHOL,
            area: SkinPrepArea.OTHER,
            areaOther: '',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some(i => i.path.includes('areaOther'))).toBe(true);
        }
    });

    it('rejects invalid agent enum value', () => {
        const result = skinPrepSchema.safeParse({
            agent: 'BLEACH',
            area: SkinPrepArea.FACE,
        });
        expect(result.success).toBe(false);
    });

    it('rejects invalid area enum value', () => {
        const result = skinPrepSchema.safeParse({
            agent: SkinPrepAgent.ALCOHOL,
            area: 'OUTER_SPACE',
        });
        expect(result.success).toBe(false);
    });

    it('accepts optional performerName', () => {
        const result = skinPrepSchema.safeParse({
            agent: SkinPrepAgent.POVIDONE_IODINE,
            area: SkinPrepArea.BREAST,
            performerName: 'Nurse Alice',
        });
        expect(result.success).toBe(true);
    });
});

// ──────────────────────────────────────────────────────────────────────
// urinalysisValueSchema Tests
// ──────────────────────────────────────────────────────────────────────

describe('urinalysisValueSchema', () => {
    it('accepts enum value CLEAR', () => {
        expect(urinalysisValueSchema.safeParse(UrinalysisResult.CLEAR).success).toBe(true);
    });

    it('accepts all enum values', () => {
        for (const val of Object.values(UrinalysisResult)) {
            expect(urinalysisValueSchema.safeParse(val).success).toBe(true);
        }
    });

    it('accepts { custom: "Ketones +2" }', () => {
        expect(urinalysisValueSchema.safeParse({ custom: 'Ketones +2' }).success).toBe(true);
    });

    it('rejects custom with empty string', () => {
        expect(urinalysisValueSchema.safeParse({ custom: '' }).success).toBe(false);
    });

    it('rejects arbitrary unrecognized string', () => {
        expect(urinalysisValueSchema.safeParse('FOOBAR').success).toBe(false);
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
        expect(completion.documentation.complete).toBe(false);
        expect(completion.vitals.complete).toBe(false);
        expect(completion.handover.complete).toBe(false);
    });

    it('bloodResults section is complete even with empty data (all optional)', () => {
        const completion = getSectionCompletion({});
        expect(completion.bloodResults.complete).toBe(true);
    });

    it('prosthetics section is complete even with empty data (all optional)', () => {
        const completion = getSectionCompletion({});
        expect(completion.prosthetics.complete).toBe(true);
    });
});

// ──────────────────────────────────────────────────────────────────────
// normalizeLegacyChecklistData Tests
// ──────────────────────────────────────────────────────────────────────

describe('normalizeLegacyChecklistData', () => {
    it('handles empty input safely', () => {
        expect(() => normalizeLegacyChecklistData({})).not.toThrow();
        expect(() => normalizeLegacyChecklistData(null)).not.toThrow();
        expect(() => normalizeLegacyChecklistData(undefined)).not.toThrow();
    });

    it('returns empty draft for null input', () => {
        const result = normalizeLegacyChecklistData(null);
        expect(result).toEqual({});
    });

    it('maps legacy string urinalysis "clear" to CLEAR enum', () => {
        const result = normalizeLegacyChecklistData({
            vitals: { bpSystolic: 120, bpDiastolic: 80, pulse: 72, respiratoryRate: 16, temperature: 36.5, weight: 65, bladderEmptied: true, urinalysis: 'clear' },
        });
        expect((result.vitals as any).urinalysis).toBe(UrinalysisResult.CLEAR);
    });

    it('maps legacy string urinalysis "CLOUDY" to CLOUDY enum', () => {
        const result = normalizeLegacyChecklistData({
            vitals: { urinalysis: 'CLOUDY' },
        });
        expect((result.vitals as any).urinalysis).toBe(UrinalysisResult.CLOUDY);
    });

    it('maps unknown legacy string urinalysis to { custom } object', () => {
        const result = normalizeLegacyChecklistData({
            vitals: { urinalysis: 'Trace leucocytes' },
        });
        expect((result.vitals as any).urinalysis).toEqual({ custom: 'Trace leucocytes' });
    });

    it('converts empty string urinalysis to undefined', () => {
        const result = normalizeLegacyChecklistData({
            vitals: { urinalysis: '' },
        });
        expect((result.vitals as any).urinalysis).toBeUndefined();
    });

    it('preserves legacy shaveSkinPrep boolean without modification', () => {
        const result = normalizeLegacyChecklistData({
            preparation: { shaveSkinPrep: true, idBandOn: true },
        });
        expect((result.preparation as any).shaveSkinPrep).toBe(true);
    });

    it('does NOT invent skinPrep when shaveSkinPrep is true but skinPrep missing', () => {
        const result = normalizeLegacyChecklistData({
            preparation: { shaveSkinPrep: true },
        });
        expect((result.preparation as any).skinPrep).toBeUndefined();
    });

    it('passes through already-structured urinalysis enum without modification', () => {
        const result = normalizeLegacyChecklistData({
            vitals: { urinalysis: UrinalysisResult.GLUCOSE },
        });
        expect((result.vitals as any).urinalysis).toBe(UrinalysisResult.GLUCOSE);
    });

    it('passes through already-structured urinalysis { custom } without modification', () => {
        const result = normalizeLegacyChecklistData({
            vitals: { urinalysis: { custom: 'Ketones +3' } },
        });
        expect((result.vitals as any).urinalysis).toEqual({ custom: 'Ketones +3' });
    });
});
