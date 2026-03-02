/**
 * Zod parsers for Purchase Order API requests
 */

import { z } from 'zod';
import { ValidationError } from '@/application/errors/ValidationError';

export const CreatePurchaseOrderSchema = z.object({
  vendorId: z.string().uuid('Invalid vendor ID format'),
  items: z
    .array(
      z.object({
        inventoryItemId: z.number().int().positive().optional(),
        itemName: z.string().min(1, 'Item name is required').max(255),
        quantityOrdered: z.number().int().positive('Quantity must be positive'),
        unitPrice: z.number().nonnegative('Unit price must be non-negative'),
        notes: z.string().optional(),
      })
    )
    .min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

export const SubmitPurchaseOrderSchema = z.object({
  notes: z.string().optional(),
});

export function parseCreatePurchaseOrderRequest(body: unknown) {
  try {
    return CreatePurchaseOrderSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid purchase order creation request');
    }
    throw error;
  }
}

export function parseSubmitPurchaseOrderRequest(body: unknown) {
  try {
    return SubmitPurchaseOrderSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ValidationError.fromZodError(error, 'Invalid purchase order submission request');
    }
    throw error;
  }
}
