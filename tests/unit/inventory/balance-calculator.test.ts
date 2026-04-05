/**
 * Unit Tests: Inventory Balance Calculator
 *
 * Tests pure functions for calculating inventory balances from transaction arrays.
 * Covers:
 * - Empty transaction array (balance = 0)
 * - Only STOCK_IN transactions (positive balance)
 * - Only STOCK_OUT transactions (negative balance)
 * - Mixed transaction types
 * - ADJUSTMENT transactions with positive/negative quantities
 * - OPENING_BALANCE handling
 * - Bulk calculation with multiple items
 * - Transaction summary calculation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateItemBalance,
  calculateBulkBalances,
  getTransactionSummary,
} from '@/lib/inventory/balance-calculator';
import { StockMovementType } from '@/domain/interfaces/repositories/IInventoryRepository';
import type { InventoryTransaction } from '@/domain/interfaces/repositories/IInventoryRepository';

/**
 * Mock transaction factory
 */
const createMockTransaction = (
  overrides?: Partial<InventoryTransaction>
): InventoryTransaction => ({
  id: '1',
  inventoryItemId: 1,
  type: StockMovementType.STOCK_IN,
  quantity: 10,
  unitPrice: 100,
  totalValue: 1000,
  reference: null,
  notes: null,
  createdById: null,
  createdAt: new Date(),
  ...overrides,
});

describe('Balance Calculator', () => {
  describe('calculateItemBalance()', () => {
    describe('empty transaction array', () => {
      it('should return 0 for empty array', () => {
        const balance = calculateItemBalance([]);
        expect(balance).toBe(0);
      });
    });

    describe('STOCK_IN transactions', () => {
      it('should add STOCK_IN quantity to balance', () => {
        const transactions: InventoryTransaction[] = [
          createMockTransaction({
            type: StockMovementType.STOCK_IN,
            quantity: 100,
          }),
        ];

        const balance = calculateItemBalance(transactions);
        expect(balance).toBe(100);
      });

      it('should sum multiple STOCK_IN transactions', () => {
        const transactions: InventoryTransaction[] = [
          createMockTransaction({
            type: StockMovementType.STOCK_IN,
            quantity: 100,
          }),
          createMockTransaction({
            type: StockMovementType.STOCK_IN,
            quantity: 50,
          }),
          createMockTransaction({
            type: StockMovementType.STOCK_IN,
            quantity: 25,
          }),
        ];

        const balance = calculateItemBalance(transactions);
        expect(balance).toBe(175);
      });
    });

    describe('STOCK_OUT transactions', () => {
      it('should subtract STOCK_OUT quantity from balance', () => {
        const transactions: InventoryTransaction[] = [
          createMockTransaction({
            type: StockMovementType.STOCK_IN,
            quantity: 100,
          }),
          createMockTransaction({
            type: StockMovementType.STOCK_OUT,
            quantity: 30,
          }),
        ];

        const balance = calculateItemBalance(transactions);
        expect(balance).toBe(70);
      });

      it('should allow balance to go negative (usage exceeding stock)', () => {
        const transactions: InventoryTransaction[] = [
          createMockTransaction({
            type: StockMovementType.STOCK_IN,
            quantity: 50,
          }),
          createMockTransaction({
            type: StockMovementType.STOCK_OUT,
            quantity: 80,
          }),
        ];

        const balance = calculateItemBalance(transactions);
        expect(balance).toBe(-30);
      });

      it('should handle only STOCK_OUT (starting from zero)', () => {
        const transactions: InventoryTransaction[] = [
          createMockTransaction({
            type: StockMovementType.STOCK_OUT,
            quantity: 50,
          }),
        ];

        const balance = calculateItemBalance(transactions);
        expect(balance).toBe(-50);
      });
    });

    describe('OPENING_BALANCE transactions', () => {
      it('should treat OPENING_BALANCE as STOCK_IN', () => {
        const transactions: InventoryTransaction[] = [
          createMockTransaction({
            type: StockMovementType.OPENING_BALANCE,
            quantity: 100,
          }),
        ];

        const balance = calculateItemBalance(transactions);
        expect(balance).toBe(100);
      });

      it('should combine OPENING_BALANCE with other transactions', () => {
        const transactions: InventoryTransaction[] = [
          createMockTransaction({
            type: StockMovementType.OPENING_BALANCE,
            quantity: 100,
          }),
          createMockTransaction({
            type: StockMovementType.STOCK_IN,
            quantity: 50,
          }),
          createMockTransaction({
            type: StockMovementType.STOCK_OUT,
            quantity: 20,
          }),
        ];

        const balance = calculateItemBalance(transactions);
        expect(balance).toBe(130);
      });
    });

    describe('ADJUSTMENT transactions', () => {
      it('should add positive ADJUSTMENT quantity to balance', () => {
        const transactions: InventoryTransaction[] = [
          createMockTransaction({
            type: StockMovementType.ADJUSTMENT,
            quantity: 50,
          }),
        ];

        const balance = calculateItemBalance(transactions);
        expect(balance).toBe(50);
      });

      it('should subtract negative ADJUSTMENT quantity from balance', () => {
        const transactions: InventoryTransaction[] = [
          createMockTransaction({
            type: StockMovementType.STOCK_IN,
            quantity: 100,
          }),
          createMockTransaction({
            type: StockMovementType.ADJUSTMENT,
            quantity: -30,
          }),
        ];

        const balance = calculateItemBalance(transactions);
        expect(balance).toBe(70);
      });

      it('should handle zero ADJUSTMENT (no impact)', () => {
        const transactions: InventoryTransaction[] = [
          createMockTransaction({
            type: StockMovementType.STOCK_IN,
            quantity: 100,
          }),
          createMockTransaction({
            type: StockMovementType.ADJUSTMENT,
            quantity: 0,
          }),
        ];

        const balance = calculateItemBalance(transactions);
        expect(balance).toBe(100);
      });
    });

    describe('mixed transaction types', () => {
      it('should correctly calculate balance with all transaction types', () => {
        const transactions: InventoryTransaction[] = [
          createMockTransaction({
            type: StockMovementType.OPENING_BALANCE,
            quantity: 100,
          }),
          createMockTransaction({
            type: StockMovementType.STOCK_IN,
            quantity: 50,
          }),
          createMockTransaction({
            type: StockMovementType.STOCK_OUT,
            quantity: 30,
          }),
          createMockTransaction({
            type: StockMovementType.ADJUSTMENT,
            quantity: 15,
          }),
          createMockTransaction({
            type: StockMovementType.ADJUSTMENT,
            quantity: -10,
          }),
        ];

        // 100 + 50 - 30 + 15 - 10 = 125
        const balance = calculateItemBalance(transactions);
        expect(balance).toBe(125);
      });

      it('should process transactions in any order', () => {
        const transactions: InventoryTransaction[] = [
          createMockTransaction({
            type: StockMovementType.STOCK_OUT,
            quantity: 30,
          }),
          createMockTransaction({
            type: StockMovementType.STOCK_IN,
            quantity: 50,
          }),
          createMockTransaction({
            type: StockMovementType.OPENING_BALANCE,
            quantity: 100,
          }),
        ];

        // Order shouldn't matter: 100 + 50 - 30 = 120
        const balance = calculateItemBalance(transactions);
        expect(balance).toBe(120);
      });
    });

    describe('absolute value handling', () => {
      it('should use absolute value for quantity regardless of sign', () => {
        const transactions: InventoryTransaction[] = [
          createMockTransaction({
            type: StockMovementType.STOCK_IN,
            quantity: 100,
          }),
          createMockTransaction({
            type: StockMovementType.STOCK_OUT,
            quantity: 30, // Positive quantity for STOCK_OUT uses Math.abs
          }),
        ];

        const balance = calculateItemBalance(transactions);
        expect(balance).toBe(70);
      });
    });
  });

  describe('calculateBulkBalances()', () => {
    it('should return empty map for empty transaction array', () => {
      const balances = calculateBulkBalances([]);
      expect(balances.size).toBe(0);
    });

    it('should initialize all provided item IDs with 0 balance', () => {
      const balances = calculateBulkBalances([], [1, 2, 3]);
      expect(balances.size).toBe(3);
      expect(balances.get(1)).toBe(0);
      expect(balances.get(2)).toBe(0);
      expect(balances.get(3)).toBe(0);
    });

    it('should calculate balances for multiple items', () => {
      const transactions: InventoryTransaction[] = [
        createMockTransaction({
          inventoryItemId: 1,
          type: StockMovementType.STOCK_IN,
          quantity: 100,
        }),
        createMockTransaction({
          inventoryItemId: 1,
          type: StockMovementType.STOCK_OUT,
          quantity: 30,
        }),
        createMockTransaction({
          inventoryItemId: 2,
          type: StockMovementType.STOCK_IN,
          quantity: 50,
        }),
        createMockTransaction({
          inventoryItemId: 3,
          type: StockMovementType.STOCK_IN,
          quantity: 200,
        }),
        createMockTransaction({
          inventoryItemId: 3,
          type: StockMovementType.STOCK_OUT,
          quantity: 50,
        }),
      ];

      const balances = calculateBulkBalances(transactions, [1, 2, 3]);

      expect(balances.get(1)).toBe(70); // 100 - 30
      expect(balances.get(2)).toBe(50); // 50
      expect(balances.get(3)).toBe(150); // 200 - 50
    });

    it('should handle items with no transactions (if item IDs provided)', () => {
      const transactions: InventoryTransaction[] = [
        createMockTransaction({
          inventoryItemId: 1,
          type: StockMovementType.STOCK_IN,
          quantity: 100,
        }),
      ];

      const balances = calculateBulkBalances(transactions, [1, 2, 3]);

      expect(balances.get(1)).toBe(100);
      expect(balances.get(2)).toBe(0); // No transactions, but initialized
      expect(balances.get(3)).toBe(0); // No transactions, but initialized
    });

    it('should not initialize items if no item IDs provided', () => {
      const transactions: InventoryTransaction[] = [
        createMockTransaction({
          inventoryItemId: 1,
          type: StockMovementType.STOCK_IN,
          quantity: 100,
        }),
        createMockTransaction({
          inventoryItemId: 2,
          type: StockMovementType.STOCK_IN,
          quantity: 50,
        }),
      ];

      const balances = calculateBulkBalances(transactions);

      // Only items with transactions should be in map
      expect(balances.size).toBe(2);
      expect(balances.get(1)).toBe(100);
      expect(balances.get(2)).toBe(50);
    });

    it('should handle negative balances across multiple items', () => {
      const transactions: InventoryTransaction[] = [
        createMockTransaction({
          inventoryItemId: 1,
          type: StockMovementType.STOCK_OUT,
          quantity: 100,
        }),
        createMockTransaction({
          inventoryItemId: 2,
          type: StockMovementType.STOCK_IN,
          quantity: 50,
        }),
        createMockTransaction({
          inventoryItemId: 2,
          type: StockMovementType.STOCK_OUT,
          quantity: 80,
        }),
      ];

      const balances = calculateBulkBalances(transactions, [1, 2]);

      expect(balances.get(1)).toBe(-100);
      expect(balances.get(2)).toBe(-30);
    });
  });

  describe('getTransactionSummary()', () => {
    it('should return zeros for empty transaction array', () => {
      const summary = getTransactionSummary([]);

      expect(summary.totalIn).toBe(0);
      expect(summary.totalOut).toBe(0);
      expect(summary.netBalance).toBe(0);
    });

    it('should calculate totals for STOCK_IN only', () => {
      const transactions: InventoryTransaction[] = [
        createMockTransaction({
          type: StockMovementType.STOCK_IN,
          quantity: 100,
        }),
        createMockTransaction({
          type: StockMovementType.STOCK_IN,
          quantity: 50,
        }),
      ];

      const summary = getTransactionSummary(transactions);

      expect(summary.totalIn).toBe(150);
      expect(summary.totalOut).toBe(0);
      expect(summary.netBalance).toBe(150);
    });

    it('should calculate totals for STOCK_OUT only', () => {
      const transactions: InventoryTransaction[] = [
        createMockTransaction({
          type: StockMovementType.STOCK_OUT,
          quantity: 30,
        }),
        createMockTransaction({
          type: StockMovementType.STOCK_OUT,
          quantity: 20,
        }),
      ];

      const summary = getTransactionSummary(transactions);

      expect(summary.totalIn).toBe(0);
      expect(summary.totalOut).toBe(50);
      expect(summary.netBalance).toBe(-50);
    });

    it('should calculate totals for mixed transactions', () => {
      const transactions: InventoryTransaction[] = [
        createMockTransaction({
          type: StockMovementType.OPENING_BALANCE,
          quantity: 100,
        }),
        createMockTransaction({
          type: StockMovementType.STOCK_IN,
          quantity: 50,
        }),
        createMockTransaction({
          type: StockMovementType.STOCK_OUT,
          quantity: 30,
        }),
        createMockTransaction({
          type: StockMovementType.ADJUSTMENT,
          quantity: 20,
        }),
        createMockTransaction({
          type: StockMovementType.ADJUSTMENT,
          quantity: -10,
        }),
      ];

      const summary = getTransactionSummary(transactions);

      expect(summary.totalIn).toBe(170); // 100 + 50 + 20
      expect(summary.totalOut).toBe(40); // 30 + 10
      expect(summary.netBalance).toBe(130); // 170 - 40
    });

    it('should handle ADJUSTMENT transactions correctly', () => {
      const transactions: InventoryTransaction[] = [
        createMockTransaction({
          type: StockMovementType.ADJUSTMENT,
          quantity: 15,
        }),
        createMockTransaction({
          type: StockMovementType.ADJUSTMENT,
          quantity: -5,
        }),
      ];

      const summary = getTransactionSummary(transactions);

      expect(summary.totalIn).toBe(15);
      expect(summary.totalOut).toBe(5);
      expect(summary.netBalance).toBe(10);
    });

    it('should match netBalance to calculateItemBalance result', () => {
      const transactions: InventoryTransaction[] = [
        createMockTransaction({
          type: StockMovementType.OPENING_BALANCE,
          quantity: 100,
        }),
        createMockTransaction({
          type: StockMovementType.STOCK_IN,
          quantity: 50,
        }),
        createMockTransaction({
          type: StockMovementType.STOCK_OUT,
          quantity: 30,
        }),
      ];

      const summary = getTransactionSummary(transactions);
      const balance = calculateItemBalance(transactions);

      expect(summary.netBalance).toBe(balance);
    });
  });

  describe('edge cases', () => {
    it('should handle transactions with very large quantities', () => {
      const transactions: InventoryTransaction[] = [
        createMockTransaction({
          type: StockMovementType.STOCK_IN,
          quantity: 1000000,
        }),
        createMockTransaction({
          type: StockMovementType.STOCK_OUT,
          quantity: 999999,
        }),
      ];

      const balance = calculateItemBalance(transactions);
      expect(balance).toBe(1);
    });

    it('should handle transactions with decimal-like values (int)', () => {
      const transactions: InventoryTransaction[] = [
        createMockTransaction({
          type: StockMovementType.STOCK_IN,
          quantity: 100,
        }),
      ];

      const balance = calculateItemBalance(transactions);
      expect(Number.isInteger(balance)).toBe(true);
      expect(balance).toBe(100);
    });

    it('should be pure: multiple calls with same input produce same output', () => {
      const transactions: InventoryTransaction[] = [
        createMockTransaction({
          type: StockMovementType.STOCK_IN,
          quantity: 100,
        }),
        createMockTransaction({
          type: StockMovementType.STOCK_OUT,
          quantity: 30,
        }),
      ];

      const balance1 = calculateItemBalance(transactions);
      const balance2 = calculateItemBalance(transactions);

      expect(balance1).toBe(balance2);
      expect(balance1).toBe(70);
    });

    it('should not mutate input transactions array', () => {
      const transactions: InventoryTransaction[] = [
        createMockTransaction({
          type: StockMovementType.STOCK_IN,
          quantity: 100,
        }),
      ];

      const originalLength = transactions.length;
      calculateItemBalance(transactions);

      expect(transactions.length).toBe(originalLength);
    });
  });
});
