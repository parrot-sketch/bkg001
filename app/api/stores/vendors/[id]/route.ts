/**
 * Vendor Detail Routes
 * 
 * GET /api/stores/vendors/[id] - Get vendor
 * PATCH /api/stores/vendors/[id] - Update vendor
 * DELETE /api/stores/vendors/[id] - Delete vendor
 */

import { NextRequest, NextResponse } from 'next/server';
import { JwtMiddleware } from '@/lib/auth/middleware';
import { handleApiError, handleApiSuccess } from '@/app/api/_utils/handleApiError';
import { ForbiddenError } from '@/application/errors';
import { authorizeInventoryOperation } from '@/lib/auth/inventoryAuthorization';
import { parseUpdateVendorRequest } from '@/lib/parsers/vendorParsers';
import { getVendorService } from '@/lib/factories/vendorFactory';
import { endpointTimer } from '@/lib/observability/endpointLogger';

const vendorService = getVendorService();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const timer = endpointTimer('GET /api/stores/vendors/[id]');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'VIEW_VENDORS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const { id } = await context.params;
    const vendor = await vendorService.getVendorById(id);

    timer.end({ userId: authzResult.user.userId, vendorId: id });
    return handleApiSuccess(vendor, 200);
  } catch (error) {
    const { id: vendorId } = await context.params;
    timer.end({ vendorId, error: error instanceof Error ? error.message : "Unknown error" });
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const timer = endpointTimer('PATCH /api/stores/vendors/[id]');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'UPDATE_VENDORS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const { id } = await context.params;
    const body = await request.json();
    const dto = parseUpdateVendorRequest(body);

    const vendor = await vendorService.updateVendor(id, dto);

    // Emit audit event (non-blocking)
    const { getInventoryAuditService } = await import('@/lib/factories/inventoryAuditFactory');
    const auditService = getInventoryAuditService();
    await auditService.emitVendorUpdated(
      id,
      authzResult.user.userId,
      authzResult.user.role as any,
      { vendorName: vendor.name, changes: dto }
    ).catch(() => {
      console.warn('[Audit] Failed to emit VENDOR_UPDATED event', { vendorId: id });
    });

    timer.end({ userId: authzResult.user.userId, vendorId: id });
    return handleApiSuccess(vendor, 200);
  } catch (error) {
    const { id: vendorId } = await context.params;
    timer.end({ vendorId, error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const timer = endpointTimer('DELETE /api/stores/vendors/[id]');
  try {
    const authResult = await JwtMiddleware.authenticate(request);
    const authzResult = authorizeInventoryOperation(authResult, 'DELETE_VENDORS');
    if (!authzResult.success || !authzResult.user) {
      return authzResult.error || handleApiError(new ForbiddenError('Unauthorized'));
    }

    const { id } = await context.params;
    
    // Get vendor info before deletion for audit
    const vendor = await vendorService.getVendorById(id);
    const vendorName = vendor.name;

    await vendorService.deleteVendor(id);

    // Emit audit event (non-blocking)
    const { getInventoryAuditService } = await import('@/lib/factories/inventoryAuditFactory');
    const auditService = getInventoryAuditService();
    await auditService.emitVendorDeleted(
      id,
      authzResult.user.userId,
      authzResult.user.role as any,
      { vendorName }
    ).catch(() => {
      console.warn('[Audit] Failed to emit VENDOR_DELETED event', { vendorId: id });
    });

    timer.end({ userId: authzResult.user.userId, vendorId: id });
    return handleApiSuccess({ message: 'Vendor deleted successfully' }, 200);
  } catch (error) {
    const { id: vendorId } = await context.params;
    timer.end({ vendorId, error: error instanceof Error ? error.message : 'Unknown error' });
    return handleApiError(error);
  }
}
