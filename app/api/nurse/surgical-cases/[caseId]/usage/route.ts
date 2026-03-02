/**
 * API Route: POST /api/nurse/surgical-cases/[caseId]/usage
 *
 * Record inventory usage for a surgical case.
 *
 * Security:
 * - Requires authentication
 * - Only NURSE, DOCTOR, or ADMIN can access
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { Role } from '@/domain/enums/Role';
import db from '@/lib/db';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError, ValidationError } from '@/application/errors';
import { parseUsageRequest } from '@/lib/parsers/inventoryBillingParsers';
import { getInventoryConsumptionBillingService } from '@/lib/factories/inventoryBillingFactory';
import { endpointTimer } from '@/lib/observability/endpointLogger';

// ─── POST ──────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    if (!authResult.success || !authResult.user) {
      return handleApiError(new ForbiddenError('Authentication required'));
    }

    const { role, userId } = authResult.user;
    const allowedRoles = [Role.NURSE, Role.DOCTOR, Role.ADMIN];
    if (!allowedRoles.includes(role as Role)) {
      return handleApiError(new ForbiddenError('Only nurses, doctors, and admins can record inventory usage'));
    }

    const { caseId } = await context.params;
    const timer = endpointTimer('POST /api/nurse/surgical-cases/[caseId]/usage');

    const body = await request.json();
    const validated = parseUsageRequest(body);

    // Enforce single item constraint at route level for better error messages
    if (validated.items.length !== 1) {
      return handleApiError(
        new ValidationError(
          'Batch usage not supported yet; submit items individually',
          [{ field: 'items', message: 'Must contain exactly one item' }]
        )
      );
    }

    const consumptionService = getInventoryConsumptionBillingService();
    const result = await consumptionService.applyUsageAndBilling({
      surgicalCaseId: caseId,
      externalRef: validated.externalRef,
      sourceFormKey: validated.sourceFormKey,
      items: validated.items,
      recordedBy: userId,
      usedBy: validated.usedBy || userId,
      usedAt: validated.usedAt ? new Date(validated.usedAt) : undefined,
    });

    // Emit audit event (non-blocking)
    const { getInventoryAuditService } = await import('@/lib/factories/inventoryAuditFactory');
    const auditService = getInventoryAuditService();
    if (result.isIdempotentReplay) {
      await auditService.emitInventoryUsageIdempotentReplay(
        result.usageRecord.id,
        userId,
        role as any,
        result.usageRecord.externalRef,
        { caseId, itemId: result.usageRecord.inventoryItemId }
      ).catch(() => {
        console.warn('[Audit] Failed to emit INVENTORY_USAGE_IDEMPOTENT_REPLAY event', { usageId: result.usageRecord.id });
      });
    } else {
      await auditService.emitInventoryUsageApplied(
        result.usageRecord.id,
        userId,
        role as any,
        result.usageRecord.externalRef,
        { caseId, itemId: result.usageRecord.inventoryItemId, quantity: result.usageRecord.quantityUsed }
      ).catch(() => {
        console.warn('[Audit] Failed to emit INVENTORY_USAGE_APPLIED event', { usageId: result.usageRecord.id });
      });

      // Emit bill line creation if billable
      if (result.billItem) {
        await auditService.emitBillLineCreatedFromUsage(
          result.billItem.id,
          result.usageRecord.id,
          userId,
          role as any,
          { totalCost: result.billItem.totalCost }
        ).catch(() => {
          console.warn('[Audit] Failed to emit BILL_LINE_CREATED_FROM_USAGE event', { billItemId: result.billItem!.id });
        });
      }
    }

    // Enrich response with item and service names
    const inventoryItem = await db.inventoryItem.findUnique({
      where: { id: result.usageRecord.inventoryItemId },
      select: { name: true, quantity_on_hand: true, reorder_point: true },
    });

    const serviceName = result.billItem
      ? await db.service.findUnique({
          where: { id: result.billItem.serviceId },
          select: { service_name: true },
        })
      : null;

    const stockWarnings: string[] = [];
    if (inventoryItem && inventoryItem.quantity_on_hand <= inventoryItem.reorder_point) {
      stockWarnings.push(
        `Low stock: ${inventoryItem.name} has ${inventoryItem.quantity_on_hand} units remaining (reorder point: ${inventoryItem.reorder_point})`
      );
    }

    const responseDto = {
      usageRecord: {
        ...result.usageRecord,
        itemName: inventoryItem?.name || 'Unknown',
      },
      billItem: result.billItem
        ? {
            ...result.billItem,
            serviceName: serviceName?.service_name || 'Unknown',
          }
        : null,
      payment: result.payment,
      metadata: {
        isIdempotentReplay: result.isIdempotentReplay,
        stockWarnings,
      },
    };

    timer.end({ caseId });
    return handleApiSuccess(responseDto);
  } catch (error) {
    console.error('[API] POST /api/nurse/surgical-cases/[caseId]/usage - Error:', error);
    return handleApiError(error);
  }
}
