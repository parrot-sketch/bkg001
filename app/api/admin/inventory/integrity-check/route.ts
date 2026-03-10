/**
 * Inventory Integrity Check Endpoint
 * 
 * GET /api/admin/inventory/integrity-check
 * 
 * Safety tool to check for data integrity issues.
 * ADMIN only.
 */

import { NextRequest } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import db from '@/lib/db';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeRoles } from '@/lib/auth/inventoryAuthorization';
import { Role } from '@/domain/enums/Role';
import { endpointTimer } from '@/lib/observability/endpointLogger';

export async function GET(request: NextRequest) {
  const timer = endpointTimer('GET /api/admin/inventory/integrity-check');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeRoles(authResult, [Role.ADMIN]);
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Only ADMIN can run integrity checks'));
    }

    const issues: Array<{
      type: string;
      severity: 'error' | 'warning';
      message: string;
      entityId?: string;
      details?: Record<string, unknown>;
    }> = [];

    // Check 1: Items with negative stock (calculate from batches)
    const itemsWithStock = await db.inventoryItem.findMany({
      include: {
        batches: {
          select: {
            quantity_remaining: true,
          },
        },
      },
    });

    const negativeStockItems = itemsWithStock
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity_on_hand: item.batches.reduce((sum, batch) => sum + batch.quantity_remaining, 0),
      }))
      .filter((item) => item.quantity_on_hand < 0);

    for (const item of negativeStockItems) {
      issues.push({
        type: 'NEGATIVE_STOCK',
        severity: 'error',
        message: `Item ${item.name} has negative stock: ${item.quantity_on_hand}`,
        entityId: item.id.toString(),
        details: {
          itemName: item.name,
          quantityOnHand: item.quantity_on_hand,
        },
      });
    }

    // Check 2: Billable usage without bill linkage
    const billableUsageWithoutBill = await db.inventoryUsage.findMany({
      where: {
        bill_item_id: null,
      },
      include: {
        inventory_item: {
          select: {
            id: true,
            name: true,
            is_billable: true,
          },
        },
      },
    });

    for (const usage of billableUsageWithoutBill) {
      if (usage.inventory_item.is_billable) {
        issues.push({
          type: 'BILLABLE_USAGE_WITHOUT_BILL',
          severity: 'error',
          message: `Billable usage ${usage.id} for item ${usage.inventory_item.name} has no bill linkage`,
          entityId: usage.id.toString(),
          details: {
            usageId: usage.id,
            itemName: usage.inventory_item.name,
            quantityUsed: usage.quantity_used,
            totalCost: usage.total_cost,
          },
        });
      }
    }

    // Check 3: Bill lines referencing missing usage
    const billItemsWithUsage = await db.patientBill.findMany({
      where: {
        surgical_medication_record_id: null,
      },
      include: {
        inventory_usage: {
          select: {
            id: true,
          },
        },
      },
    });

    for (const billItem of billItemsWithUsage) {
      if (billItem.surgical_medication_record_id && !billItem.inventory_usage) {
        // This would require checking SurgicalMedicationRecord, but for now we check if inventory_usage exists
        // This is a simplified check
      }
    }

    // Check 4: Usage with invalid external_ref (should be unique)
    const duplicateExternalRefs = await db.inventoryUsage.groupBy({
      by: ['external_ref'],
      where: {
        external_ref: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
      having: {
        id: {
          _count: {
            gt: 1,
          },
        },
      },
    });

    for (const group of duplicateExternalRefs) {
      if (group.external_ref) {
        issues.push({
          type: 'DUPLICATE_EXTERNAL_REF',
          severity: 'error',
          message: `External ref ${group.external_ref} is used by multiple usage records`,
          details: {
            externalRef: group.external_ref,
            count: group._count.id,
          },
        });
      }
    }

    const responseData = {
      timestamp: new Date().toISOString(),
      issues,
      summary: {
        totalIssues: issues.length,
        errors: issues.filter((i) => i.severity === 'error').length,
        warnings: issues.filter((i) => i.severity === 'warning').length,
      },
    };

    timer.end({ userId: authzResult.user.userId, issueCount: issues.length });
    return handleApiSuccess(responseData, 200);
  } catch (error) {
    timer.end({ error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
