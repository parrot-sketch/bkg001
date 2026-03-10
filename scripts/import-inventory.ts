import fs from 'fs';
import path from 'path';
import { PrismaClient, InventoryCategory, PriceType } from '@prisma/client';

const db = new PrismaClient();

async function importData() {
    try {
        console.log('Starting import process...');
        const jsonPath = '/tmp/excel-data.json';
        
        if (!fs.existsSync(jsonPath)) {
            console.error(`File not found: ${jsonPath}`);
            process.exit(1);
        }

        const rawData = fs.readFileSync(jsonPath, 'utf8');
        const data = JSON.parse(rawData);

        console.log(`Parsed JSON: ${data.inventory.length} inventory items, ${data.services.length} services`);

        // 1. Import Inventory items (from STOCK CARD)
        let inventorySuccess = 0;
        let inventoryErrors = 0;
        for (const item of data.inventory) {
            try {
                // Since there's no unique SKU or name constraint in the schema according to our check,
                // we'll use findFirst + create to avoid duplicates.
                // However, name is indexed.
                let existingItem = await db.inventoryItem.findFirst({
                    where: { name: item.name }
                });

                if (existingItem) {
                    await db.inventoryItem.update({
                        where: { id: existingItem.id },
                        data: {
                            unit_cost: item.unit_cost,
                            supplier: item.supplier,
                        }
                    });
                } else {
                    await db.inventoryItem.create({
                        data: {
                            name: item.name,
                            unit_of_measure: item.unit_of_measure,
                            unit_cost: item.unit_cost,
                            supplier: item.supplier,
                            is_billable: item.is_billable,
                            is_active: item.is_active,
                            category: InventoryCategory.OTHER,
                        }
                    });
                }
                inventorySuccess++;
            } catch (err: any) {
                console.error(`Failed to import inventory item ${item.name}: ${err.message}`);
                inventoryErrors++;
            }
        }

        // 2. Import Services (from PRICELIST)
        let serviceSuccess = 0;
        let serviceErrors = 0;
        for (const service of data.services) {
            try {
                let existingService = await db.service.findFirst({
                    where: { service_name: service.service_name }
                });

                if (existingService) {
                    await db.service.update({
                        where: { id: existingService.id },
                        data: {
                            price: service.price,
                            is_active: service.is_active,
                        }
                    });
                } else {
                    await db.service.create({
                        data: {
                            service_name: service.service_name,
                            price: service.price,
                            category: service.category,
                            price_type: PriceType.FIXED,
                            is_active: service.is_active,
                        }
                    });
                }
                serviceSuccess++;
            } catch (err: any) {
                console.error(`Failed to import service ${service.service_name}: ${err.message}`);
                serviceErrors++;
            }
        }

        console.log('\n--- Import Summary ---');
        console.log(`Inventory Items : ${inventorySuccess} imported/updated, ${inventoryErrors} failed.`);
        console.log(`Services        : ${serviceSuccess} imported/updated, ${serviceErrors} failed.`);
        
    } catch (err: any) {
        console.error('Fatal error during import:', err);
    } finally {
        await db.$disconnect();
    }
}

importData();
