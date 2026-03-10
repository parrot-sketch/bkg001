import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('--- Starting Inventory Cleanup ---');

  // 1. Identify and delete invalid products
  // Invalid if name is null, empty, or just whitespace
  const invalidProducts = await prisma.inventoryItem.findMany({
    where: {
      OR: [
        { name: '' },
        { name: { equals: undefined } as any },
      ],
    },
  });

  console.log(`Found ${invalidProducts.length} invalid products to remove.`);
  
  for (const product of invalidProducts) {
    await prisma.inventoryItem.delete({
      where: { id: product.id },
    });
  }

  // 2. Normalize Names and SKUs
  const allProducts = await prisma.inventoryItem.findMany();
  console.log(`Normalizing ${allProducts.length} products...`);

  for (const product of allProducts) {
    const trimmedName = product.name.trim();
    const trimmedSku = product.sku?.trim() || null;

    if (trimmedName !== product.name || trimmedSku !== product.sku) {
      await prisma.inventoryItem.update({
        where: { id: product.id },
        data: {
          name: trimmedName,
          sku: trimmedSku,
        },
      });
    }
  }

  console.log('--- Cleanup Complete ---');
}

cleanup()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
