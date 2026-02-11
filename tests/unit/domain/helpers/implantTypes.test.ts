/**
 * Unit Tests: Implant Types helpers
 *
 * Tests parseImplantData and serializeImplantData for structured
 * implant/device tracking in surgical plans.
 */

import { describe, it, expect } from 'vitest';
import {
    parseImplantData,
    serializeImplantData,
    ImplantData,
} from '@/domain/helpers/implantTypes';

describe('parseImplantData', () => {
    it('returns empty data for null/undefined/empty input', () => {
        expect(parseImplantData(null)).toEqual({ items: [], freeTextNotes: '' });
        expect(parseImplantData(undefined)).toEqual({ items: [], freeTextNotes: '' });
        expect(parseImplantData('')).toEqual({ items: [], freeTextNotes: '' });
        expect(parseImplantData('  ')).toEqual({ items: [], freeTextNotes: '' });
    });

    it('parses structured JSON format correctly', () => {
        const json = JSON.stringify({
            items: [
                { id: '1', name: 'Implant A', manufacturer: 'Co A', lotNumber: 'L1' },
            ],
            freeTextNotes: 'some notes',
        });

        const result = parseImplantData(json);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].name).toBe('Implant A');
        expect(result.freeTextNotes).toBe('some notes');
    });

    it('handles bare array format (fallback)', () => {
        const json = JSON.stringify([
            { id: '1', name: 'Implant B', manufacturer: 'Co B', lotNumber: 'L2' },
        ]);

        const result = parseImplantData(json);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].name).toBe('Implant B');
    });

    it('treats non-JSON strings as legacy free-text', () => {
        const legacy = 'Mentor 350cc Moderate Plus, LOT-12345';
        const result = parseImplantData(legacy);

        expect(result.items).toHaveLength(0);
        expect(result.freeTextNotes).toBe(legacy);
    });

    it('treats invalid JSON as legacy free-text', () => {
        const broken = '{ invalid json }}}';
        const result = parseImplantData(broken);

        expect(result.items).toHaveLength(0);
        expect(result.freeTextNotes).toBe(broken);
    });
});

describe('serializeImplantData', () => {
    it('serializes structured data to JSON string', () => {
        const data: ImplantData = {
            items: [
                {
                    id: 'abc',
                    name: 'Test Device',
                    manufacturer: 'TestCo',
                    lotNumber: 'LOT-001',
                    serialNumber: 'SER-001',
                    expiryDate: '2027-01-01',
                    size: '350cc',
                    notes: 'test',
                },
            ],
            freeTextNotes: 'legacy',
        };

        const serialized = serializeImplantData(data);
        const parsed = JSON.parse(serialized);

        expect(parsed.items).toHaveLength(1);
        expect(parsed.items[0].name).toBe('Test Device');
        expect(parsed.items[0].lotNumber).toBe('LOT-001');
        expect(parsed.freeTextNotes).toBe('legacy');
    });

    it('round-trips correctly', () => {
        const original: ImplantData = {
            items: [
                { id: '1', name: 'A', manufacturer: 'B', lotNumber: 'C' },
                { id: '2', name: 'D', manufacturer: 'E', lotNumber: 'F', size: 'XL' },
            ],
        };

        const roundTripped = parseImplantData(serializeImplantData(original));
        expect(roundTripped.items).toHaveLength(2);
        expect(roundTripped.items[0].name).toBe('A');
        expect(roundTripped.items[1].size).toBe('XL');
    });
});
