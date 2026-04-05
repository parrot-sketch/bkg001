import { PrismaClient, InventoryCategory } from '@prisma/client';
// Import centralized SKU prefix config instead of duplicating
import { getSkuPrefix } from '../lib/inventory/sku-prefixes';

const db = new PrismaClient();

async function generateSkus() {
  const items = await db.inventoryItem.findMany({ where: { sku: null } });
  console.log(`Found ${items.length} items without SKU`);

  let count = 0;
  for (const item of items) {
    try {
      const prefix = getSkuPrefix(item.category as any);
      const paddedId = item.id.toString().padStart(5, '0');
      const sku = `${prefix}-${paddedId}`;
      
      await db.inventoryItem.update({
        where: { id: item.id },
        data: { sku }
      });
      console.log(`  ${sku} - ${item.name}`);
      count++;
    } catch (error) {
      console.error(`Failed to generate SKU for item ${item.id}: ${error}`);
    }
  }

  console.log(`Updated ${count} items with SKUs`);
  await db.$disconnect();
}

generateSkus();
