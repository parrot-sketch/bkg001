import db from '@/lib/db';
import { ItemsClient } from './_components/ItemsClient';
import { serializeInventoryItem } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function InventoryItemsPage() {
    const items = await db.inventoryItem.findMany({
        orderBy: {
            name: 'asc'
        }
    });

    // Serialize Decimal fields for client component
    const serializedItems = items.map(item => serializeInventoryItem(item));

    return (
        <div className="space-y-6">
            <ItemsClient initialItems={serializedItems} />
        </div>
    );
}
