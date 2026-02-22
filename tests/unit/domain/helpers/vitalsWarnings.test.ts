/**
 * Unit Tests: vitalsWarnings helper
 *
 * Tests the getVitalsWarnings() function for correct advisory threshold
 * detection across all vital signs.
 */

import { describe, it, expect } from 'vitest';
import { getVitalsWarnings, getVitalsWarningMap } from '@/domain/helpers/vitalsWarnings';

describe('getVitalsWarnings', () => {
    it('returns empty array for all normal vitals', () => {
        const warnings = getVitalsWarnings({
            bpSystolic: 120,
            bpDiastolic: 80,
            pulse: 72,
            respiratoryRate: 16,
            temperature: 36.5,
            spo2: 98,
        });
        expect(warnings).toHaveLength(0);
    });

    it('returns empty array for undefined vitals', () => {
        expect(getVitalsWarnings({})).toHaveLength(0);
    });

    // ── SpO₂ ─────────────────────────────────────────────────────────

    it('warns when spo2 < 95 (warning severity)', () => {
        const warnings = getVitalsWarnings({ spo2: 93 });
        expect(warnings.some(w => w.field === 'spo2' && w.severity === 'warning')).toBe(true);
    });

    it('flags critical when spo2 < 90', () => {
        const warnings = getVitalsWarnings({ spo2: 85 });
        const w = warnings.find(w => w.field === 'spo2');
        expect(w?.severity).toBe('critical');
    });

    it('no warning when spo2 = 95 (boundary)', () => {
        const warnings = getVitalsWarnings({ spo2: 95 });
        expect(warnings.some(w => w.field === 'spo2')).toBe(false);
    });

    it('no warning when spo2 = 100', () => {
        expect(getVitalsWarnings({ spo2: 100 })).toHaveLength(0);
    });

    // ── Pulse ─────────────────────────────────────────────────────────

    it('warns when pulse > 100 (tachycardia)', () => {
        const warnings = getVitalsWarnings({ pulse: 110 });
        expect(warnings.some(w => w.field === 'pulse' && w.severity === 'warning')).toBe(true);
    });

    it('flags critical when pulse >= 130', () => {
        const warnings = getVitalsWarnings({ pulse: 145 });
        const w = warnings.find(w => w.field === 'pulse');
        expect(w?.severity).toBe('critical');
    });

    it('warns when pulse < 50 (bradycardia)', () => {
        const warnings = getVitalsWarnings({ pulse: 45 });
        expect(warnings.some(w => w.field === 'pulse')).toBe(true);
    });

    it('no warning for normal pulse 72', () => {
        expect(getVitalsWarnings({ pulse: 72 })).toHaveLength(0);
    });

    // ── Temperature ───────────────────────────────────────────────────

    it('warns when temperature > 37.5 (low-grade fever)', () => {
        const warnings = getVitalsWarnings({ temperature: 37.8 });
        expect(warnings.some(w => w.field === 'temperature' && w.severity === 'warning')).toBe(true);
    });

    it('flags critical when temperature >= 38.5 (high fever)', () => {
        const warnings = getVitalsWarnings({ temperature: 39.1 });
        const w = warnings.find(w => w.field === 'temperature');
        expect(w?.severity).toBe('critical');
    });

    it('warns when temperature < 36.0 (hypothermic)', () => {
        const warnings = getVitalsWarnings({ temperature: 35.5 });
        expect(warnings.some(w => w.field === 'temperature')).toBe(true);
    });

    it('no warning for normal temperature 36.5', () => {
        expect(getVitalsWarnings({ temperature: 36.5 })).toHaveLength(0);
    });

    // ── BP ──────────────────────────────────────────────────────────

    it('warns when bpSystolic >= 140', () => {
        const warnings = getVitalsWarnings({ bpSystolic: 145 });
        expect(warnings.some(w => w.field === 'bpSystolic' && w.severity === 'warning')).toBe(true);
    });

    it('flags critical when bpSystolic >= 180', () => {
        const warnings = getVitalsWarnings({ bpSystolic: 185 });
        const w = warnings.find(w => w.field === 'bpSystolic');
        expect(w?.severity).toBe('critical');
    });

    it('warns when bpSystolic < 90 (low)', () => {
        const warnings = getVitalsWarnings({ bpSystolic: 85 });
        expect(warnings.some(w => w.field === 'bpSystolic' && w.severity === 'critical')).toBe(true);
    });

    it('returns multiple warnings for multiple abnormal vitals', () => {
        const warnings = getVitalsWarnings({ pulse: 130, spo2: 88, temperature: 39.5 });
        expect(warnings.length).toBeGreaterThanOrEqual(3);
    });
});

describe('getVitalsWarningMap', () => {
    it('returns a Map with warning field as key', () => {
        const map = getVitalsWarningMap({ spo2: 88 });
        expect(map.has('spo2')).toBe(true);
        expect(map.get('spo2')?.severity).toBe('critical');
    });

    it('returns empty Map for normal vitals', () => {
        const map = getVitalsWarningMap({ bpSystolic: 120, pulse: 72, spo2: 98 });
        expect(map.size).toBe(0);
    });
});
