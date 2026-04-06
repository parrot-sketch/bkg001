/**
 * Inventory Validation Schemas
 * 
 * Comprehensive Zod schemas for inventory API validation:
 * - ItemQuerySchema: GET /api/inventory/items query parameters
 * - CreateItemSchema: POST /api/inventory/items request body
 * - UpdateItemSchema: PUT /api/inventory/items/:id request body
 * 
 * All schemas follow project conventions and include detailed error messages.
 */

import { z } from 'zod';
import { InventoryCategory } from '@/domain/enums/InventoryCategory';

// ============================================================================
// INVENTORY CATEGORY ENUM
// ============================================================================

export const InventoryCategorySchema = z.enum([
  InventoryCategory.IMPLANT,
  InventoryCategory.SUTURE,
  InventoryCategory.ANESTHETIC,
  InventoryCategory.MEDICATION,
  InventoryCategory.DISPOSABLE,
  InventoryCategory.INSTRUMENT,
  InventoryCategory.DRESSING,
  InventoryCategory.SPECIMEN_CONTAINER,
  InventoryCategory.OTHER,
]);

// ============================================================================
// GET QUERY PARAMETERS SCHEMA
// ============================================================================

/**
 * Schema for GET /api/inventory/items query parameters
 * 
 * Validates:
 * - page: positive integer, default 1
 * - limit: positive integer (1-100), default 20
 * - search: optional string, max 100 chars, trims whitespace
 * - category: optional InventoryCategory enum value
 * - low_stock_only: optional boolean (coerced from string)
 */
export const ItemQuerySchema = z.object({
  page: z.coerce.number().int('Page must be an integer').min(1, 'Page must be at least 1').catch(1).default(1),
  
  limit: z.coerce.number().int('Limit must be an integer').min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100 items per request').catch(20).default(20),
  
  search: z
    .string()
    .trim()
    .max(100, 'Search term must be at most 100 characters')
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
  
  category: InventoryCategorySchema
    .optional()
    .or(z.literal(''))
    .transform((val) => (val === '' ? undefined : val)),
  
  low_stock_only: z
    .coerce
    .boolean()
    .optional(),
});

export type ItemQuery = z.infer<typeof ItemQuerySchema>;

// ============================================================================
// CREATE ITEM SCHEMA
// ============================================================================

/**
 * Schema for POST /api/inventory/items request body
 * 
 * Validates item creation with required and optional fields:
 * - name: required, 1-255 chars
 * - sku: optional, unique, 1-255 chars
 * - category: optional, defaults to OTHER
 * - unit_of_measure: optional, defaults to "unit", 1-255 chars
 * - unit_cost: optional, non-negative, defaults to 0
 * - reorder_point: optional, non-negative int
 * - low_stock_threshold: optional, non-negative int
 * - description: optional, max 1000 chars
 * - supplier: optional, max 255 chars
 * - manufacturer: optional, max 255 chars
 * - is_billable: optional, boolean
 * - is_implant: optional, boolean
 */
export const CreateItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Item name is required')
    .max(255, 'Item name must be at most 255 characters'),
  
  sku: z
    .string()
    .min(1, 'SKU must be at least 1 character')
    .max(255, 'SKU must be at most 255 characters')
    .optional(),
  
  category: InventoryCategorySchema
    .optional(),
  
  unit_of_measure: z
    .string()
    .min(1, 'Unit of measure must be at least 1 character')
    .max(255, 'Unit of measure must be at most 255 characters')
    .default('unit'),
  
  unit_cost: z
    .number()
    .min(0, 'Unit cost cannot be negative')
    .default(0),
  
  reorder_point: z
    .number()
    .int('Reorder point must be an integer')
    .min(0, 'Reorder point cannot be negative')
    .optional()
    .default(0),
  
  low_stock_threshold: z
    .number()
    .int('Low stock threshold must be an integer')
    .min(0, 'Low stock threshold cannot be negative')
    .optional()
    .default(0),
  
  description: z
    .string()
    .max(1000, 'Description must be at most 1000 characters')
    .optional(),
  
  supplier: z
    .string()
    .max(255, 'Supplier name must be at most 255 characters')
    .optional(),
  
  manufacturer: z
    .string()
    .max(255, 'Manufacturer name must be at most 255 characters')
    .optional(),
  
  is_billable: z
    .boolean()
    .optional()
    .default(true),
  
  is_implant: z
    .boolean()
    .optional()
    .default(false),
});

export type CreateItem = z.infer<typeof CreateItemSchema>;

// ============================================================================
// UPDATE ITEM SCHEMA
// ============================================================================

/**
 * Schema for PUT /api/inventory/items/:id request body
 * 
 * Similar to CreateItemSchema but all fields are optional for partial updates.
 */
export const UpdateItemSchema = CreateItemSchema.partial();

export type UpdateItem = z.infer<typeof UpdateItemSchema>;

// ============================================================================
// VALIDATION ERROR RESPONSE HELPER
// ============================================================================

/**
 * Formats Zod validation errors into a structured response
 * 
 * Returns:
 * {
 *   success: false,
 *   error: "Validation failed",
 *   details: {
 *     fieldErrors: { field: [errors...] },
 *     formErrors: []
 *   }
 * }
 */
export function formatValidationError(zodError: z.ZodError) {
  return {
    success: false,
    error: 'Validation failed',
    details: zodError.flatten(),
  };
}

// ============================================================================
// TYPE HELPERS
// ============================================================================

/**
 * Extract valid category values as array for validation or type guards
 */
export function getValidCategories(): string[] {
  return Object.values(InventoryCategory);
}

/**
 * Check if a string is a valid category
 */
export function isValidCategory(value: string): value is InventoryCategory {
  return Object.values(InventoryCategory).includes(value as InventoryCategory);
}
