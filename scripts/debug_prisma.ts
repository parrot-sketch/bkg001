import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking InventoryItem fields...');
    const items = await prisma.inventoryItem.findMany({
        where: {
            OR: [
                { name: { contains: 'test' } },
                // @ts-ignore
                { manufacturer: { contains: 'test' } }
            ]
        },
        take: 1
    });
    console.log('Success if no runtime error. Count:', items.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
