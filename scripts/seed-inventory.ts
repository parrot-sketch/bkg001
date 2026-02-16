import { PrismaClient, InventoryCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Inventory Items...');

  const items = [
    // Implants (Tracked by Batch)
    {
      name: 'Motiva Ergonomix 275cc',
      sku: 'MOT-ERG-275',
      category: InventoryCategory.IMPLANT,
      unit_of_measure: 'unit',
      unit_cost: 65000,
      quantity_on_hand: 0,
      reorder_point: 4,
      is_active: true,
      is_implant: true,
      supplier: 'Motiva Kenya',
    },
    {
      name: 'Motiva Ergonomix 300cc',
      sku: 'MOT-ERG-300',
      category: InventoryCategory.IMPLANT,
      unit_of_measure: 'unit',
      unit_cost: 65000,
      quantity_on_hand: 0,
      reorder_point: 4,
      is_active: true,
      is_implant: true,
      supplier: 'Motiva Kenya',
    },
    {
      name: 'Motiva Ergonomix 325cc',
      sku: 'MOT-ERG-325',
      category: InventoryCategory.IMPLANT,
      unit_of_measure: 'unit',
      unit_cost: 65000,
      quantity_on_hand: 0,
      reorder_point: 4,
      is_active: true,
      is_implant: true,
      supplier: 'Motiva Kenya',
    },
    // Consumables (No Batch Tracking usually, but system supports it if desired)
    {
      name: 'Vicryl 3-0 Suture',
      sku: 'ETH-VIC-30',
      category: InventoryCategory.SUTURE,
      unit_of_measure: 'box',
      unit_cost: 4500,
      quantity_on_hand: 10,
      reorder_point: 5,
      is_active: true,
      is_implant: false,
      supplier: 'Ethicon',
    },
    {
      name: 'Lidocaine 2% + Adrenaline',
      sku: 'MED-LIDO-ADR',
      category: InventoryCategory.ANESTHETIC,
      unit_of_measure: 'vial',
      unit_cost: 350,
      quantity_on_hand: 50,
      reorder_point: 20,
      is_active: true,
      is_implant: false,
      supplier: 'Harleys',
    },
  ];

  for (const item of items) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      update: {},
      create: item,
    });
  }

  console.log('✅ Inventory Items Seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
