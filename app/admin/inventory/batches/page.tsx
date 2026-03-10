import db from '@/lib/db';
import { BatchesClient } from './_components/BatchesClient';

export const dynamic = 'force-dynamic';

export default async function InventoryBatchesPage() {
    const [batches, items] = await Promise.all([
        db.inventoryBatch.findMany({
            where: {
                quantity_remaining: { gt: 0 }
            },
            include: {
                inventory_item: {
                    select: {
                        name: true,
                        sku: true,
                        category: true,
                        is_implant: true,
                    }
                }
            },
            orderBy: {
                expiry_date: 'asc'
            }
        }),
        db.inventoryItem.findMany({
            where: {
                is_active: true
            },
            select: {
                id: true,
                name: true,
                sku: true,
                category: true,
                is_implant: true,
            },
            orderBy: {
                name: 'asc'
            }
        })
    ]);

    return (
        <div className="space-y-6">
            <BatchesClient 
                initialBatches={batches.map(b => ({
                    ...b,
                    inventory_item: {
                        ...b.inventory_item,
                        category: b.inventory_item.category.toString()
                    }
                }))}
                inventoryItems={items.map(i => ({
                    ...i,
                    category: i.category.toString()
                }))} 
            />
        </div>
    );
}
