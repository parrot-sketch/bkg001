import { PrismaClient, InventoryCategory } from '@prisma/client';

const db = new PrismaClient();

const CATEGORY_PREFIXES: Record<string, string> = {
  IMPLANT: 'IMP',
  SUTURE: 'SUT',
  ANESTHETIC: 'ANS',
  MEDICATION: 'MED',
  DISPOSABLE: 'DSP',
  INSTRUMENT: 'INS',
  DRESSING: 'DRS',
  OTHER: 'OTH',
};

async function generateSkus() {
  const items = await db.inventoryItem.findMany({ where: { sku: null } });
  console.log(`Found ${items.length} items without SKU`);

  let count = 0;
  for (const item of items) {
    const prefix = CATEGORY_PREFIXES[item.category] || 'GEN';
    const paddedId = item.id.toString().padStart(5, '0');
    const sku = `${prefix}-${paddedId}`;
    
    await db.inventoryItem.update({
      where: { id: item.id },
      data: { sku }
    });
    console.log(`  ${sku} - ${item.name}`);
    count++;
  }

  console.log(`Updated ${count} items with SKUs`);
  await db.$disconnect();
}

generateSkus();
