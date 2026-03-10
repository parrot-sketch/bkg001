import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    const prefix = CATEGORY_PREFIXES[item.category] || 'GEN';
    const paddedId = item.id.toString().padStart(5, '0');
    const newSku = `${prefix}-${paddedId}`;

    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { sku: newSku },
    });
    console.log(`Assigned SKU ${newSku} to item: ${item.name}`);
  }

  console.log('--- Success ---');
}

fixInventoryData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
