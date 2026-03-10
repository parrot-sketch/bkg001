import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { z } from 'zod';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { inventoryModule } from '@/application/inventory-module';

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
    try {
        const authResult = await JwtMiddleware.authenticate(req);
        if (!authResult.success) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const itemId = searchParams.get('itemId');
        const expiringSoon = searchParams.get('expiringSoon') === 'true';

        const whereClause: any = {};

        if (itemId) {
            whereClause.inventory_item_id = parseInt(itemId);
        }

        if (expiringSoon) {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            whereClause.expiry_date = {
                lte: thirtyDaysFromNow,
                gte: new Date(),
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

        return NextResponse.json({ success: true, data: batches });
    } catch (error) {
        console.error('Error fetching batches:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch inventory batches' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const authResult = await JwtMiddleware.authenticate(req);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const allowedRoles = [Role.ADMIN, Role.STORES, Role.THEATER_TECHNICIAN];
        if (!allowedRoles.includes(authResult.user.role as Role)) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        const body = await req.json();
        const validatedData = receiveStockSchema.parse(body);

        // Transaction: Create Batch + Record Inventory Transaction
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

            // 2. Record Stock Movement Transaction via Service
            // Note: We use the service to ensure business rules (like generating logs) are followed.
            await inventoryModule.inventoryService.recordStockIn({
                inventoryItemId: validatedData.inventory_item_id,
                quantity: validatedData.quantity,
                unitPrice: validatedData.cost_per_unit,
                reference: `Batch: ${validatedData.batch_number}`,
                notes: validatedData.notes || 'Received via Batches API',
                createdById: authResult.user!.userId,
            });

            return batch;
        });

        return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Validation Error', details: error.errors }, { status: 400 });
        }
        console.error('Error receiving stock:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to receive stock' },
            { status: 500 }
        );
    }
}
