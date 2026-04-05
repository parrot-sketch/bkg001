/**
 * Inventory Balance Calculator Utility
 *
 * Pure functions for calculating inventory balances from transaction arrays.
 * These functions are database-agnostic and can be reused across repositories.
 *
 * Balance Rule:
 * - STOCK_IN, OPENING_BALANCE: add to balance
 * - ADJUSTMENT with positive quantity: add to balance
 * - STOCK_OUT, ADJUSTMENT with negative quantity: subtract from balance
 * - Balance is NOT floored at zero (can go negative for tracking purposes)
 */

import type { InventoryTransaction } from '@/domain/interfaces/repositories/IInventoryRepository';
import { StockMovementType } from '@/domain/interfaces/repositories/IInventoryRepository';

/**
 * Calculate the net balance for a single item from its transactions.
 *
 * Pure function: no database calls, no side effects.
 *
 * @param transactions - Array of transactions for a single item (in any order)
 * @returns Net balance (sum of STOCK_IN - STOCK_OUT). Can be negative.
 *
 * @example
 * const balance = calculateItemBalance([
 *   { type: 'STOCK_IN', quantity: 100 },
 *   { type: 'STOCK_OUT', quantity: 30 },
 * ]);
 * // Returns: 70
 */
export function calculateItemBalance(transactions: InventoryTransaction[]): number {
  return transactions.reduce((balance, transaction) => {
    const quantity = Math.abs(transaction.quantity);

    // Additions to stock
    if (
      transaction.type === StockMovementType.STOCK_IN ||
      transaction.type === StockMovementType.OPENING_BALANCE ||
      (transaction.type === StockMovementType.ADJUSTMENT && transaction.quantity > 0)
    ) {
      return balance + quantity;
    }

    // Subtractions from stock
    if (
      transaction.type === StockMovementType.STOCK_OUT ||
      (transaction.type === StockMovementType.ADJUSTMENT && transaction.quantity < 0)
    ) {
      return balance - quantity;
    }

    // Unknown transaction type: no change
    return balance;
  }, 0);
}

/**
 * Calculate balances for multiple items by grouping transactions.
 *
 * Pure function: no database calls, no side effects.
 * Efficiently processes a flat list of mixed transactions and groups them by item.
 *
 * @param transactions - Mixed array of transactions for multiple items
 * @param itemIds - (Optional) List of item IDs to initialize in the map.
 *                  If not provided, only items with transactions will be in the result map.
 * @returns Map<itemId, balance> for each item
 *
 * @example
 * const transactions = [
 *   { inventoryItemId: 1, type: 'STOCK_IN', quantity: 100 },
 *   { inventoryItemId: 1, type: 'STOCK_OUT', quantity: 30 },
 *   { inventoryItemId: 2, type: 'STOCK_IN', quantity: 50 },
 * ];
 * const balances = calculateBulkBalances(transactions, [1, 2]);
 * // Returns: Map { 1 => 70, 2 => 50 }
 */
export function calculateBulkBalances(
  transactions: InventoryTransaction[],
  itemIds?: number[]
): Map<number, number> {
  const balances = new Map<number, number>();

  // Initialize all item IDs with 0 balance (if provided)
  if (itemIds && itemIds.length > 0) {
    itemIds.forEach((itemId) => balances.set(itemId, 0));
  }

  // Group transactions by item and calculate balance for each
  const transactionsByItem = new Map<number, InventoryTransaction[]>();

  transactions.forEach((transaction) => {
    const itemId = transaction.inventoryItemId;
    if (!transactionsByItem.has(itemId)) {
      transactionsByItem.set(itemId, []);
    }
    transactionsByItem.get(itemId)!.push(transaction);
  });

  // Calculate balance for each item
  transactionsByItem.forEach((itemTransactions, itemId) => {
    const balance = calculateItemBalance(itemTransactions);
    balances.set(itemId, balance);
  });

  return balances;
}

/**
 * Get transaction summary statistics (total in, total out, net balance).
 *
 * Useful for reporting and audit trails.
 *
 * @param transactions - Array of transactions for a single item
 * @returns Object with totalIn, totalOut, and netBalance
 *
 * @example
 * const summary = getTransactionSummary([
 *   { type: 'STOCK_IN', quantity: 100 },
 *   { type: 'STOCK_OUT', quantity: 30 },
 * ]);
 * // Returns: { totalIn: 100, totalOut: 30, netBalance: 70 }
 */
export function getTransactionSummary(transactions: InventoryTransaction[]): {
  totalIn: number;
  totalOut: number;
  netBalance: number;
} {
  let totalIn = 0;
  let totalOut = 0;

  transactions.forEach((transaction) => {
    const quantity = Math.abs(transaction.quantity);

    if (
      transaction.type === StockMovementType.STOCK_IN ||
      transaction.type === StockMovementType.OPENING_BALANCE ||
      (transaction.type === StockMovementType.ADJUSTMENT && transaction.quantity > 0)
    ) {
      totalIn += quantity;
    } else if (
      transaction.type === StockMovementType.STOCK_OUT ||
      (transaction.type === StockMovementType.ADJUSTMENT && transaction.quantity < 0)
    ) {
      totalOut += quantity;
    }
  });

  return {
    totalIn,
    totalOut,
    netBalance: totalIn - totalOut,
  };
}
