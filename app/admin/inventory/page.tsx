import db from '@/lib/db';
import { InventoryDashboard } from './_components/InventoryDashboard';
import { inventoryModule } from '@/application/inventory-module';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
    // 1. Fetch Aggregated Summary (Derived Balances)
    // 2. Fetch Detailed Batches (For lifecycle tracking)
    // 3. Fetch Master Catalog Items (For select dropdowns)
    
    const [summary, batches, items] = await Promise.all([
        inventoryModule.inventoryService.getDashboardSummary(),
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
            <InventoryDashboard
                summary={summary}
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
