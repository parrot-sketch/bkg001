/**
 * Inventory Validation Schemas - Unit Tests
 * 
 * Tests for:
 * - ItemQuerySchema (GET query parameter validation)
 * - CreateItemSchema (POST/PUT body validation)
 * - UpdateItemSchema (PATCH body validation)
 * - Error response formatting
 */

import { describe, it, expect } from 'vitest';
import {
  ItemQuerySchema,
  CreateItemSchema,
  UpdateItemSchema,
  formatValidationError,
  getValidCategories,
  isValidCategory,
  InventoryCategorySchema,
} from '@/lib/validation/inventory';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

// ============================================================================
// INVENTORY CATEGORY SCHEMA TESTS
// ============================================================================

describe('InventoryCategorySchema', () => {
  it('should accept all valid categories', () => {
    const validCategories = [
      InventoryCategory.IMPLANT,
      InventoryCategory.SUTURE,
      InventoryCategory.ANESTHETIC,
      InventoryCategory.MEDICATION,
      InventoryCategory.DISPOSABLE,
      InventoryCategory.INSTRUMENT,
      InventoryCategory.DRESSING,
      InventoryCategory.SPECIMEN_CONTAINER,
      InventoryCategory.OTHER,
    ];

    validCategories.forEach((category) => {
      const result = InventoryCategorySchema.safeParse(category);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(category);
      }
    });
  });

  it('should reject invalid categories', () => {
    const invalidCategories = ['INVALID', 'MEDICINE', 'TOOL', ''];

    invalidCategories.forEach((category) => {
      const result = InventoryCategorySchema.safeParse(category);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// ITEM QUERY SCHEMA TESTS
// ============================================================================

describe('ItemQuerySchema - GET Query Parameters', () => {
  describe('pagination parameters', () => {
    it('should accept valid page and limit', () => {
      const result = ItemQuerySchema.safeParse({
        page: '1',
        limit: '20',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should use default page (1) when not provided', () => {
      const result = ItemQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it('should use default limit (20) when not provided', () => {
      const result = ItemQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject page < 1', () => {
      const result = ItemQuerySchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    it('should reject page = 0', () => {
      const result = ItemQuerySchema.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    it('should reject negative page', () => {
      const result = ItemQuerySchema.safeParse({ page: '-5' });
      expect(result.success).toBe(false);
    });

    it('should reject limit < 1', () => {
      const result = ItemQuerySchema.safeParse({ limit: '0' });
      expect(result.success).toBe(false);
    });

    it('should reject limit > 100', () => {
      const result = ItemQuerySchema.safeParse({ limit: '101' });
      expect(result.success).toBe(false);
    });

    it('should accept limit = 100 (max)', () => {
      const result = ItemQuerySchema.safeParse({ limit: '100' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100);
      }
    });

    it('should reject non-integer page', () => {
      const result = ItemQuerySchema.safeParse({ page: '1.5' });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer limit', () => {
      const result = ItemQuerySchema.safeParse({ limit: '20.5' });
      expect(result.success).toBe(false);
    });

    it('should coerce string numbers to integers', () => {
      const result = ItemQuerySchema.safeParse({
        page: '5',
        limit: '50',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.page).toBe('number');
        expect(typeof result.data.limit).toBe('number');
      }
    });
  });

  describe('search parameter', () => {
    it('should accept valid search string', () => {
      const result = ItemQuerySchema.safeParse({ search: 'bandage' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe('bandage');
      }
    });

    it('should trim whitespace from search', () => {
      const result = ItemQuerySchema.safeParse({ search: '  bandage  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe('bandage');
      }
    });

    it('should reject search > 100 characters', () => {
      const longSearch = 'a'.repeat(101);
      const result = ItemQuerySchema.safeParse({ search: longSearch });
      expect(result.success).toBe(false);
    });

    it('should accept search = 100 characters (max)', () => {
      const maxSearch = 'a'.repeat(100);
      const result = ItemQuerySchema.safeParse({ search: maxSearch });
      expect(result.success).toBe(true);
    });

    it('should accept empty string as search (optional)', () => {
      const result = ItemQuerySchema.safeParse({ search: '' });
      expect(result.success).toBe(true);
    });

    it('should use undefined when search is not provided', () => {
      const result = ItemQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBeUndefined();
      }
    });
  });

  describe('category parameter', () => {
    it('should accept valid category enum', () => {
      const result = ItemQuerySchema.safeParse({
        category: InventoryCategory.IMPLANT,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe(InventoryCategory.IMPLANT);
      }
    });

    it('should accept all valid categories', () => {
      Object.values(InventoryCategory).forEach((category) => {
        const result = ItemQuerySchema.safeParse({ category });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid category', () => {
      const result = ItemQuerySchema.safeParse({ category: 'INVALID' });
      expect(result.success).toBe(false);
    });

    it('should accept empty string as category (optional)', () => {
      const result = ItemQuerySchema.safeParse({ category: '' });
      expect(result.success).toBe(true);
    });

    it('should use undefined when category is not provided', () => {
      const result = ItemQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBeUndefined();
      }
    });
  });

  describe('low_stock_only parameter', () => {
    it('should accept boolean true', () => {
      const result = ItemQuerySchema.safeParse({ low_stock_only: 'true' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.low_stock_only).toBe(true);
      }
    });

    it('should accept boolean false (note: "false" string coerces to true)', () => {
      // Important: z.coerce.boolean() coerces "false" (non-empty string) to true
      // To get false, you need to pass a falsy value or omit the parameter
      const result = ItemQuerySchema.safeParse({ low_stock_only: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        // Empty string coerces to false
        expect(result.data.low_stock_only).toBe(false);
      }
    });

    it('should coerce string "true" to boolean', () => {
      const result = ItemQuerySchema.safeParse({ low_stock_only: 'true' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.low_stock_only).toBe('boolean');
      }
    });

    it('should use undefined when not provided', () => {
      const result = ItemQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.low_stock_only).toBeUndefined();
      }
    });
  });

  describe('full query parameter validation', () => {
    it('should accept all valid parameters together', () => {
      const result = ItemQuerySchema.safeParse({
        page: '2',
        limit: '50',
        search: 'suture',
        category: InventoryCategory.SUTURE,
        low_stock_only: 'true',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
        expect(result.data.search).toBe('suture');
        expect(result.data.category).toBe(InventoryCategory.SUTURE);
        expect(result.data.low_stock_only).toBe(true);
      }
    });

    it('should use defaults for missing optional parameters', () => {
      const result = ItemQuerySchema.safeParse({ page: '1' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.search).toBeUndefined();
        expect(result.data.category).toBeUndefined();
        expect(result.data.low_stock_only).toBeUndefined();
      }
    });
  });
});

// ============================================================================
// CREATE ITEM SCHEMA TESTS
// ============================================================================

describe('CreateItemSchema - POST Body Validation', () => {
  describe('required fields', () => {
    it('should accept valid create item request', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Sterile Bandage',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Sterile Bandage');
        expect(result.data.unit_cost).toBe(0);
        expect(result.data.unit_of_measure).toBe('unit');
      }
    });

    it('should reject missing name', () => {
      const result = CreateItemSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const result = CreateItemSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject name > 255 characters', () => {
      const longName = 'a'.repeat(256);
      const result = CreateItemSchema.safeParse({ name: longName });
      expect(result.success).toBe(false);
    });

    it('should accept name = 255 characters (max)', () => {
      const maxName = 'a'.repeat(255);
      const result = CreateItemSchema.safeParse({ name: maxName });
      expect(result.success).toBe(true);
    });
  });

  describe('sku field', () => {
    it('should accept valid sku', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        sku: 'SKU-001',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sku).toBe('SKU-001');
      }
    });

    it('should reject empty sku', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        sku: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject sku > 255 characters', () => {
      const longSku = 'a'.repeat(256);
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        sku: longSku,
      });
      expect(result.success).toBe(false);
    });

    it('should be optional', () => {
      const result = CreateItemSchema.safeParse({ name: 'Item' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sku).toBeUndefined();
      }
    });
  });

  describe('category field', () => {
    it('should accept valid category', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        category: InventoryCategory.IMPLANT,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe(InventoryCategory.IMPLANT);
      }
    });

    it('should be optional', () => {
      const result = CreateItemSchema.safeParse({ name: 'Item' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid category', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        category: 'INVALID',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('unit_cost field', () => {
    it('should accept valid unit_cost', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        unit_cost: 10.5,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.unit_cost).toBe(10.5);
      }
    });

    it('should reject negative unit_cost', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        unit_cost: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should accept unit_cost = 0', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        unit_cost: 0,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.unit_cost).toBe(0);
      }
    });

    it('should use default unit_cost (0) when not provided', () => {
      const result = CreateItemSchema.safeParse({ name: 'Item' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.unit_cost).toBe(0);
      }
    });
  });

  describe('reorder_point field', () => {
    it('should accept valid reorder_point', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        reorder_point: 50,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reorder_point).toBe(50);
      }
    });

    it('should reject negative reorder_point', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        reorder_point: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer reorder_point', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        reorder_point: 50.5,
      });
      expect(result.success).toBe(false);
    });

    it('should use default (0) when not provided', () => {
      const result = CreateItemSchema.safeParse({ name: 'Item' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reorder_point).toBe(0);
      }
    });
  });

  describe('description field', () => {
    it('should accept valid description', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        description: 'A test item',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('A test item');
      }
    });

    it('should reject description > 1000 characters', () => {
      const longDesc = 'a'.repeat(1001);
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        description: longDesc,
      });
      expect(result.success).toBe(false);
    });

    it('should accept description = 1000 characters (max)', () => {
      const maxDesc = 'a'.repeat(1000);
      const result = CreateItemSchema.safeParse({
        name: 'Item',
        description: maxDesc,
      });
      expect(result.success).toBe(true);
    });

    it('should be optional', () => {
      const result = CreateItemSchema.safeParse({ name: 'Item' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeUndefined();
      }
    });
  });

  describe('full item creation', () => {
    it('should accept complete valid item', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Surgical Suture',
        sku: 'SUTURE-001',
        category: InventoryCategory.SUTURE,
        unit_of_measure: 'box',
        unit_cost: 25.99,
        reorder_point: 100,
        low_stock_threshold: 50,
        description: 'High-quality surgical sutures',
        supplier: 'Medical Supplier Inc.',
        manufacturer: 'Manufacturer Ltd.',
        is_billable: true,
        is_implant: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Surgical Suture');
        expect(result.data.sku).toBe('SUTURE-001');
        expect(result.data.unit_cost).toBe(25.99);
      }
    });

    it('should use defaults for optional fields', () => {
      const result = CreateItemSchema.safeParse({
        name: 'Simple Item',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.unit_of_measure).toBe('unit');
        expect(result.data.unit_cost).toBe(0);
        expect(result.data.reorder_point).toBe(0);
        expect(result.data.low_stock_threshold).toBe(0);
        expect(result.data.is_billable).toBe(true);
        expect(result.data.is_implant).toBe(false);
      }
    });
  });
});

// ============================================================================
// UPDATE ITEM SCHEMA TESTS
// ============================================================================

describe('UpdateItemSchema - PATCH Body Validation', () => {
  it('should allow partial updates', () => {
    const result = UpdateItemSchema.safeParse({
      name: 'Updated Name',
    });
    expect(result.success).toBe(true);
  });

  it('should allow all fields to be undefined', () => {
    const result = UpdateItemSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate fields that are provided', () => {
    const result = UpdateItemSchema.safeParse({
      unit_cost: -1, // Invalid
    });
    expect(result.success).toBe(false);
  });

  it('should accept partial valid updates', () => {
    const result = UpdateItemSchema.safeParse({
      name: 'New Name',
      unit_cost: 15.99,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// ERROR FORMATTING TESTS
// ============================================================================

describe('formatValidationError', () => {
  it('should format validation error correctly', () => {
    const result = CreateItemSchema.safeParse({});
    expect(result.success).toBe(false);

    if (!result.success) {
      const formatted = formatValidationError(result.error);
      expect(formatted.success).toBe(false);
      expect(formatted.error).toBe('Validation failed');
      expect(formatted.details).toHaveProperty('fieldErrors');
      expect(formatted.details).toHaveProperty('formErrors');
    }
  });

  it('should include field errors', () => {
    const result = CreateItemSchema.safeParse({
      name: 'a'.repeat(256), // Too long
    });
    expect(result.success).toBe(false);

    if (!result.success) {
      const formatted = formatValidationError(result.error);
      expect(Object.keys(formatted.details.fieldErrors || {}).length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('Helper Functions', () => {
  describe('getValidCategories', () => {
    it('should return all valid categories', () => {
      const categories = getValidCategories();
      expect(categories).toContain(InventoryCategory.IMPLANT);
      expect(categories).toContain(InventoryCategory.OTHER);
      expect(categories.length).toBe(9);
    });
  });

  describe('isValidCategory', () => {
    it('should return true for valid categories', () => {
      expect(isValidCategory(InventoryCategory.IMPLANT)).toBe(true);
      expect(isValidCategory(InventoryCategory.OTHER)).toBe(true);
    });

    it('should return false for invalid categories', () => {
      expect(isValidCategory('INVALID')).toBe(false);
      expect(isValidCategory('')).toBe(false);
    });
  });
});
