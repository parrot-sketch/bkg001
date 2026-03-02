/**
 * Inventory Planning Parsers
 * 
 * Zod schemas and parsers for inventory planning API requests/responses.
 * All parsers throw ValidationError on invalid data.
 */

import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';
import { SourceFormKey } from '@/application/services/InventoryConsumptionBillingService';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

// ============================================================================
// Planned Items Response
// ============================================================================

const PlannedItemSchema = z.object({
  id: z.number().int().positive(),
  inventoryItemId: z.number().int().positive(),
  itemName: z.string(),
  plannedQuantity: z.number().positive(),
  plannedUnitPrice: z.number().nonnegative(),
  notes: z.string().nullable(),
  isBillable: z.boolean(),
});

const PlannedServiceSchema = z.object({
  id: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  serviceName: z.string(),
  plannedQuantity: z.number().int().positive(),
  plannedUnitPrice: z.number().nonnegative(),
  notes: z.string().nullable(),
});

const CostEstimateSchema = z.object({
  billableTotal: z.number().nonnegative(),
  nonBillableTotal: z.number().nonnegative(),
  serviceTotal: z.number().nonnegative(),
  grandTotal: z.number().nonnegative(),
});

export const PlannedItemsResponseSchema = z.object({
  plannedItems: z.array(PlannedItemSchema),
  plannedServices: z.array(PlannedServiceSchema),
  costEstimate: CostEstimateSchema,
}).strict();

export type PlannedItemsResponse = z.infer<typeof PlannedItemsResponseSchema>;

/**
 * Parse and validate planned items response.
 * Throws ValidationError if invalid.
 */
export function parsePlannedItemsResponse(data: unknown): PlannedItemsResponse {
  try {
    return PlannedItemsResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid planned items response');
    }
    throw error;
  }
}

// ============================================================================
// Replace Planned Items Request
// ============================================================================

const PlannedInventoryItemRequestSchema = z.object({
  inventoryItemId: z.number().int().positive(),
  plannedQuantity: z.number().positive(),
  notes: z.string().optional(),
});

const PlannedServiceItemRequestSchema = z.object({
  serviceId: z.number().int().positive(),
  plannedQuantity: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

export const ReplacePlannedItemsRequestSchema = z.object({
  items: z.array(PlannedInventoryItemRequestSchema).min(0),
  services: z.array(PlannedServiceItemRequestSchema).optional(),
}).refine(
  (data) => (data.items?.length ?? 0) > 0 || (data.services?.length ?? 0) > 0,
  {
    message: 'At least one of items or services must be non-empty',
    path: ['items'],
  }
);

export type ReplacePlannedItemsRequest = z.infer<typeof ReplacePlannedItemsRequestSchema>;

/**
 * Parse and validate replace planned items request.
 * Throws ValidationError if invalid.
 */
export function parseReplacePlannedItemsRequest(body: unknown): ReplacePlannedItemsRequest {
  try {
    return ReplacePlannedItemsRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid replace planned items request');
    }
    throw error;
  }
}

// ============================================================================
// Usage Variance Response
// ============================================================================

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

const PlannedItemDetailSchema = z.object({
  id: z.number().int().positive(),
  inventoryItemId: z.number().int().positive().nullable(),
  itemName: z.string(),
  plannedQuantity: z.number().nonnegative(),
  plannedUnitPrice: z.number().nonnegative(),
  plannedTotalCost: z.number().nonnegative(),
  notes: z.string().nullable(),
});

const UsedItemDetailSchema = z.object({
  id: z.number().int().positive(),
  inventoryItemId: z.number().int().positive(),
  itemName: z.string(),
  quantityUsed: z.number().positive(),
  unitCostAtTime: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  usedAt: z.string(),
  sourceFormKey: z.string(),
});

export const UsageVarianceResponseSchema = z.object({
  plannedItems: z.array(PlannedItemDetailSchema),
  usedItems: z.array(UsedItemDetailSchema),
  variance: z.array(VarianceItemSchema),
  plannedTotalCost: z.number().nonnegative(),
  actualBilledCost: z.number().nonnegative(),
  varianceTotal: z.number(),
}).strict();

export type UsageVarianceResponse = z.infer<typeof UsageVarianceResponseSchema>;

/**
 * Parse and validate usage variance response.
 * Throws ValidationError if invalid.
 */
export function parseUsageVarianceResponse(data: unknown): UsageVarianceResponse {
  try {
    return UsageVarianceResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid usage variance response');
    }
    throw error;
  }
}

// ============================================================================
// Consume From Plan Request
// ============================================================================

const ConsumeItemSchema = z.object({
  inventoryItemId: z.number().int().positive(),
  quantityUsed: z.number().positive(),
  notes: z.string().optional(),
});

export const ConsumeFromPlanRequestSchema = z.object({
  externalRef: z.string().uuid(),
  sourceFormKey: z.nativeEnum(SourceFormKey),
  items: z.array(ConsumeItemSchema).length(1), // Single-item invariant
  usedBy: z.string().uuid().optional(),
  usedAt: z.string().datetime().optional(),
}).strict();

export type ConsumeFromPlanRequest = z.infer<typeof ConsumeFromPlanRequestSchema>;

/**
 * Parse and validate consume from plan request.
 * Throws ValidationError if invalid.
 */
export function parseConsumeFromPlanRequest(body: unknown): ConsumeFromPlanRequest {
  try {
    return ConsumeFromPlanRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid consume from plan request');
    }
    throw error;
  }
}

// ============================================================================
// Inventory Items Response (minimal subset for selector)
// ============================================================================

const InventoryItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  sku: z.string().nullable(),
  category: z.nativeEnum(InventoryCategory),
  description: z.string().nullable(),
  unitOfMeasure: z.string(),
  unitCost: z.number().nonnegative(),
  quantityOnHand: z.number().nonnegative(),
  reorderPoint: z.number().nonnegative(),
  supplier: z.string().nullable(),
  manufacturer: z.string().nullable(),
  isActive: z.boolean(),
  isBillable: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const PaginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalCount: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const InventoryItemsResponseSchema = z.object({
  data: z.array(InventoryItemSchema),
  pagination: PaginationSchema,
}).strict();

export type InventoryItemsResponse = z.infer<typeof InventoryItemsResponseSchema>;

/**
 * Parse and validate inventory items response.
 * Throws ValidationError if invalid.
 */
export function parseInventoryItemsResponse(data: unknown): InventoryItemsResponse {
  try {
    return InventoryItemsResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid inventory items response');
    }
    throw error;
  }
}
