/**
 * SKU Prefix Configuration
 * 
 * Centralized mapping of InventoryCategory values to their SKU prefixes.
 * This is the single source of truth for category-to-prefix mappings.
 * 
 * SKU Format: {CATEGORY_PREFIX}-{TIMESTAMP_BASE36}-{RANDOM_SUFFIX}
 * Example: IMP-LX4K-A3F2
 * 
 * Adding a new inventory category requires:
 * 1. Add the category to domain/enums/InventoryCategory.ts
 * 2. Add mapping here in CATEGORY_SKU_PREFIXES
 * 3. TypeScript strict mode will error if mapping is incomplete
 */

import { InventoryCategory } from '@/domain/enums/InventoryCategory';

/**
 * Mapping of each inventory category to its unique SKU prefix (3 chars).
 * 
 * Type enforcement: Record<InventoryCategory, string> ensures that when
 * a new category is added to the InventoryCategory enum, this record
 * must be updated or TypeScript will error.
 */
export const CATEGORY_SKU_PREFIXES: Record<InventoryCategory, string> = {
  IMPLANT: 'IMP',
  SUTURE: 'SUT',
  ANESTHETIC: 'ANS',
  MEDICATION: 'MED',
  DISPOSABLE: 'DSP',
  INSTRUMENT: 'INS',
  DRESSING: 'DRS',
  SPECIMEN_CONTAINER: 'SPC',
  OTHER: 'OTH',
};

/**
 * Retrieves the SKU prefix for a given inventory category.
 * 
 * @param category - The InventoryCategory enum value
 * @returns The 3-character SKU prefix for the category
 * @throws Error if the category has no configured prefix
 * 
 * @example
 * const prefix = getSkuPrefix(InventoryCategory.IMPLANT); // Returns 'IMP'
 */
export function getSkuPrefix(category: InventoryCategory): string {
  const prefix = CATEGORY_SKU_PREFIXES[category];

  if (!prefix) {
    throw new Error(
      `SKU prefix not configured for category: ${category}. ` +
      `Please add the mapping to CATEGORY_SKU_PREFIXES in lib/inventory/sku-prefixes.ts`
    );
  }

  return prefix;
}

/**
 * Gets all configured SKU prefixes as an array of tuples.
 * Useful for validation, logging, or documentation.
 * 
 * @returns Array of [category, prefix] tuples
 * 
 * @example
 * const allPrefixes = getAllSkuPrefixes();
 * // Returns: [['IMPLANT', 'IMP'], ['SUTURE', 'SUT'], ...]
 */
export function getAllSkuPrefixes(): Array<[InventoryCategory, string]> {
  return Object.entries(CATEGORY_SKU_PREFIXES) as Array<[InventoryCategory, string]>;
}

/**
 * Checks if a category has a configured SKU prefix.
 * 
 * @param category - The category to check
 * @returns true if the category has a prefix, false otherwise
 * 
 * @example
 * if (hasSkuPrefix(InventoryCategory.IMPLANT)) {
 *   // Safe to generate SKU
 * }
 */
export function hasSkuPrefix(category: InventoryCategory): boolean {
  return category in CATEGORY_SKU_PREFIXES && Boolean(CATEGORY_SKU_PREFIXES[category]);
}
