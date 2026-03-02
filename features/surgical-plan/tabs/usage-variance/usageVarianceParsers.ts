/**
 * Usage Variance Tab Parsers
 * 
 * Zod schemas and parsers for usage variance API responses.
 * All parsers throw ValidationError on invalid data.
 */

import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';
import { SourceFormKey } from '@/application/services/InventoryConsumptionBillingService';

// ============================================================================
// Usage Variance Response Schema
// ============================================================================

const PlannedItemSchema = z.object({
  id: z.number().int().positive(),
  inventoryItemId: z.number().int().positive().nullable(),
  itemName: z.string(),
  plannedQuantity: z.number().nonnegative(),
  plannedUnitPrice: z.number().nonnegative(),
  plannedTotalCost: z.number().nonnegative(),
  notes: z.string().nullable(),
});

const UsedItemSchema = z.object({
  id: z.number().int().positive(),
  inventoryItemId: z.number().int().positive(),
  itemName: z.string(),
  quantityUsed: z.number().nonnegative(),
  unitCostAtTime: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  usedAt: z.string().datetime(),
  sourceFormKey: z.nativeEnum(SourceFormKey),
});

const VarianceItemSchema = z.object({
  inventoryItemId: z.number().int().positive(),
  itemName: z.string(),
  plannedQuantity: z.number().nonnegative(),
  usedQuantity: z.number().nonnegative(),
  quantityVariance: z.number(),
  plannedCost: z.number().nonnegative(),
  actualCost: z.number().nonnegative(),
  costVariance: z.number(),
  isBillable: z.boolean(),
});

export const UsageVarianceResponseSchema = z.object({
  plannedItems: z.array(PlannedItemSchema),
  usedItems: z.array(UsedItemSchema),
  variance: z.array(VarianceItemSchema),
  plannedTotalCost: z.number().nonnegative(),
  actualBilledCost: z.number().nonnegative(),
  varianceTotal: z.number(),
});

export type UsageVarianceResponseDto = z.infer<typeof UsageVarianceResponseSchema>;

/**
 * Parse and validate usage variance response.
 * Throws ValidationError if invalid.
 */
export function parseUsageVarianceResponse(data: unknown): UsageVarianceResponseDto {
  try {
    return UsageVarianceResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid usage variance response');
    }
    throw error;
  }
}
