import db from '@/lib/db';
import { InventoryDashboard } from './_components/InventoryDashboard';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
    // Parallel Data Fetching
    const [batches, items] = await Promise.all([
        db.inventoryBatch.findMany({
            where: {
                quantity_remaining: { gt: 0 } // Only show active stock by default?
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

    // Transform Category Enum to string if needed, but Prisma types should align mostly.
    // The client component expects 'string' for category.

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Inventory Management</h2>
                <p className="text-muted-foreground">
                    Track high-value implants, monitor expiry dates, and manage stock levels.
                </p>
            </div>

            <InventoryDashboard
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
