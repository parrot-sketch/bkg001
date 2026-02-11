/**
 * Unit Tests: getMissingPlanningItems
 *
 * Tests the domain helper that determines doctor-side planning readiness.
 * This is the single source of truth for readiness gating.
 */

import { describe, it, expect } from 'vitest';
import {
    getMissingPlanningItems,
    PlanningReadinessInput,
} from '@/domain/helpers/planningReadiness';

// ─── Helper ──────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<PlanningReadinessInput> = {}): PlanningReadinessInput {
    return {
        procedurePlan: null,
        riskFactors: null,
        plannedAnesthesia: null,
        signedConsentCount: 0,
        preOpPhotoCount: 0,
        ...overrides,
    };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('getMissingPlanningItems', () => {
    it('returns all items as missing when input is empty', () => {
        const result = getMissingPlanningItems(makeInput());

        expect(result.isComplete).toBe(false);
        expect(result.missingRequired).toHaveLength(5);
        expect(result.missingRequired).toContain('Procedure Plan');
        expect(result.missingRequired).toContain('Risk Assessment');
        expect(result.missingRequired).toContain('Anesthesia Plan');
        expect(result.missingRequired).toContain('Consent Signed');
        expect(result.missingRequired).toContain('Pre-Op Photos');
        expect(result.completedCount).toBe(0);
        expect(result.totalRequired).toBe(5);
    });

    it('returns isComplete=true when all required items are present', () => {
        const result = getMissingPlanningItems(
            makeInput({
                procedurePlan: 'Rhinoplasty: Open approach with cartilage graft for tip refinement.',
                riskFactors: 'No known drug allergies. BMI 24.',
                plannedAnesthesia: 'GENERAL',
                signedConsentCount: 1,
                preOpPhotoCount: 2,
            }),
        );

        expect(result.isComplete).toBe(true);
        expect(result.missingRequired).toHaveLength(0);
        expect(result.completedCount).toBe(5);
    });

    it('requires procedure plan to have at least 10 characters of raw text', () => {
        // Too short
        const tooShort = getMissingPlanningItems(makeInput({ procedurePlan: 'short' }));
        expect(tooShort.items.find(i => i.key === 'procedure')?.done).toBe(false);

        // Exactly 10 chars
        const exact = getMissingPlanningItems(makeInput({ procedurePlan: '1234567890' }));
        expect(exact.items.find(i => i.key === 'procedure')?.done).toBe(true);
    });

    it('strips HTML tags before checking procedure plan length', () => {
        // HTML wrapping with short content
        const htmlShort = getMissingPlanningItems(makeInput({ procedurePlan: '<p>short</p>' }));
        expect(htmlShort.items.find(i => i.key === 'procedure')?.done).toBe(false);

        // HTML with enough content
        const htmlOk = getMissingPlanningItems(
            makeInput({ procedurePlan: '<p>This is a detailed procedure plan</p>' }),
        );
        expect(htmlOk.items.find(i => i.key === 'procedure')?.done).toBe(true);
    });

    it('rejects empty HTML paragraph tags (rich text editor default)', () => {
        const emptyHtml = getMissingPlanningItems(makeInput({ procedurePlan: '<p></p>' }));
        expect(emptyHtml.items.find(i => i.key === 'procedure')?.done).toBe(false);
    });

    it('requires risk factors to have at least 5 characters', () => {
        const tooShort = getMissingPlanningItems(makeInput({ riskFactors: 'ok' }));
        expect(tooShort.items.find(i => i.key === 'risk')?.done).toBe(false);

        const ok = getMissingPlanningItems(makeInput({ riskFactors: 'NKDA. ASA I.' }));
        expect(ok.items.find(i => i.key === 'risk')?.done).toBe(true);
    });

    it('requires anesthesia plan to be a non-empty string', () => {
        const empty = getMissingPlanningItems(makeInput({ plannedAnesthesia: '' }));
        expect(empty.items.find(i => i.key === 'anesthesia')?.done).toBe(false);

        const whitespace = getMissingPlanningItems(makeInput({ plannedAnesthesia: '   ' }));
        expect(whitespace.items.find(i => i.key === 'anesthesia')?.done).toBe(false);

        const ok = getMissingPlanningItems(makeInput({ plannedAnesthesia: 'GENERAL' }));
        expect(ok.items.find(i => i.key === 'anesthesia')?.done).toBe(true);
    });

    it('requires at least 1 signed consent', () => {
        const zero = getMissingPlanningItems(makeInput({ signedConsentCount: 0 }));
        expect(zero.items.find(i => i.key === 'consents')?.done).toBe(false);

        const one = getMissingPlanningItems(makeInput({ signedConsentCount: 1 }));
        expect(one.items.find(i => i.key === 'consents')?.done).toBe(true);
    });

    it('requires at least 1 pre-op photo', () => {
        const zero = getMissingPlanningItems(makeInput({ preOpPhotoCount: 0 }));
        expect(zero.items.find(i => i.key === 'photos')?.done).toBe(false);

        const one = getMissingPlanningItems(makeInput({ preOpPhotoCount: 1 }));
        expect(one.items.find(i => i.key === 'photos')?.done).toBe(true);
    });

    it('returns partial completion correctly', () => {
        const result = getMissingPlanningItems(
            makeInput({
                procedurePlan: 'Full rhinoplasty procedure plan documented here.',
                riskFactors: 'NKDA. Non-smoker.',
                plannedAnesthesia: '', // not set
                signedConsentCount: 0, // not set
                preOpPhotoCount: 1,
            }),
        );

        expect(result.isComplete).toBe(false);
        expect(result.completedCount).toBe(3); // procedure + risk + photos
        expect(result.missingRequired).toEqual(['Anesthesia Plan', 'Consent Signed']);
    });

    it('handles null/undefined values gracefully', () => {
        const result = getMissingPlanningItems({
            procedurePlan: null,
            riskFactors: undefined,
            plannedAnesthesia: null,
            signedConsentCount: 0,
            preOpPhotoCount: 0,
        });

        expect(result.isComplete).toBe(false);
        expect(result.completedCount).toBe(0);
    });

    it('returns correct items array with keys and labels', () => {
        const result = getMissingPlanningItems(makeInput());

        expect(result.items).toHaveLength(5);
        expect(result.items.map(i => i.key)).toEqual([
            'procedure',
            'risk',
            'anesthesia',
            'consents',
            'photos',
        ]);
        expect(result.items.every(i => i.required)).toBe(true);
    });
});
