/**
 * Unit Tests: ReadinessValidationError
 *
 * Tests the structured error thrown by SurgicalCaseService when
 * mark-ready validation fails.
 */

import { describe, it, expect } from 'vitest';
import { ReadinessValidationError } from '@/application/services/SurgicalCaseService';

describe('ReadinessValidationError', () => {
    it('extends Error with correct name', () => {
        const err = new ReadinessValidationError(
            'Cannot mark as ready',
            [],
            0,
            5,
        );
        expect(err).toBeInstanceOf(Error);
        expect(err.name).toBe('ReadinessValidationError');
        expect(err.message).toBe('Cannot mark as ready');
    });

    it('carries structured missingItems data', () => {
        const items = [
            { key: 'procedure', label: 'Procedure Plan', required: true, done: true },
            { key: 'risk', label: 'Risk Assessment', required: true, done: false },
            { key: 'anesthesia', label: 'Anesthesia Plan', required: true, done: true },
            { key: 'consents', label: 'Consent Signed', required: true, done: false },
            { key: 'photos', label: 'Pre-Op Photos', required: true, done: true },
            { key: 'nurse_checklist', label: 'Nurse Pre-Op Checklist', required: true, done: false },
        ];

        const err = new ReadinessValidationError(
            'Cannot mark as ready:\n• Risk Assessment\n• Consent Signed\n• Nurse Pre-Op Checklist',
            items,
            3,
            6,
        );

        expect(err.missingItems).toHaveLength(6);
        expect(err.completedCount).toBe(3);
        expect(err.totalRequired).toBe(6);

        // Check missing items
        const missing = err.missingItems.filter(i => !i.done);
        expect(missing).toHaveLength(3);
        expect(missing.map(i => i.label)).toEqual([
            'Risk Assessment',
            'Consent Signed',
            'Nurse Pre-Op Checklist',
        ]);
    });

    it('works with empty items (edge case)', () => {
        const err = new ReadinessValidationError('All good', [], 0, 0);
        expect(err.missingItems).toEqual([]);
        expect(err.completedCount).toBe(0);
        expect(err.totalRequired).toBe(0);
    });
});
