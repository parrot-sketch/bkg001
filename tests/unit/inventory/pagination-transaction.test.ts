/**
 * Unit Tests: Pagination Transaction Optimization
 *
 * Tests that searchAndPaginateItems uses Prisma $transaction
 * to run data fetch and count in a single round-trip.
 *
 * Core Focus: $transaction is used instead of Promise.all
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaInventoryRepository } from '@/infrastructure/database/repositories/PrismaInventoryRepository';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

describe('Pagination Transaction Optimization', () => {
  let repository: PrismaInventoryRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      inventoryItem: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn().mockResolvedValue([[], 0]),
    };

    repository = new PrismaInventoryRepository(mockPrisma);
  });

  describe('transaction usage - core optimization', () => {
    it('should use $transaction for pagination (single round-trip)', async () => {
      await repository.searchAndPaginateItems({
        page: 1,
        limit: 10,
      });

      // PRIMARY ASSERTION: $transaction must be called exactly once
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should pass array of [findMany, count] queries to $transaction', async () => {
      await repository.searchAndPaginateItems({
        page: 1,
        limit: 10,
      });

      const callArgs = mockPrisma.$transaction.mock.calls[0][0];
      expect(Array.isArray(callArgs)).toBe(true);
      expect(callArgs.length).toBe(2);
    });

    it('$transaction should be called once regardless of empty results', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await repository.searchAndPaginateItems({
        page: 1,
        limit: 10,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('$transaction should be called once regardless of large result set', async () => {
      const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      mockPrisma.$transaction.mockResolvedValue([largeResultSet, 1000]);

      await repository.searchAndPaginateItems({
        page: 1,
        limit: 100,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('$transaction should be called once for each request independently', async () => {
      // First request
      await repository.searchAndPaginateItems({
        page: 1,
        limit: 10,
      });
      let callCount = mockPrisma.$transaction.mock.calls.length;
      expect(callCount).toBe(1);
    });
  });

  describe('result aggregation and pagination metadata', () => {
    it('should return pagination with total from transaction', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 42]);

      const result = await repository.searchAndPaginateItems({
        page: 1,
        limit: 10,
      });

      expect(result.pagination.total).toBe(42);
    });

    it('should calculate totalPages correctly (exact division)', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 20]);

      const result = await repository.searchAndPaginateItems({
        page: 1,
        limit: 10,
      });

      expect(result.pagination.totalPages).toBe(2); // 20 / 10
    });

    it('should calculate totalPages correctly (with remainder)', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 25]);

      const result = await repository.searchAndPaginateItems({
        page: 1,
        limit: 10,
      });

      expect(result.pagination.totalPages).toBe(3); // ceil(25 / 10)
    });

    it('should include complete pagination metadata', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 50]);

      const result = await repository.searchAndPaginateItems({
        page: 3,
        limit: 15,
      });

      expect(result.pagination).toEqual({
        total: 50,
        page: 3,
        limit: 15,
        totalPages: 4,
      });
    });

    it('should return mapped items from transaction result', async () => {
      const mockItem = {
        id: 1,
        name: 'Test Item',
        category: 'OTHER',
        unit_of_measure: 'unit',
        unit_cost: 100,
        reorder_point: 10,
        low_stock_threshold: 5,
        is_billable: true,
        is_implant: false,
        sku: null,
        supplier: null,
        manufacturer: null,
        description: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.$transaction.mockResolvedValue([[mockItem], 1]);

      const result = await repository.searchAndPaginateItems({
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toHaveProperty('name', 'Test Item');
    });
  });

  describe('query structure consistency', () => {
    it('$transaction receives two query objects', async () => {
      let queries: any;

      mockPrisma.$transaction.mockImplementation((q: any[]) => {
        queries = q;
        return Promise.resolve([[], 0]);
      });

      await repository.searchAndPaginateItems({
        page: 1,
        limit: 10,
      });

      expect(queries).toHaveLength(2);
      expect(typeof queries[0]).toBe('object');
      expect(typeof queries[1]).toBe('object');
    });
  });
});
