/**
 * Unit Tests: SKU Prefix Configuration
 *
 * Tests the centralized SKU prefix config and helper functions.
 * Covers:
 * - Each category has a prefix mapping
 * - getSkuPrefix() returns correct prefix for each category
 * - getSkuPrefix() throws descriptive error for unmapped category
 * - getAllSkuPrefixes() returns all mappings
 * - hasSkuPrefix() correctly identifies mapped categories
 * - TypeScript exhaustiveness enforcement via Record type
 */

import { describe, it, expect } from 'vitest';
import {
  CATEGORY_SKU_PREFIXES,
  getSkuPrefix,
  getAllSkuPrefixes,
  hasSkuPrefix,
} from '@/lib/inventory/sku-prefixes';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

describe('SKU Prefix Configuration', () => {
  describe('CATEGORY_SKU_PREFIXES mapping', () => {
    it('should define 9 category prefixes', () => {
      expect(Object.keys(CATEGORY_SKU_PREFIXES).length).toBe(9);
    });

    it('should map IMPLANT to IMP', () => {
      expect(CATEGORY_SKU_PREFIXES[InventoryCategory.IMPLANT]).toBe('IMP');
    });

    it('should map SUTURE to SUT', () => {
      expect(CATEGORY_SKU_PREFIXES[InventoryCategory.SUTURE]).toBe('SUT');
    });

    it('should map ANESTHETIC to ANS', () => {
      expect(CATEGORY_SKU_PREFIXES[InventoryCategory.ANESTHETIC]).toBe('ANS');
    });

    it('should map MEDICATION to MED', () => {
      expect(CATEGORY_SKU_PREFIXES[InventoryCategory.MEDICATION]).toBe('MED');
    });

    it('should map DISPOSABLE to DSP', () => {
      expect(CATEGORY_SKU_PREFIXES[InventoryCategory.DISPOSABLE]).toBe('DSP');
    });

    it('should map INSTRUMENT to INS', () => {
      expect(CATEGORY_SKU_PREFIXES[InventoryCategory.INSTRUMENT]).toBe('INS');
    });

    it('should map DRESSING to DRS', () => {
      expect(CATEGORY_SKU_PREFIXES[InventoryCategory.DRESSING]).toBe('DRS');
    });

    it('should map SPECIMEN_CONTAINER to SPC', () => {
      expect(CATEGORY_SKU_PREFIXES[InventoryCategory.SPECIMEN_CONTAINER]).toBe('SPC');
    });

    it('should map OTHER to OTH', () => {
      expect(CATEGORY_SKU_PREFIXES[InventoryCategory.OTHER]).toBe('OTH');
    });

    it('should have all prefixes be non-empty strings', () => {
      Object.values(CATEGORY_SKU_PREFIXES).forEach((prefix) => {
        expect(typeof prefix).toBe('string');
        expect(prefix.length).toBeGreaterThan(0);
      });
    });

    it('should have all prefixes be exactly 3 characters', () => {
      Object.entries(CATEGORY_SKU_PREFIXES).forEach(([category, prefix]) => {
        expect(prefix.length).toBe(3, `${category} prefix "${prefix}" should be 3 chars`);
      });
    });

    it('should have all prefixes be uppercase', () => {
      Object.entries(CATEGORY_SKU_PREFIXES).forEach(([category, prefix]) => {
        expect(prefix).toBe(prefix.toUpperCase(), `${category} prefix "${prefix}" should be uppercase`);
      });
    });

    it('should have all prefixes be unique', () => {
      const prefixes = Object.values(CATEGORY_SKU_PREFIXES);
      const uniquePrefixes = new Set(prefixes);
      expect(uniquePrefixes.size).toBe(prefixes.length);
    });
  });

  describe('getSkuPrefix()', () => {
    it('should return IMP for IMPLANT category', () => {
      expect(getSkuPrefix(InventoryCategory.IMPLANT)).toBe('IMP');
    });

    it('should return SUT for SUTURE category', () => {
      expect(getSkuPrefix(InventoryCategory.SUTURE)).toBe('SUT');
    });

    it('should return ANS for ANESTHETIC category', () => {
      expect(getSkuPrefix(InventoryCategory.ANESTHETIC)).toBe('ANS');
    });

    it('should return MED for MEDICATION category', () => {
      expect(getSkuPrefix(InventoryCategory.MEDICATION)).toBe('MED');
    });

    it('should return DSP for DISPOSABLE category', () => {
      expect(getSkuPrefix(InventoryCategory.DISPOSABLE)).toBe('DSP');
    });

    it('should return INS for INSTRUMENT category', () => {
      expect(getSkuPrefix(InventoryCategory.INSTRUMENT)).toBe('INS');
    });

    it('should return DRS for DRESSING category', () => {
      expect(getSkuPrefix(InventoryCategory.DRESSING)).toBe('DRS');
    });

    it('should return SPC for SPECIMEN_CONTAINER category', () => {
      expect(getSkuPrefix(InventoryCategory.SPECIMEN_CONTAINER)).toBe('SPC');
    });

    it('should return OTH for OTHER category', () => {
      expect(getSkuPrefix(InventoryCategory.OTHER)).toBe('OTH');
    });

    it('should throw error with descriptive message if prefix not configured', () => {
      // This test validates that unmapped categories would error if they existed
      // TypeScript's exhaustiveness checking prevents actual unmapped categories,
      // but we document the expected error behavior
      const invalidCategory = 'INVALID' as unknown as InventoryCategory;
      expect(() => getSkuPrefix(invalidCategory)).toThrow();
    });

    it('should throw error mentioning the unconfigured category', () => {
      const invalidCategory = 'UNMAPPED' as unknown as InventoryCategory;
      expect(() => getSkuPrefix(invalidCategory)).toThrow(/UNMAPPED/);
    });

    it('should throw error with guidance on how to fix', () => {
      const invalidCategory = 'MISSING' as unknown as InventoryCategory;
      expect(() => getSkuPrefix(invalidCategory)).toThrow(/lib\/inventory\/sku-prefixes\.ts/);
    });
  });

  describe('getAllSkuPrefixes()', () => {
    it('should return array of 9 tuples', () => {
      const prefixes = getAllSkuPrefixes();
      expect(prefixes.length).toBe(9);
      expect(Array.isArray(prefixes)).toBe(true);
    });

    it('should return tuples with [category, prefix] format', () => {
      const prefixes = getAllSkuPrefixes();
      prefixes.forEach((tuple) => {
        expect(Array.isArray(tuple)).toBe(true);
        expect(tuple.length).toBe(2);
        expect(typeof tuple[0]).toBe('string'); // category
        expect(typeof tuple[1]).toBe('string'); // prefix
      });
    });

    it('should include IMPLANT with IMP', () => {
      const prefixes = getAllSkuPrefixes();
      const implantEntry = prefixes.find(([cat]) => cat === InventoryCategory.IMPLANT);
      expect(implantEntry).toEqual([InventoryCategory.IMPLANT, 'IMP']);
    });

    it('should include all 9 categories', () => {
      const prefixes = getAllSkuPrefixes();
      const categories = prefixes.map(([cat]) => cat);
      
      expect(categories).toContain(InventoryCategory.IMPLANT);
      expect(categories).toContain(InventoryCategory.SUTURE);
      expect(categories).toContain(InventoryCategory.ANESTHETIC);
      expect(categories).toContain(InventoryCategory.MEDICATION);
      expect(categories).toContain(InventoryCategory.DISPOSABLE);
      expect(categories).toContain(InventoryCategory.INSTRUMENT);
      expect(categories).toContain(InventoryCategory.DRESSING);
      expect(categories).toContain(InventoryCategory.SPECIMEN_CONTAINER);
      expect(categories).toContain(InventoryCategory.OTHER);
    });

    it('should return same values as CATEGORY_SKU_PREFIXES object', () => {
      const prefixes = getAllSkuPrefixes();
      const fromObject = Object.entries(CATEGORY_SKU_PREFIXES);
      
      // Sort both arrays to ensure order-independent comparison
      const sortedPrefixes = prefixes.sort(([a], [b]) => a.localeCompare(b));
      const sortedFromObject = fromObject.sort(([a], [b]) => a.localeCompare(b));
      
      expect(sortedPrefixes).toEqual(sortedFromObject);
    });
  });

  describe('hasSkuPrefix()', () => {
    it('should return true for IMPLANT', () => {
      expect(hasSkuPrefix(InventoryCategory.IMPLANT)).toBe(true);
    });

    it('should return true for SUTURE', () => {
      expect(hasSkuPrefix(InventoryCategory.SUTURE)).toBe(true);
    });

    it('should return true for ANESTHETIC', () => {
      expect(hasSkuPrefix(InventoryCategory.ANESTHETIC)).toBe(true);
    });

    it('should return true for MEDICATION', () => {
      expect(hasSkuPrefix(InventoryCategory.MEDICATION)).toBe(true);
    });

    it('should return true for DISPOSABLE', () => {
      expect(hasSkuPrefix(InventoryCategory.DISPOSABLE)).toBe(true);
    });

    it('should return true for INSTRUMENT', () => {
      expect(hasSkuPrefix(InventoryCategory.INSTRUMENT)).toBe(true);
    });

    it('should return true for DRESSING', () => {
      expect(hasSkuPrefix(InventoryCategory.DRESSING)).toBe(true);
    });

    it('should return true for SPECIMEN_CONTAINER', () => {
      expect(hasSkuPrefix(InventoryCategory.SPECIMEN_CONTAINER)).toBe(true);
    });

    it('should return true for OTHER', () => {
      expect(hasSkuPrefix(InventoryCategory.OTHER)).toBe(true);
    });

    it('should return false for unmapped category', () => {
      const invalidCategory = 'INVALID' as unknown as InventoryCategory;
      expect(hasSkuPrefix(invalidCategory)).toBe(false);
    });

    it('should return true for all valid enum values', () => {
      const allCategories = Object.values(InventoryCategory);
      allCategories.forEach((category) => {
        expect(hasSkuPrefix(category as InventoryCategory)).toBe(true);
      });
    });
  });

  describe('Single source of truth', () => {
    it('should have no duplicate prefixes across all categories', () => {
      const prefixes = Object.values(CATEGORY_SKU_PREFIXES);
      const seen = new Set<string>();
      
      prefixes.forEach((prefix) => {
        expect(seen.has(prefix)).toBe(false, `Prefix "${prefix}" is duplicated`);
        seen.add(prefix);
      });
    });

    it('should have mapping for each InventoryCategory enum value', () => {
      const enumValues = Object.values(InventoryCategory);
      const mappedCategories = Object.keys(CATEGORY_SKU_PREFIXES);
      
      // Note: This test enforces that every category enum value has a prefix mapping
      enumValues.forEach((enumValue) => {
        expect(mappedCategories).toContain(enumValue);
      });
    });
  });
});
