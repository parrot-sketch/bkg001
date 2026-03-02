/**
 * Used Items Tab Parsers
 * 
 * Zod schemas and parsers for used items API responses.
 * All parsers throw ValidationError on invalid data.
 */

import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';
import { SourceFormKey } from '@/application/services/InventoryConsumptionBillingService';

// ============================================================================
// Used Items Response Schema
// ============================================================================

const BillItemSchema = z.object({
  id: z.number().int().positive(),
  serviceId: z.number().int().positive().nullable(),
  serviceName: z.string(),
  serviceDate: z.string().datetime().nullable(),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  inventoryUsage: z.object({
    id: z.number().int().positive(),
    inventoryItemId: z.number().int().positive(),
    itemName: z.string(),
    quantityUsed: z.number().positive(),
  }).nullable(),
});

const UsageSummarySchema = z.object({
  totalItemsUsed: z.number().int().nonnegative(),
  totalBillableCost: z.number().nonnegative(),
  totalNonBillableCost: z.number().nonnegative(),
  byCategory: z.record(z.object({
    count: z.number().int().nonnegative(),
    billableCost: z.number().nonnegative(),
    nonBillableCost: z.number().nonnegative(),
  })),
});

export const UsedItemsResponseSchema = z.object({
  payment: z.object({
    id: z.number().int().positive(),
    patientId: z.string().uuid(),
    surgicalCaseId: z.string().uuid(),
    billDate: z.string().datetime().nullable(),
    paymentDate: z.string().datetime().nullable(),
    totalAmount: z.number().nonnegative(),
    discount: z.number().nonnegative(),
    amountPaid: z.number().nonnegative(),
    status: z.string(),
    paymentMethod: z.string().nullable(),
  }).nullable(),
  billItems: z.array(BillItemSchema),
  usageSummary: UsageSummarySchema,
});

export type UsedItemsResponseDto = z.infer<typeof UsedItemsResponseSchema>;

/**
 * Parse and validate used items response.
 * Throws ValidationError if invalid.
 */
export function parseUsedItemsResponse(data: unknown): UsedItemsResponseDto {
  try {
    return UsedItemsResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid used items response');
    }
    throw error;
  }
}
