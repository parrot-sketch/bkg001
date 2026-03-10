import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';

export async function GET(req: NextRequest) {
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

        const { searchParams } = new URL(req.url);
        const caseId = searchParams.get('caseId');

        if (!caseId) {
            return NextResponse.json({ success: false, error: 'caseId is required' }, { status: 400 });
        }

        // 2. Fetch case and planned materials
        const surgicalCase = await db.surgicalCase.findUnique({
            where: { id: caseId },
            include: {
                case_plan: {
                    include: {
                        planned_items: {
                            include: { inventory_item: true }
                        }
                    }
                }
            }
        });

        if (!surgicalCase) {
            return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });
        }

        // 3. Fetch previously consumed items to subtract from required
        const existingUsage = await db.inventoryUsage.findMany({
            where: { surgical_case_id: caseId },
            include: { inventory_item: true }
        });

        const usageMap = new Map<number, number>();
        existingUsage.forEach(usage => {
            const current = usageMap.get(usage.inventory_item_id) || 0;
            usageMap.set(usage.inventory_item_id, current + usage.quantity_used);
        });

        // 4. Map planned items from CasePlan
        let picklistItems: any[] = [];
        
        if (surgicalCase.case_plan?.planned_items) {
            picklistItems = surgicalCase.case_plan.planned_items
                .filter(pi => pi.inventory_item_id !== null)
                .map(pi => {
                    const item = pi.inventory_item!;
                    const consumed = usageMap.get(item.id) || 0;
                    const required = pi.planned_quantity;
                    
                    return {
                        id: pi.id.toString(),
                        inventoryItemId: item.id,
                        name: item.name,
                        isImplant: item.is_implant,
                        requiredQty: required,
                        consumedQty: consumed,
                        status: consumed >= required ? 'FULFILLED' : (consumed > 0 ? 'PARTIAL' : 'PENDING'),
                        unitOfMeasure: item.unit_of_measure,
                    }
                });
        }

        // If no planned items found, fall back to some mock data for demo purposes if needed,
        // but ideally in a real app we just return empty list.
        // For now, if empty, we return empty list.

        return NextResponse.json({ success: true, data: picklistItems }, { status: 200 });

    } catch (error: any) {
        console.error('Fetch Picklist Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch picklist data' },
            { status: 500 }
        );
    }
}
