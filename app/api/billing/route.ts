/**
 * Unified Billing API
 * 
 * RESTful API for all billing operations.
 * Uses modular billing services.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import { BillingService, BillingSource } from '@/application/services/BillingService';
import { theaterFeeService } from '@/application/services/TheaterFeeService';
import db from '@/lib/db';

const billingService = new BillingService();

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const userRole = authResult.user.role as Role;
        const allowedRoles = [Role.DOCTOR, Role.NURSE, Role.FRONTDESK, Role.ADMIN];
        if (!allowedRoles.includes(userRole)) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }

        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
        }

        const { action } = body;

        switch (action) {
            case 'create': {
                const { patientId, sourceType, sourceId, lineItems, discount, notes } = body;
                if (!patientId || !sourceType || !lineItems?.length) {
                    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
                }
                const result = await billingService.create({ patientId, source: sourceType, sourceId, lineItems, discount, notes });
                return NextResponse.json({ success: true, data: result });
            }

            case 'update': {
                const { billingId, lineItems, discount, notes } = body;
                if (!billingId) {
                    return NextResponse.json({ success: false, error: 'Missing billingId' }, { status: 400 });
                }
                const result = await billingService.update({ billingId, lineItems, discount, notes });
                return NextResponse.json({ success: true, data: result });
            }

            case 'record-payment': {
                const { billingId, amountPaid, paymentMethod } = body;
                if (!billingId || !amountPaid || !paymentMethod) {
                    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
                }
                const result = await billingService.recordPayment({ billingId, amountPaid, paymentMethod });
                return NextResponse.json({ success: true, data: result });
            }

            case 'calculate-theater-fee': {
                const { surgicalCaseId } = body;
                if (!surgicalCaseId) {
                    return NextResponse.json({ success: false, error: 'Missing surgicalCaseId' }, { status: 400 });
                }
                const result = await theaterFeeService.calculate(surgicalCaseId);
                return NextResponse.json({ success: true, data: result });
            }

            case 'add-inventory-to-billing': {
                const { surgicalCaseId, billingId } = body;
                if (!surgicalCaseId || !billingId) {
                    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
                }
                // Get unbilled inventory and add to billing
                const inventoryUsage = await db.inventoryUsage.findMany({
                    where: { surgical_case_id: surgicalCaseId, bill_item_id: null },
                    include: { inventory_item: true },
                });
                const billableItems = inventoryUsage.filter(u => u.inventory_item?.is_billable);
                if (billableItems.length === 0) {
                    return NextResponse.json({ success: true, data: { message: 'No unbilled inventory items' } });
                }
                const totalInventoryCost = billableItems.reduce((sum, u) => sum + u.total_cost, 0);
                // Update payment total
                await db.payment.update({
                    where: { id: billingId },
                    data: { total_amount: { increment: totalInventoryCost } },
                });
                return NextResponse.json({ success: true, data: { itemsAdded: billableItems.length, totalCost: totalInventoryCost } });
            }

            default:
                return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (error) {
        console.error('[API] Billing POST - Error:', error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Internal error' }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const authResult = await JwtMiddleware.authenticate(request);
        if (!authResult.success || !authResult.user) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const billingId = searchParams.get('billingId');
        const patientId = searchParams.get('patientId');
        const summary = searchParams.get('summary') === 'true';
        const status = searchParams.get('status') as any;

        if (summary) {
            const result = await billingService.getSummary(status ? { status } : undefined);
            return NextResponse.json({ success: true, data: result });
        }

        if (billingId) {
            const id = parseInt(billingId, 10);
            if (isNaN(id)) return NextResponse.json({ success: false, error: 'Invalid billingId' }, { status: 400 });
            const result = await billingService.getById(id);
            return NextResponse.json({ success: true, data: result });
        }

        if (patientId) {
            const result = await billingService.getByPatient(patientId);
            return NextResponse.json({ success: true, data: result });
        }

        return NextResponse.json({ success: false, error: 'Provide billingId, patientId, or summary=true' }, { status: 400 });
    } catch (error) {
        console.error('[API] Billing GET - Error:', error);
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}
