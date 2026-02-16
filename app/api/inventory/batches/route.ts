import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/server-auth';

// Validation Schema for Receiving Stock
const receiveStockSchema = z.object({
    inventory_item_id: z.number().int(),
    batch_number: z.string().min(1, 'Batch number is required'),
    serial_number: z.string().optional(),
    expiry_date: z.string().datetime(), // Expect ISO string
    quantity: z.number().int().min(1),
    cost_per_unit: z.number().min(0),
    supplier: z.string().optional(),
    notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    const expiringSoon = searchParams.get('expiringSoon') === 'true';

    try {
        const whereClause: any = {};

        if (itemId) {
            whereClause.inventory_item_id = parseInt(itemId);
        }

        if (expiringSoon) {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            whereClause.expiry_date = {
                lte: thirtyDaysFromNow,
                gte: new Date(), // Generally want future expiries? Or past too? Let's say active stock
            };
            whereClause.quantity_remaining = { gt: 0 };
        }

        const batches = await db.inventoryBatch.findMany({
            where: whereClause,
            include: {
                inventory_item: {
                    select: {
                        name: true,
                        sku: true,
                        category: true,
                    },
                },
            },
            orderBy: {
                expiry_date: 'asc',
            },
        });

        return NextResponse.json(batches);
    } catch (error) {
        console.error('Error fetching batches:', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory batches' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user || !['ADMIN', 'DOCTOR', 'NURSE'].includes(user.role as string)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validatedData = receiveStockSchema.parse(body);

        // Transaction: Create Batch + Update Item Quantity
        const result = await db.$transaction(async (tx) => {
            // 1. Create Batch
            const batch = await tx.inventoryBatch.create({
                data: {
                    inventory_item_id: validatedData.inventory_item_id,
                    batch_number: validatedData.batch_number,
                    serial_number: validatedData.serial_number,
                    expiry_date: new Date(validatedData.expiry_date),
                    quantity_remaining: validatedData.quantity,
                    cost_per_unit: validatedData.cost_per_unit,
                    supplier: validatedData.supplier,
                    notes: validatedData.notes,
                },
            });

            // 2. Update Master Quantity on InventoryItem
            await tx.inventoryItem.update({
                where: { id: validatedData.inventory_item_id },
                data: {
                    quantity_on_hand: {
                        increment: validatedData.quantity,
                    },
                    // Optionally update last cost?
                    // unit_cost: validatedData.cost_per_unit 
                },
            });

            return batch;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation Error', details: error.errors }, { status: 400 });
        }
        console.error('Error receiving stock:', error);
        return NextResponse.json(
            { error: 'Failed to receive stock' },
            { status: 500 }
        );
    }
}
