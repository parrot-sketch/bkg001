// Default placeholder for Batches page
import db from '@/lib/db';
import { BatchesClient } from './_components/BatchesClient';

export const dynamic = 'force-dynamic';

export default async function InventoryBatchesPage() {
    const batches = await db.inventoryBatch.findMany({
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
    });

    return (
        <div className="space-y-6">
            <BatchesClient initialBatches={batches} />
        </div>
    );
}
