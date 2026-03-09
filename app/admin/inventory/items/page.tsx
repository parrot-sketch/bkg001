import db from '@/lib/db';
import { ItemsClient } from './_components/ItemsClient';

export const dynamic = 'force-dynamic';

export default async function InventoryItemsPage() {
    const items = await db.inventoryItem.findMany({
        orderBy: {
            name: 'asc'
        }
    });

    return (
        <div className="space-y-6">
            <ItemsClient initialItems={items} />
        </div>
    );
}
