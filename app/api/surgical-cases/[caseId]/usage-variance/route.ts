/**
 * Usage Variance Endpoint
 * 
 * GET /api/surgical-cases/[caseId]/usage-variance
 * 
 * Returns planned items vs used items with variance analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError, NotFoundError } from '@/application/errors';
import { authorizeInventoryOperation } from '@/lib/auth/inventoryAuthorization';
import { endpointTimer } from '@/lib/observability/endpointLogger';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  const timer = endpointTimer('GET /api/surgical-cases/[caseId]/usage-variance');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'VIEW_PLANNED_ITEMS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const { caseId } = await context.params;

    // Get surgical case
    const surgicalCase = await db.surgicalCase.findUnique({
      where: { id: caseId },
      select: { id: true, case_plan: { select: { id: true } } },
    });

    if (!surgicalCase) {
      throw new NotFoundError(`Surgical case with ID ${caseId} not found`, 'SurgicalCase', caseId);
    }

    const casePlanId = surgicalCase.case_plan?.id;
    if (!casePlanId) {
      timer.end({ caseId, userId: authResult.user?.userId || 'unknown' });
      return handleApiSuccess(
        {
          plannedItems: [],
          usedItems: [],
          variance: [],
          plannedTotalCost: 0,
          actualBilledCost: 0,
          varianceTotal: 0,
        },
        200
      );
    }

    // Get planned items
    const plannedItems = await db.casePlanPlannedItem.findMany({
      where: { case_plan_id: casePlanId },
      include: {
        inventory_item: {
          select: {
            id: true,
            name: true,
            unit_of_measure: true,
            is_billable: true,
          },
        },
      },
    });

    // Get used items
    const usedItems = await db.inventoryUsage.findMany({
      where: { surgical_case_id: caseId },
      include: {
        inventory_item: {
          select: {
            id: true,
            name: true,
            unit_of_measure: true,
            is_billable: true,
          },
        },
      },
    });

    // Calculate variance
    const plannedMap = new Map(
      plannedItems
        .filter((p) => p.inventory_item_id !== null)
        .map((p) => [p.inventory_item_id!, { quantity: p.planned_quantity, unitPrice: p.planned_unit_price }])
    );

    const usedMap = new Map<number, { quantity: number; totalCost: number }>();
    for (const used of usedItems) {
      const existing = usedMap.get(used.inventory_item_id) || { quantity: 0, totalCost: 0 };
      usedMap.set(used.inventory_item_id, {
        quantity: existing.quantity + used.quantity_used,
        totalCost: existing.totalCost + used.total_cost,
      });
    }

    const variance: Array<{
      inventoryItemId: number;
      itemName: string;
      plannedQuantity: number;
      usedQuantity: number;
      quantityVariance: number;
      plannedCost: number;
      actualCost: number;
      costVariance: number;
      isBillable: boolean;
    }> = [];

    const allItemIds = new Set([...plannedMap.keys(), ...usedMap.keys()]);

    let plannedTotalCost = 0;
    let actualBilledCost = 0;

    for (const itemId of allItemIds) {
      const planned = plannedMap.get(itemId);
      const used = usedMap.get(itemId);

      const plannedQty = planned?.quantity || 0;
      const usedQty = used?.quantity || 0;
      const plannedCost = plannedQty * (planned?.unitPrice || 0);
      const actualCost = used?.totalCost || 0;

      plannedTotalCost += plannedCost;
      actualBilledCost += actualCost;

      const item = plannedItems.find((p) => p.inventory_item_id === itemId)?.inventory_item ||
        usedItems.find((u) => u.inventory_item_id === itemId)?.inventory_item;

      if (item) {
        variance.push({
          inventoryItemId: itemId,
          itemName: item.name,
          plannedQuantity: plannedQty,
          usedQuantity: usedQty,
          quantityVariance: usedQty - plannedQty,
          plannedCost,
          actualCost,
          costVariance: actualCost - plannedCost,
          isBillable: item.is_billable,
        });
      }
    }

    const responseData = {
      plannedItems: plannedItems.map((p) => ({
        id: p.id,
        inventoryItemId: p.inventory_item_id,
        itemName: p.inventory_item?.name || 'Unknown',
        plannedQuantity: p.planned_quantity,
        plannedUnitPrice: p.planned_unit_price,
        plannedTotalCost: p.planned_quantity * p.planned_unit_price,
        notes: p.notes,
      })),
      usedItems: usedItems.map((u) => ({
        id: u.id,
        inventoryItemId: u.inventory_item_id,
        itemName: u.inventory_item?.name || 'Unknown',
        quantityUsed: u.quantity_used,
        unitCostAtTime: u.unit_cost_at_time,
        totalCost: u.total_cost,
        usedAt: u.used_at,
        sourceFormKey: u.source_form_key,
      })),
      variance,
      plannedTotalCost,
      actualBilledCost,
      varianceTotal: actualBilledCost - plannedTotalCost,
    };

    timer.end({ caseId, userId: authResult.user?.userId || 'unknown' });
    return handleApiSuccess(responseData, 200);
  } catch (error) {
    const { caseId: caseIdParam } = await context.params;
    timer.end({ caseId: caseIdParam, error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
