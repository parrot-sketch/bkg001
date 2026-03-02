/**
 * Inventory Billing Parsers
 * 
 * Zod schemas and parsers for inventory billing API requests.
 * All parsers throw ValidationError on invalid data.
 */

import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';
import { SourceFormKey } from '@/application/services/InventoryConsumptionBillingService';

// ============================================================================
// Planned Items Request Schema
// ============================================================================

const PlannedInventoryItemSchema = z.object({
  inventoryItemId: z.number().int().positive(),
  plannedQuantity: z.number().positive(),
  notes: z.string().optional(),
});

const PlannedServiceItemSchema = z.object({
  serviceId: z.number().int().positive(),
  plannedQuantity: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

export const PlannedItemsRequestSchema = z.object({
  items: z.array(PlannedInventoryItemSchema).min(0),
  services: z.array(PlannedServiceItemSchema).optional(),
}).refine(
  (data) => (data.items?.length ?? 0) > 0 || (data.services?.length ?? 0) > 0,
  {
    message: 'At least one of items or services must be non-empty',
    path: ['items'],
  }
);

export type PlannedItemsRequest = z.infer<typeof PlannedItemsRequestSchema>;

/**
 * Parse and validate planned items request body.
 * Throws ValidationError if data is invalid.
 */
export function parsePlannedItemsRequest(body: unknown): PlannedItemsRequest {
  try {
    return PlannedItemsRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid planned items request');
    }
    throw new ValidationError('Failed to parse planned items request');
  }
}

// ============================================================================
// Usage Request Schema
// ============================================================================

const UsageItemSchema = z.object({
  inventoryItemId: z.number().int().positive(),
  quantityUsed: z.number().positive(),
  notes: z.string().optional(),
});

export const UsageRequestSchema = z.object({
  externalRef: z.string().uuid(),
  sourceFormKey: z.nativeEnum(SourceFormKey),
  items: z.array(UsageItemSchema).min(1),
  usedBy: z.string().uuid().optional(),
  usedAt: z.string().datetime().optional(),
});

export type UsageRequest = z.infer<typeof UsageRequestSchema>;

/**
 * Parse and validate usage request body.
 * Throws ValidationError if data is invalid.
 */
export function parseUsageRequest(body: unknown): UsageRequest {
  try {
    return UsageRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid usage request');
    }
    throw new ValidationError('Failed to parse usage request');
  }
}
