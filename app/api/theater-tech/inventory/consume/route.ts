import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate with JwtMiddleware
        const authResult = await JwtMiddleware.authenticate(req);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const userRole = authResult.user.role as Role;
        const allowedRoles = [Role.THEATER_TECHNICIAN, Role.ADMIN];
        if (!allowedRoles.includes(userRole)) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        const userId = authResult.user.userId;

        const body = await req.json();
        const { caseId, consumptions } = body;

        if (!caseId || !Array.isArray(consumptions) || consumptions.length === 0) {
            return NextResponse.json({ success: false, error: 'Invalid payload: caseId and consumptions array required' }, { status: 400 });
        }

        // 2. Validate the case exists
        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: caseId },
            include: { 
                patient: true,
            }
        });

        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Surgical case not found' }, { status: 404 });
        }

        const patientId = surgicalCase.patient_id;
        // In the updated schema, surgical case does not have an appointment_id
        // So we will no longer use it here.

        // 3. Perform inventory decrement and billing atomically
        await db.$transaction(async (tx) => {
            // Ensure a SURGERY payment record exists for this case
            let payment = await tx.payment.findUnique({
                where: { surgical_case_id: caseId }
            });

            if (!payment) {
                payment = await tx.payment.create({
                    data: {
                        patient_id: patientId,
                        surgical_case_id: caseId,
                        bill_type: 'SURGERY',
                        bill_date: new Date(),
                        total_amount: 0,
                        discount: 0,
                        amount_paid: 0,
                        payment_method: 'CASH',
                        status: 'UNPAID',
                        notes: 'Automatically created for theater consumption'
                    }
                });
            }

            let additionalTotalAmount = 0;

            for (const item of consumptions) {
                const { inventoryItemId, batchId, quantityUsed, notes } = item;
                
                // Validate Batch and Quantity
                const batch = await tx.inventoryBatch.findUnique({
                    where: { id: batchId },
                    include: { inventory_item: true }
                });

                if (!batch || batch.inventory_item_id !== inventoryItemId) {
                    throw new Error(`Invalid batch configuration for item ID: ${inventoryItemId}`);
                }

                if (batch.quantity_remaining < quantityUsed) {
                    throw new Error(`Insufficient stock in Batch ${batch.batch_number} for ${batch.inventory_item.name}`);
                }

                await tx.inventoryBatch.update({
                    where: { id: batch.id },
                    data: {
                        quantity_remaining: { decrement: quantityUsed }
                    }
                });

                // Removed `quantity_on_hand` logic for `inventoryItem` because it is no longer in the schema.

                // Determine if billable and resolve service
                // For Phase 3.5, we'll try to find a service matched by the inventory item ID if mapped,
                // or fall back to looking at CasePlanPlannedItems for the mapping.
                // NOTE: If no direct service link, we only log usage without billing item for now.
                
                const plannedItem = await tx.casePlanPlannedItem.findFirst({
                    where: {
                        case_plan: { surgical_case: { id: caseId } },
                        inventory_item_id: inventoryItemId
                    },
                    include: { service: true }
                });

                let billItemId: number | null = null;
                if (batch.inventory_item.is_billable && plannedItem?.service_id) {
                    const unitPrice = plannedItem.planned_unit_price || plannedItem.service?.price || 0;
                    const totalCost = unitPrice * quantityUsed;

                    const billItem = await tx.patientBill.create({
                        data: {
                            payment_id: payment.id,
                            service_id: plannedItem.service_id,
                            service_date: new Date(),
                            quantity: quantityUsed,
                            unit_cost: unitPrice,
                            total_cost: totalCost,
                        }
                    });
                    billItemId = billItem.id;
                    additionalTotalAmount += totalCost;
                }

                // Log Inventory Usage
                await tx.inventoryUsage.create({
                    data: {
                        inventory_item_id: inventoryItemId,
                        inventory_batch_id: batch.id,
                        surgical_case_id: caseId,
                        quantity_used: quantityUsed,
                        unit_cost_at_time: batch.cost_per_unit || 0,
                        total_cost: (batch.cost_per_unit || 0) * quantityUsed,
                        recorded_by: userId,
                        notes: notes || 'Logged via Theater Tech Picklist',
                        bill_item_id: billItemId,
                        used_at: new Date(),
                        used_by_user_id: userId,
                    }
                });
            }

            // Update payment total
            if (additionalTotalAmount > 0) {
                await tx.payment.update({
                    where: { id: payment.id },
                    data: {
                        total_amount: { increment: additionalTotalAmount }
                    }
                });
            }
        });

        return NextResponse.json({ success: true, message: 'Consumption logged successfully' }, { status: 200 });

    } catch (error: any) {
        console.error('Inventory Consumption Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to log consumption' },
            { status: 500 }
        );
    }
}
