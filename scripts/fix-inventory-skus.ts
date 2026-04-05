import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Import centralized SKU prefix config instead of duplicating
// This ensures consistency across the entire codebase
import { getSkuPrefix } from '../lib/inventory/sku-prefixes';

async function fixInventoryData() {
  console.log('--- Inventory Data Fix & SKU Generation ---');

  // 1. Hard Delete items with invalid names
  // Using findMany first to log them
  const invalidItems = await prisma.inventoryItem.findMany({
    where: {
      OR: [
        { name: { equals: '' } },
        { name: { contains: ' ' } }, // We'll check for pure whitespace in the loop
      ],
    },
  });

  let deletedCount = 0;
  for (const item of invalidItems) {
    if (!item.name || item.name.trim() === '') {
      console.log(`Deleting invalid item ID ${item.id} (Name: "${item.name}")`);
      await prisma.inventoryItem.delete({ where: { id: item.id } });
      deletedCount++;
    }
  }
  console.log(`Cleaned up ${deletedCount} invalid items.`);

  // 2. Generate SKUs
  const itemsWithoutSku = await prisma.inventoryItem.findMany({
    where: {
      OR: [
        { sku: null },
        { sku: '' },
      ],
    },
  });

  console.log(`Generating SKUs for ${itemsWithoutSku.length} items...`);

  for (const item of itemsWithoutSku) {
    try {
      const prefix = getSkuPrefix(item.category as any);
      const paddedId = item.id.toString().padStart(5, '0');
      const newSku = `${prefix}-${paddedId}`;

      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { sku: newSku },
      });
      console.log(`Assigned SKU ${newSku} to item: ${item.name}`);
    } catch (error) {
      console.error(`Failed to generate SKU for item ${item.id}: ${error}`);
    }
  }

  console.log('--- Success ---');
}

fixInventoryData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
