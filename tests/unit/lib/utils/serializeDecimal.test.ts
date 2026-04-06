import { describe, it, expect } from 'vitest';
import { serializeDecimal, serializeInventoryItem } from '@/lib/utils';

/**
 * Unit Tests for Decimal Serialization
 * 
 * Tests the serializeDecimal utility function that converts Prisma Decimal objects
 * to plain numbers for client component serialization.
 */

describe('serializeDecimal', () => {
  it('should return null and undefined as-is', () => {
    expect(serializeDecimal(null)).toBe(null);
    expect(serializeDecimal(undefined)).toBe(undefined);
  });

  it('should convert Decimal objects to numbers', () => {
    // Mock Prisma Decimal object with toNumber method
    const mockDecimal = {
      toNumber: () => 99.99,
    };

    const result = serializeDecimal(mockDecimal);
    expect(result).toBe(99.99);
    expect(typeof result).toBe('number');
  });

  it('should handle arrays of Decimal objects', () => {
    const decimals = [
      { toNumber: () => 10.5 },
      { toNumber: () => 20.75 },
      { toNumber: () => 99.99 },
    ];

    const result = serializeDecimal(decimals);
    expect(result).toEqual([10.5, 20.75, 99.99]);
    expect(result.every((item: any) => typeof item === 'number')).toBe(true);
  });

  it('should recursively handle nested objects with Decimals', () => {
    const nestedObj = {
      id: 1,
      name: 'Test Item',
      unit_cost: { toNumber: () => 99.99 },
      metadata: {
        reorder_point: 10,
        low_stock_cost: { toNumber: () => 5.50 },
      },
    };

    const result = serializeDecimal(nestedObj);
    
    expect(result).toEqual({
      id: 1,
      name: 'Test Item',
      unit_cost: 99.99,
      metadata: {
        reorder_point: 10,
        low_stock_cost: 5.50,
      },
    });
    expect(typeof result.unit_cost).toBe('number');
    expect(typeof result.metadata.low_stock_cost).toBe('number');
  });

  it('should handle mixed arrays with objects and Decimals', () => {
    const mixedArray = [
      {
        id: 1,
        cost: { toNumber: () => 100 },
      },
      {
        id: 2,
        cost: { toNumber: () => 200 },
      },
    ];

    const result = serializeDecimal(mixedArray);
    
    expect(result).toEqual([
      { id: 1, cost: 100 },
      { id: 2, cost: 200 },
    ]);
  });

  it('should preserve primitives and regular values', () => {
    const obj = {
      id: 123,
      name: 'Test',
      is_active: true,
      description: null,
      tags: ['tag1', 'tag2'],
      created_at: new Date('2024-01-01'),
    };

    const result = serializeDecimal(obj);
    
    expect(result).toEqual(obj);
    expect(result.id).toBe(123);
    expect(result.name).toBe('Test');
    expect(result.is_active).toBe(true);
    expect(result.description).toBe(null);
  });

  it('should handle real-world InventoryItem structure', () => {
    const inventoryItem = {
      id: 112,
      name: 'Sodium Chloride 0.9% IV Fluid',
      sku: 'IV-SAL-500',
      category: 'MEDICATION',
      description: 'Normal saline for IV administration',
      unit_of_measure: 'bottle',
      unit_cost: { toNumber: () => 250.0 },
      reorder_point: 20,
      low_stock_threshold: 10,
      supplier: 'Medical Supplies Inc',
      is_active: true,
      is_billable: true,
      is_implant: false,
      manufacturer: null,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-15'),
    };

    const result = serializeDecimal(inventoryItem);
    
    expect(result.unit_cost).toBe(250.0);
    expect(typeof result.unit_cost).toBe('number');
    expect(result.id).toBe(112);
    expect(result.name).toBe('Sodium Chloride 0.9% IV Fluid');
    expect(result.is_active).toBe(true);
  });
});

describe('serializeInventoryItem', () => {
  it('should serialize inventory item with Decimal unit_cost', () => {
    const item = {
      id: 1,
      name: 'Test Item',
      unit_cost: { toNumber: () => 99.99 },
    };

    const result = serializeInventoryItem(item);
    
    expect(result.unit_cost).toBe(99.99);
    expect(typeof result.unit_cost).toBe('number');
  });

  it('should be alias for serializeDecimal', () => {
    const item = {
      id: 1,
      cost: { toNumber: () => 150 },
      nested: {
        inner: { toNumber: () => 75.5 },
      },
    };

    const result1 = serializeDecimal(item);
    const result2 = serializeInventoryItem(item);
    
    expect(result1).toEqual(result2);
  });
});
