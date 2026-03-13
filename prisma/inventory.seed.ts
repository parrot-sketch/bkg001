/**
 * Prisma Inventory Seed Script
 * 
 * Seeds inventory using the data from infrastructure/database/seeds/data/inventory.catalogue.ts
 * This replaces the old/uncategorized data with the properly organized inventory catalogue.
 * 
 * Run with: npx tsx prisma/inventory.seed.ts
 */

import { PrismaClient, InventoryCategory } from '@prisma/client';
import { CATEGORIES, ITEMS, ItemSeedData } from '../infrastructure/database/seeds/data/inventory.catalogue';

const prisma = new PrismaClient();

// Map TypeORM category codes to Prisma InventoryCategory enum
const CATEGORY_MAP: Record<string, InventoryCategory> = {
  'ANAES': InventoryCategory.ANESTHETIC,
  'IVMED': InventoryCategory.MEDICATION,
  'IVFLU': InventoryCategory.MEDICATION,
  'GAS': InventoryCategory.DISPOSABLE,
  'SUTR': InventoryCategory.SUTURE,
  'DRESS': InventoryCategory.DRESSING,
  'THCON': InventoryCategory.DISPOSABLE,
  'AIRWY': InventoryCategory.DISPOSABLE,
  'IVACC': InventoryCategory.DISPOSABLE,
  'CATH': InventoryCategory.DISPOSABLE,
  'BANDT': InventoryCategory.DRESSING,
  'IMPL': InventoryCategory.IMPLANT,
  'DIAGN': InventoryCategory.DISPOSABLE,
  'STERL': InventoryCategory.DISPOSABLE,
  'SVC': InventoryCategory.OTHER,
};

async function main() {
  console.log('[SEED] Starting inventory seed...');

  // First, clear existing inventory items
  console.log('[SEED] Clearing existing inventory items...');
  await prisma.inventoryItem.deleteMany({});
  console.log('[SEED] Existing items cleared.');

  // Map items to Prisma format
  const itemsToCreate = ITEMS.map((item: ItemSeedData) => {
    const category = CATEGORY_MAP[item.categoryCode] || InventoryCategory.OTHER;
    
    return {
      name: item.name,
      sku: item.itemCode,
      category: category,
      description: null,
      unit_of_measure: item.unit,
      unit_cost: item.sellingPrice, // Using selling price as unit cost for now
      reorder_point: item.reorderPoint,
      low_stock_threshold: item.minimumStock,
      supplier: null,
      is_active: true,
      is_billable: item.sellingPrice > 0,
      is_implant: item.itemType === 'IMPLANT',
      manufacturer: null,
    };
  });

  console.log(`[SEED] Seeding ${itemsToCreate.length} inventory items...`);

  // Create items in batches for better performance
  const batchSize = 50;
  let created = 0;
  
  for (let i = 0; i < itemsToCreate.length; i += batchSize) {
    const batch = itemsToCreate.slice(i, i + batchSize);
    await prisma.inventoryItem.createMany({
      data: batch,
    });
    created += batch.length;
    console.log(`[SEED] Created ${created}/${itemsToCreate.length} items...`);
  }

  console.log(`[SEED] Successfully seeded ${itemsToCreate.length} inventory items!`);

  // Print category summary
  const categorySummary = await prisma.inventoryItem.groupBy({
    by: ['category'],
    _count: { id: true },
  });

  console.log('\n[SEED] Inventory by Category:');
  for (const cat of categorySummary) {
    console.log(`  ${cat.category}: ${cat._count.id} items`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('[SEED] Done!');
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('[SEED] Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
