import { PrismaClient, InventoryCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding demo medications...');

    const meds = [
        {
            name: 'Paracetamol',
            sku: 'MED-PARA-500',
            category: InventoryCategory.MEDICATION,
            description: 'Common analgesic and antipyretic',
            unit_of_measure: 'tablet',
            unit_cost: 5.0,
            quantity_on_hand: 500,
            reorder_point: 50,
            supplier: 'PharmaCore',
            is_billable: true,
            is_active: true,
        },
        {
            name: 'Ceftriaxone',
            sku: 'MED-CEFT-1G',
            category: InventoryCategory.MEDICATION,
            description: 'Antibiotic for peri-operative prophylaxis',
            unit_of_measure: 'vial',
            unit_cost: 250.0,
            quantity_on_hand: 100,
            reorder_point: 10,
            supplier: 'BioCare',
            is_billable: true,
            is_active: true,
        },
        {
            name: 'Propofol',
            sku: 'MED-PROP-10',
            category: InventoryCategory.MEDICATION,
            description: 'Induction agent',
            unit_of_measure: 'ampoule',
            unit_cost: 450.0,
            quantity_on_hand: 50,
            reorder_point: 5,
            supplier: 'MedSupply',
            is_billable: true,
            is_active: true,
        },
        {
            name: 'Lidocaine 2%',
            sku: 'MED-LIDO-2',
            category: InventoryCategory.MEDICATION,
            description: 'Local anesthetic',
            unit_of_measure: 'vial',
            unit_cost: 120.0,
            quantity_on_hand: 80,
            reorder_point: 10,
            supplier: 'LocalPharma',
            is_billable: true,
            is_active: true,
        },
    ];

    for (const med of meds) {
        await prisma.inventoryItem.upsert({
            where: { sku: med.sku },
            update: med,
            create: med,
        });
    }

    console.log('Demo medications seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
